"""
Tax Analysis API — 1040 ingestion and tax profile retrieval (IMM-02).

Endpoints:
  POST /api/v1/tax/ingest
  GET  /api/v1/tax/status/{job_id}
  GET  /api/v1/tax/profile/{client_id}
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session

logger = logging.getLogger(__name__)

_security = HTTPBearer(auto_error=False)


def _parse_uuid(value: str, field_name: str = "client_id") -> UUID:
    """Validate and parse a UUID string, returning 422 on bad input."""
    try:
        return UUID(str(value))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name} format: '{value}'. Must be a valid UUID.",
        )


async def _get_tax_caller(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Authenticate via RIA JWT or portal JWT. Returns caller info dict."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    # Try RIA auth first
    try:
        from backend.api.auth import verify_token, get_users_db
        payload = verify_token(credentials)
        email = payload.get("sub")
        users_db = get_users_db()
        if email and email in users_db:
            user = users_db[email].copy()
            user.pop("password_hash", None)
            return {"type": "ria", "user": user}
    except Exception:
        pass

    # Fall back to portal auth
    try:
        from backend.services.portal_auth_service import PortalAuthService
        portal_payload = PortalAuthService.verify_portal_token(token)
        if portal_payload and portal_payload.get("client_id"):
            return {
                "type": "portal",
                "client_id": str(portal_payload["client_id"]),
                "sub": portal_payload.get("sub"),
            }
    except Exception:
        pass

    raise HTTPException(status_code=401, detail="Invalid or expired token")

router = APIRouter(
    prefix="/api/v1/tax",
    tags=["Tax Analysis"],
)


class IngestJobResponse(BaseModel):
    job_id: str
    status: str


class IngestStatusResponse(BaseModel):
    job_id: str
    status: str
    confidence: Optional[float] = None
    error: Optional[str] = None


class TaxProfileResponse(BaseModel):
    client_id: str
    tax_year: int
    filing_status: Optional[str] = None
    agi: Optional[float] = None
    taxable_income: Optional[float] = None
    effective_rate: Optional[float] = None
    marginal_rate: Optional[float] = None
    capital_gains: Optional[dict] = None
    confidence: Optional[float] = None
    tax_aversion_score: Optional[float] = None
    tlh_opportunity_score: Optional[float] = None


@router.post("/ingest", response_model=IngestJobResponse)
async def ingest_1040(
    file: UploadFile = File(...),
    client_id: str = Form(...),
    db: AsyncSession = Depends(get_db_session),
    caller: dict = Depends(_get_tax_caller),
):
    """Upload a 1040 PDF for AI-powered tax data extraction."""
    if caller["type"] == "portal":
        resolved_client_id = _parse_uuid(caller["client_id"])
    else:
        resolved_client_id = _parse_uuid(client_id)

    try:
        from backend.services.tax.document_ingestor import ingest_tax_document
        file_bytes = await file.read()
        job_id = await ingest_tax_document(file_bytes, resolved_client_id, db)
        return IngestJobResponse(job_id=job_id, status="processing")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Tax ingest failed: %s", e)
        raise HTTPException(status_code=500, detail="Tax document processing failed")


@router.get("/status/{job_id}", response_model=IngestStatusResponse)
async def get_ingest_status(job_id: str):
    """Poll for tax document processing status."""
    try:
        from backend.services.redis_client import get_redis
        import json
        redis = await get_redis()
        if redis:
            data = await redis.get(f"tax_job:{job_id}")
            if data:
                parsed = json.loads(data)
                return IngestStatusResponse(**parsed)
        return IngestStatusResponse(job_id=job_id, status="unknown")
    except Exception:
        return IngestStatusResponse(job_id=job_id, status="unknown")


@router.get("/profile/{client_id}", response_model=TaxProfileResponse)
async def get_tax_profile(
    client_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    caller: dict = Depends(_get_tax_caller),
):
    """Get the latest tax profile for a client."""
    if caller["type"] == "portal":
        portal_cid = _parse_uuid(caller["client_id"])
        if portal_cid != client_id:
            raise HTTPException(status_code=403, detail="Cannot access another client's tax profile")
    try:
        from backend.models.tax_profile import TaxProfile
        from backend.models.bim_score import BIMScore
        result = await db.execute(
            select(TaxProfile)
            .where(TaxProfile.client_id == client_id)
            .order_by(TaxProfile.tax_year.desc())
            .limit(1)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=404, detail="Tax profile not found")

        tax_aversion = None
        tlh_opp = None
        scores_result = await db.execute(
            select(BIMScore).where(
                BIMScore.client_id == client_id,
                BIMScore.score_type.in_(["tax_aversion", "tlh_opportunity"]),
            )
        )
        for score in scores_result.scalars():
            if score.score_type == "tax_aversion":
                tax_aversion = float(score.score)
            elif score.score_type == "tlh_opportunity":
                tlh_opp = float(score.score)

        return TaxProfileResponse(
            client_id=str(client_id),
            tax_year=profile.tax_year,
            filing_status=profile.filing_status,
            agi=float(profile.agi) if profile.agi else None,
            taxable_income=float(profile.taxable_income) if profile.taxable_income else None,
            effective_rate=float(profile.effective_rate) if profile.effective_rate else None,
            marginal_rate=float(profile.marginal_rate) if profile.marginal_rate else None,
            capital_gains=profile.capital_gains,
            confidence=float(profile.confidence) if profile.confidence else None,
            tax_aversion_score=tax_aversion,
            tlh_opportunity_score=tlh_opp,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Tax profile query failed: %s", e)
        raise HTTPException(status_code=404, detail="Tax profile not found")
