"""
Compliance Exceptions API — Series 65 rule exceptions (IMM-03).

Endpoints:
  GET   /api/v1/compliance/exceptions
  PATCH /api/v1/compliance/exceptions/{exception_id}/resolve
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/compliance",
    tags=["Compliance Exceptions"],
)


class ExceptionResponse(BaseModel):
    id: str
    rule_code: str
    category: str
    severity: str
    message: str
    client_name: Optional[str] = None
    triggered_at: str
    resolved: bool
    resolved_at: Optional[str] = None
    resolution_note: Optional[str] = None


class ResolveExceptionRequest(BaseModel):
    note: str


@router.get("/exceptions", response_model=list[ExceptionResponse])
async def get_compliance_exceptions(
    resolved: bool = False,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get compliance exceptions filtered by resolution status."""
    try:
        from backend.models.compliance_rules import ComplianceException, ComplianceRuleConfig
        query = (
            select(ComplianceException, ComplianceRuleConfig)
            .join(ComplianceRuleConfig, ComplianceException.rule_id == ComplianceRuleConfig.id)
            .where(ComplianceException.resolved == resolved)
            .order_by(ComplianceException.triggered_at.desc())
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            ExceptionResponse(
                id=str(exc.id),
                rule_code=rule.rule_code,
                category=rule.category,
                severity=exc.severity,
                message=str(exc.context.get("message", "")) if exc.context else "",
                client_name=str(exc.context.get("client_name", "")) if exc.context else None,
                triggered_at=exc.triggered_at.isoformat() if exc.triggered_at else "",
                resolved=exc.resolved,
                resolved_at=exc.resolved_at.isoformat() if exc.resolved_at else None,
                resolution_note=exc.resolution_note,
            )
            for exc, rule in rows
        ]
    except Exception as e:
        logger.warning("Compliance exceptions query failed: %s", e)
        return []


@router.patch("/exceptions/{exception_id}/resolve")
async def resolve_exception(
    exception_id: UUID,
    body: ResolveExceptionRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Resolve a compliance exception with a required note."""
    try:
        from backend.models.compliance_rules import ComplianceException, ComplianceAuditLog
        result = await db.execute(
            select(ComplianceException).where(ComplianceException.id == exception_id)
        )
        exc = result.scalar_one_or_none()
        if not exc:
            raise HTTPException(status_code=404, detail="Exception not found")

        exc.resolved = True
        exc.resolved_at = datetime.now(timezone.utc)
        exc.resolved_by = UUID(current_user["id"])
        exc.resolution_note = body.note

        audit = ComplianceAuditLog(
            advisor_id=UUID(current_user["id"]),
            action="RESOLVE_EXCEPTION",
            entity_type="compliance_exception",
            entity_id=str(exception_id),
            metadata_json={"note": body.note},
        )
        db.add(audit)
        await db.commit()
        return {"id": str(exception_id), "resolved": True, "resolved_at": exc.resolved_at.isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Exception resolve failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to resolve exception")
