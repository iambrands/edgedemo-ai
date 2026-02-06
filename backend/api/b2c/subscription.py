"""B2C subscription management endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.services.stripe_service import StripeService
from backend.services.usage_tracker import UsageTracker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/subscription", tags=["b2c-subscription"])


@router.get("")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription status and usage."""
    svc = StripeService(db)
    status = await svc.get_subscription_status(current_user)

    tracker = UsageTracker(db)
    status["usage"] = {
        "ai_chat_messages_used": await tracker.get_monthly_count(
            current_user.id, "ai_chat_messages"
        ),
        "statement_uploads_used": await tracker.get_monthly_count(
            current_user.id, "statement_upload"
        ),
    }
    return status


class UpgradeRequest(BaseModel):
    tier: str


@router.post("/upgrade")
async def create_checkout(
    req: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe checkout session for upgrade."""
    tier = req.tier
    if tier not in ("starter", "pro", "premium"):
        raise HTTPException(status_code=400, detail="Invalid tier")

    try:
        svc = StripeService(db)
        return await svc.create_checkout_session(current_user, tier)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/cancel")
async def cancel_subscription(
    immediate: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel subscription. Default: at end of billing period."""
    try:
        svc = StripeService(db)
        return await svc.cancel_subscription(current_user, at_period_end=not immediate)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Stripe webhook handler. Verified by signature."""
    payload = await request.body()
    sig = request.headers.get("Stripe-Signature")

    if not sig:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature")

    try:
        svc = StripeService(db)
        return await svc.handle_webhook(payload, sig)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
