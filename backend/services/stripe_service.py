"""
Stripe subscription management for B2C tiers.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.settings import settings
from backend.models.user import User

logger = logging.getLogger(__name__)

try:
    import stripe as _stripe

    stripe = _stripe
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
except ImportError:
    stripe = None  # type: ignore


PRICE_TO_TIER = {
    settings.STRIPE_PRICE_STARTER: "starter",
    settings.STRIPE_PRICE_PRO: "pro",
    settings.STRIPE_PRICE_PREMIUM: "premium",
}
TIER_TO_PRICE = {v: k for k, v in PRICE_TO_TIER.items() if k}


class StripeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_checkout_session(self, user: User, tier: str) -> dict:
        """Create Stripe Checkout session for subscription."""
        if not stripe or not settings.STRIPE_SECRET_KEY:
            raise ValueError("Stripe not configured")

        price_id = TIER_TO_PRICE.get(tier)
        if not price_id:
            raise ValueError(f"Invalid tier: {tier}")

        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"user_id": str(user.id)},
            )
            user.stripe_customer_id = customer.id
            await self.db.flush()

        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.DOMAIN}/dashboard?subscription=success",
            cancel_url=f"{settings.DOMAIN}/pricing?subscription=canceled",
            allow_promotion_codes=True,
            metadata={"user_id": str(user.id), "tier": tier},
            subscription_data={
                "metadata": {"user_id": str(user.id), "tier": tier},
                "trial_period_days": 14,
            },
        )

        logger.info("Checkout session created for user %s tier=%s", user.id, tier)
        return {"checkout_url": session.url, "session_id": session.id}

    async def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Process Stripe webhook events."""
        if not stripe or not settings.STRIPE_WEBHOOK_SECRET:
            raise ValueError("Stripe webhook not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            logger.error("Webhook verification failed: %s", e)
            raise ValueError("Invalid webhook signature") from e

        event_type = event["type"]
        data = event["data"]["object"]

        logger.info("Stripe webhook: %s", event_type)

        if event_type == "checkout.session.completed":
            await self._handle_checkout_completed(data)
        elif event_type == "customer.subscription.updated":
            await self._handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            await self._handle_subscription_canceled(data)

        return {"status": "processed", "event_type": event_type}

    async def _handle_checkout_completed(self, session: dict) -> None:
        user_id = session.get("metadata", {}).get("user_id")
        tier = session.get("metadata", {}).get("tier")
        if not user_id or not tier:
            return
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return
        user.subscription_tier = tier
        user.subscription_active = True
        user.stripe_customer_id = session.get("customer")
        await self.db.flush()
        logger.info("Subscription activated: user=%s tier=%s", user_id, tier)

    async def _handle_subscription_updated(self, subscription: dict) -> None:
        user_id = subscription.get("metadata", {}).get("user_id")
        if not user_id:
            return
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return
        items = subscription.get("items", {}).get("data", [])
        if items:
            price_id = items[0].get("price", {}).get("id")
            new_tier = PRICE_TO_TIER.get(price_id, user.subscription_tier)
            user.subscription_tier = new_tier
        user.subscription_active = subscription.get("status") == "active"
        await self.db.flush()

    async def _handle_subscription_canceled(self, subscription: dict) -> None:
        user_id = subscription.get("metadata", {}).get("user_id")
        if not user_id:
            return
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return
        user.subscription_tier = "free"
        user.subscription_active = False
        await self.db.flush()
        logger.info("Subscription canceled: user=%s", user_id)

    async def get_subscription_status(self, user: User) -> dict:
        """Get current subscription details."""
        if not user.stripe_customer_id:
            return {"tier": "free", "active": False, "trial_end": None, "cancel_at_period_end": False}

        if not stripe:
            return {"tier": user.subscription_tier or "free", "active": user.subscription_active}

        try:
            subs = stripe.Subscription.list(
                customer=user.stripe_customer_id, status="all", limit=1
            )
        except Exception as e:
            logger.warning("Stripe subscription list failed: %s", e)
            return {"tier": user.subscription_tier or "free", "active": user.subscription_active}

        if not subs.data:
            return {"tier": "free", "active": False}

        sub = subs.data[0]
        return {
            "tier": user.subscription_tier,
            "active": sub.status == "active",
            "status": sub.status,
            "trial_end": sub.trial_end,
            "current_period_end": sub.current_period_end,
            "cancel_at_period_end": sub.cancel_at_period_end,
        }

    async def cancel_subscription(self, user: User, at_period_end: bool = True) -> dict:
        """Cancel subscription."""
        if not stripe or not user.stripe_customer_id:
            raise ValueError("No active subscription")

        subs = stripe.Subscription.list(customer=user.stripe_customer_id, status="active", limit=1)
        if not subs.data:
            raise ValueError("No active subscription found")

        sub = subs.data[0]
        if at_period_end:
            updated = stripe.Subscription.modify(sub.id, cancel_at_period_end=True)
        else:
            updated = stripe.Subscription.cancel(sub.id)
            user.subscription_tier = "free"
            user.subscription_active = False
            await self.db.flush()

        return {
            "status": updated.status,
            "cancel_at_period_end": updated.cancel_at_period_end,
            "current_period_end": updated.current_period_end,
        }
