"""Compliance audit trail and report endpoints."""

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import ComplianceLog, get_session_factory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])


from backend.api.dependencies import get_db


@router.get("/audit-trail")
async def get_audit_trail(
    client_id: str | None = Query(None),
    limit: int = Query(100, le=500),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Query compliance audit logs."""
    q = select(ComplianceLog).order_by(ComplianceLog.timestamp.desc()).limit(limit)
    if client_id:
        q = q.where(ComplianceLog.client_id == client_id)
    result = await session.execute(q)
    rows = result.scalars().all()
    return {
        "entries": [
            {
                "id": str(r.id),
                "rule_checked": r.rule_checked,
                "result": r.result,
                "severity": r.severity,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in rows
        ],
        "count": len(rows),
    }


@router.get("/report/{client_id}")
async def get_compliance_report(
    client_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Generate compliance report for client. Mock summary for now."""
    return {
        "client_id": client_id,
        "report_type": "compliance_summary",
        "message": "Use audit-trail for detailed logs.",
    }
