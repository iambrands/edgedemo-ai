"""B2C advisor connection request endpoints."""

import logging
from typing import Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.models.advisor_connection import AdvisorConnectionRequest
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/advisor", tags=["b2c-advisor"])

_VALID_ASSET_RANGES = {
    "under_50k", "50k_250k", "250k_500k", "500k_1m", "1m_5m", "over_5m",
}
_VALID_GOALS = {
    "retirement", "wealth_building", "college_savings",
    "estate_planning", "tax_optimization", "other",
}
_VALID_MEETING_FORMATS = {"virtual", "in_person", "no_preference"}


class AdvisorConnectRequest(BaseModel):
    investable_assets_range: Optional[str] = None
    primary_goal: Optional[str] = None
    preferred_meeting_format: Optional[str] = None
    notes: Optional[str] = None


class AdvisorConnectResponse(BaseModel):
    request_id: str
    status: Literal["pending"]
    message: str


class AdvisorConnectionStatus(BaseModel):
    status: str
    request_id: Optional[str]
    matched_advisor_id: Optional[str]
    matched_at: Optional[str]


@router.post("/connect", response_model=AdvisorConnectResponse)
async def request_advisor_connection(
    req: AdvisorConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a request to be matched with an advisor."""
    # Only B2C users can request advisor connections
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    # Validate enum fields
    if req.investable_assets_range and req.investable_assets_range not in _VALID_ASSET_RANGES:
        raise HTTPException(status_code=422, detail="Invalid investable_assets_range value")
    if req.primary_goal and req.primary_goal not in _VALID_GOALS:
        raise HTTPException(status_code=422, detail="Invalid primary_goal value")
    if req.preferred_meeting_format and req.preferred_meeting_format not in _VALID_MEETING_FORMATS:
        raise HTTPException(status_code=422, detail="Invalid preferred_meeting_format value")

    # Check for an existing pending or matched request — don't create duplicates
    existing = await db.execute(
        select(AdvisorConnectionRequest).where(
            AdvisorConnectionRequest.user_id == current_user.id,
            AdvisorConnectionRequest.status.in_(["pending", "matched"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="You already have an active advisor connection request",
        )

    connection = AdvisorConnectionRequest(
        id=uuid4(),
        user_id=current_user.id,
        household_id=current_user.household_id,
        investable_assets_range=req.investable_assets_range,
        primary_goal=req.primary_goal,
        preferred_meeting_format=req.preferred_meeting_format,
        notes=req.notes[:1000] if req.notes else None,
        status="pending",
    )
    db.add(connection)
    await db.flush()

    logger.info("Advisor connection request created: %s for user %s", connection.id, current_user.id)

    return AdvisorConnectResponse(
        request_id=str(connection.id),
        status="pending",
        message="Your request has been received. An advisor will reach out within 1-2 business days.",
    )


@router.get("/connect/status", response_model=AdvisorConnectionStatus)
async def get_advisor_connection_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current advisor connection request status for this user."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    result = await db.execute(
        select(AdvisorConnectionRequest)
        .where(AdvisorConnectionRequest.user_id == current_user.id)
        .order_by(AdvisorConnectionRequest.created_at.desc())
        .limit(1)
    )
    connection = result.scalar_one_or_none()

    if not connection:
        return AdvisorConnectionStatus(
            status="none",
            request_id=None,
            matched_advisor_id=None,
            matched_at=None,
        )

    return AdvisorConnectionStatus(
        status=connection.status,
        request_id=str(connection.id),
        matched_advisor_id=str(connection.matched_advisor_id) if connection.matched_advisor_id else None,
        matched_at=connection.matched_at.isoformat() if connection.matched_at else None,
    )


@router.delete("/connect", status_code=204)
async def cancel_advisor_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending advisor connection request."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    result = await db.execute(
        select(AdvisorConnectionRequest).where(
            AdvisorConnectionRequest.user_id == current_user.id,
            AdvisorConnectionRequest.status == "pending",
        )
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="No pending connection request found")

    from datetime import datetime, timezone
    connection.status = "cancelled"
    connection.cancelled_at = datetime.now(timezone.utc)
    await db.flush()
