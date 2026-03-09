"""
AI Recommendations API — actionable IIM output (IMM-06).

Endpoints:
  GET  /api/v1/clients/{client_id}/recommendations
  POST /api/v1/recommendations/{rec_id}/submit-order
  POST /api/v1/recommendations/{rec_id}/snooze
  POST /api/v1/recommendations/{rec_id}/dismiss
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1",
    tags=["Recommendations"],
)


class TaxImpactResponse(BaseModel):
    estimated_gain_loss: float
    tax_consequence: str
    estimated_tax_dollars: float


class OrderPreviewResponse(BaseModel):
    symbol: str
    side: str
    quantity: int
    type: str = "market"
    duration: str = "day"


class RecommendationResponse(BaseModel):
    rec_id: str
    advisor_id: str
    client_id: str
    rec_type: str
    symbol: str
    quantity: float
    target_weight: float
    rationale: str
    confidence: float
    tax_impact: TaxImpactResponse
    compliance_status: str
    compliance_flags: list[str]
    expires_at: str
    order_preview: dict


class OrderSubmitRequest(BaseModel):
    quantity: Optional[int] = None
    order_type: str = "market"


class DismissRequest(BaseModel):
    reason: str


async def _log_rec_audit(
    db: AsyncSession,
    advisor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: dict | None = None,
) -> None:
    """Write a single entry to compliance_audit_log. Never raises."""
    try:
        from backend.models.compliance_rules import ComplianceAuditLog
        entry = ComplianceAuditLog(
            advisor_id=UUID(advisor_id),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata or {},
        )
        db.add(entry)
        await db.flush()
    except Exception as e:
        logger.error("Audit log write failed [%s]: %s", action, e)


@router.get("/clients/{client_id}/recommendations", response_model=list[RecommendationResponse])
async def get_recommendations(
    client_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get actionable recommendations for a client from the IIM pipeline."""
    try:
        from backend.services.iim.recommendation import get_client_recommendations
        recs = await get_client_recommendations(client_id, UUID(current_user["id"]), db)
        return recs
    except Exception as e:
        logger.warning("Recommendations query failed, returning empty: %s", e)
        return []


@router.post("/recommendations/{rec_id}/submit-order")
async def submit_order(
    rec_id: str,
    body: OrderSubmitRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Submit a recommendation as a Tradier order."""
    try:
        from backend.services.iim.order_builder import submit_tradier_order
        result = await submit_tradier_order(rec_id, body.quantity, body.order_type, db)
        await _log_rec_audit(
            db, current_user["id"], "ORDER_SUBMITTED",
            "recommendation", rec_id, {"result": result},
        )
        return result
    except Exception as e:
        logger.error("Order submission failed: %s", e)
        raise HTTPException(status_code=500, detail="Order submission failed")


@router.post("/recommendations/{rec_id}/snooze")
async def snooze_recommendation(
    rec_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Snooze a recommendation for 24 hours."""
    await _log_rec_audit(
        db, current_user["id"], "RECOMMENDATION_SNOOZED",
        "recommendation", rec_id,
    )
    logger.info("Recommendation %s snoozed by %s", rec_id, current_user["id"])
    return {"rec_id": rec_id, "snoozed": True, "new_expires_at": datetime.now(timezone.utc).isoformat()}


@router.post("/recommendations/{rec_id}/dismiss")
async def dismiss_recommendation(
    rec_id: str,
    body: DismissRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Dismiss a recommendation with a required reason."""
    await _log_rec_audit(
        db, current_user["id"], "RECOMMENDATION_DISMISSED",
        "recommendation", rec_id, {"reason": body.reason},
    )
    logger.info("Recommendation %s dismissed: %s", rec_id, body.reason)
    return {"rec_id": rec_id, "dismissed": True, "reason": body.reason}
