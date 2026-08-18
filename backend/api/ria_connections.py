"""RIA advisor endpoints for managing B2C connection requests."""

import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.api.dependencies import get_db
from backend.models.advisor_connection import AdvisorConnectionRequest
from backend.models.advisor import Advisor
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ria/connections", tags=["ria-connections"])


class ConnectionRequestOut(BaseModel):
    id: str
    user_id: str
    user_email: Optional[str] = None
    investable_assets_range: Optional[str] = None
    primary_goal: Optional[str] = None
    preferred_meeting_format: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: Optional[str] = None


class ActionBody(BaseModel):
    decline_reason: Optional[str] = None


class ConnectionActionOut(BaseModel):
    id: str
    status: str
    message: str


@router.get("", response_model=List[ConnectionRequestOut])
async def list_connection_requests(
    status: Optional[str] = None,
    current_ria: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List B2C advisor connection requests. Defaults to pending."""
    filter_status = status or "pending"
    stmt = (
        select(AdvisorConnectionRequest)
        .where(AdvisorConnectionRequest.status == filter_status)
        .order_by(AdvisorConnectionRequest.created_at.asc())
    )
    result = await db.execute(stmt)
    requests = result.scalars().all()

    out: List[ConnectionRequestOut] = []
    for req in requests:
        user_email: Optional[str] = None
        try:
            user_result = await db.execute(
                select(User).where(User.id == req.user_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                user_email = user.email
        except Exception:
            pass
        out.append(
            ConnectionRequestOut(
                id=str(req.id),
                user_id=str(req.user_id),
                user_email=user_email,
                investable_assets_range=req.investable_assets_range,
                primary_goal=req.primary_goal,
                preferred_meeting_format=req.preferred_meeting_format,
                notes=req.notes,
                status=req.status,
                created_at=req.created_at.isoformat() if req.created_at else None,
            )
        )
    return out


@router.post("/{request_id}/accept", response_model=ConnectionActionOut)
async def accept_connection_request(
    request_id: UUID,
    current_ria: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a pending B2C connection request."""
    result = await db.execute(
        select(AdvisorConnectionRequest).where(AdvisorConnectionRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Connection request not found")
    if req.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Request is already {req.status} and cannot be accepted",
        )

    advisor_id: Optional[UUID] = None
    ria_email = current_ria.get("email", "")
    try:
        advisor_result = await db.execute(
            select(Advisor).where(Advisor.email == ria_email)
        )
        advisor = advisor_result.scalar_one_or_none()
        if advisor:
            advisor_id = advisor.id
    except Exception:
        pass

    now = datetime.now(timezone.utc)
    req.status = "matched"
    req.matched_at = now
    req.accepted_at = now
    if advisor_id:
        req.matched_advisor_id = advisor_id

    logger.info(
        "Connection request %s accepted by advisor %s", request_id, ria_email
    )
    return ConnectionActionOut(
        id=str(req.id),
        status="matched",
        message="Request accepted. The client will be notified.",
    )


@router.post("/{request_id}/decline", response_model=ConnectionActionOut)
async def decline_connection_request(
    request_id: UUID,
    body: ActionBody = ActionBody(),
    current_ria: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Decline a pending B2C connection request."""
    result = await db.execute(
        select(AdvisorConnectionRequest).where(AdvisorConnectionRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Connection request not found")
    if req.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Request is already {req.status} and cannot be declined",
        )

    now = datetime.now(timezone.utc)
    req.status = "declined"
    req.declined_at = now
    req.decline_reason = (body.decline_reason or "")[:255] or None

    logger.info(
        "Connection request %s declined by advisor %s", request_id, current_ria.get("email", "")
    )
    return ConnectionActionOut(
        id=str(req.id),
        status="declined",
        message="Request declined.",
    )
