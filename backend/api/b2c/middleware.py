"""
Middleware decorators for B2C feature gating and rate limiting.
"""

import logging
from typing import Callable

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, get_current_user
from backend.models.user import User
from backend.services.entitlements import TIER_FEATURES, EntitlementService
from backend.services.usage_tracker import UsageTracker

logger = logging.getLogger(__name__)


def require_feature(feature_name: str) -> Callable:
    """FastAPI dependency that checks feature entitlement."""

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        svc = EntitlementService()
        if not svc.check_feature(current_user, feature_name):
            upgrade = svc.get_upgrade_prompt(
                feature_name, current_user.subscription_tier or "free"
            )
            required = upgrade["required_tier"] if upgrade else "starter"
            msg = upgrade["message"] if upgrade else f"Upgrade to access {feature_name}"
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "feature_gated",
                    "feature": feature_name,
                    "required_tier": required,
                    "message": msg,
                    "upgrade_url": f"/api/v1/b2c/subscription/upgrade?tier={required}",
                },
            )
        return current_user

    return _check


def require_usage_quota(feature_name: str) -> Callable:
    """FastAPI dependency that checks monthly usage limits."""

    async def _check(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        tracker = UsageTracker(db)
        limit_key = f"{feature_name}_per_month"
        current_count = await tracker.get_monthly_count(current_user.id, feature_name)

        svc = EntitlementService()
        if not svc.check_usage_limit(current_user, limit_key, current_count):
            tier = current_user.subscription_tier or "free"
            limit = TIER_FEATURES.get(tier, {}).get(limit_key, 0)
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "usage_limit_reached",
                    "feature": feature_name,
                    "used": current_count,
                    "limit": limit,
                    "resets": "1st of next month",
                    "upgrade_url": "/api/v1/b2c/subscription/upgrade",
                },
            )
        return current_user

    return _check
