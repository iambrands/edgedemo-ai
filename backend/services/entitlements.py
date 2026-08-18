"""
Feature entitlement service. Controls what each subscription tier can access.
Limits and flags sourced from tier_catalog.py (single source of truth).
"""

import logging
from typing import TYPE_CHECKING, Optional

from backend.services.tier_catalog import B2C_TIERS

if TYPE_CHECKING:
    from backend.models.user import User

logger = logging.getLogger(__name__)

TIER_FEATURES = B2C_TIERS


class EntitlementService:
    """Feature gating and usage limits per subscription tier."""

    def check_feature(self, user: Optional["User"], feature: str) -> bool:
        tier = (user.subscription_tier or "free") if user else "free"
        tier_config = TIER_FEATURES.get(tier, TIER_FEATURES["free"])
        return bool(tier_config.get(feature, False))

    def check_usage_limit(
        self, user: Optional["User"], feature: str, current_count: int
    ) -> bool:
        tier = (user.subscription_tier or "free") if user else "free"
        tier_config = TIER_FEATURES.get(tier, TIER_FEATURES["free"])
        limit = tier_config.get(feature, 0)
        if limit == -1:
            return True
        return current_count < limit

    def get_upgrade_prompt(
        self, feature: str, current_tier: str
    ) -> Optional[dict]:
        for tier_name, config in TIER_FEATURES.items():
            if config.get(feature):
                return {
                    "feature": feature,
                    "required_tier": tier_name,
                    "current_tier": current_tier,
                    "message": f"Upgrade to {config.get('display_name', tier_name.title())} to unlock {feature.replace('_', ' ').title()}",
                }
        return None
