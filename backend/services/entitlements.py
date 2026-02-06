"""
Feature entitlement service. Controls what each subscription tier can access.
Shared infrastructure (IIM/CIM/BIM) but gated per tier.
"""

import logging
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from backend.models.user import User

logger = logging.getLogger(__name__)

TIER_FEATURES = {
    "free": {
        "statement_uploads_per_month": 2,
        "ai_chat_messages_per_month": 10,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "concentration_risk": True,
        "rebalancing_plan": False,
        "tax_harvesting": False,
        "direct_indexing": False,
        "household_aggregation": False,
        "coaching": False,
        "export_reports": False,
    },
    "starter": {
        "statement_uploads_per_month": 10,
        "ai_chat_messages_per_month": 50,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "concentration_risk": True,
        "rebalancing_plan": True,
        "tax_harvesting": False,
        "direct_indexing": False,
        "household_aggregation": True,
        "max_accounts": 3,
        "coaching": True,
        "export_reports": True,
    },
    "pro": {
        "statement_uploads_per_month": 50,
        "ai_chat_messages_per_month": 200,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "concentration_risk": True,
        "rebalancing_plan": True,
        "tax_harvesting": True,
        "direct_indexing": False,
        "household_aggregation": True,
        "max_accounts": 10,
        "coaching": True,
        "export_reports": True,
        "priority_support": True,
    },
    "premium": {
        "statement_uploads_per_month": -1,
        "ai_chat_messages_per_month": -1,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "concentration_risk": True,
        "rebalancing_plan": True,
        "tax_harvesting": True,
        "direct_indexing": True,
        "household_aggregation": True,
        "max_accounts": -1,
        "coaching": True,
        "export_reports": True,
        "priority_support": True,
        "api_access": True,
    },
}


class EntitlementService:
    """Feature gating and usage limits per subscription tier."""

    def check_feature(self, user: Optional["User"], feature: str) -> bool:
        """Check if user's subscription tier includes this feature."""
        tier = (user.subscription_tier or "free") if user else "free"
        tier_config = TIER_FEATURES.get(tier, TIER_FEATURES["free"])
        return bool(tier_config.get(feature, False))

    def check_usage_limit(
        self, user: Optional["User"], feature: str, current_count: int
    ) -> bool:
        """Check if user has remaining usage for rate-limited features."""
        tier = (user.subscription_tier or "free") if user else "free"
        tier_config = TIER_FEATURES.get(tier, TIER_FEATURES["free"])
        limit = tier_config.get(feature, 0)
        if limit == -1:
            return True
        return current_count < limit

    def get_upgrade_prompt(
        self, feature: str, current_tier: str
    ) -> Optional[dict]:
        """Return upgrade CTA when user hits a gate."""
        for tier_name, config in TIER_FEATURES.items():
            if config.get(feature):
                return {
                    "feature": feature,
                    "required_tier": tier_name,
                    "current_tier": current_tier,
                    "message": f"Upgrade to {tier_name.title()} to unlock {feature.replace('_', ' ').title()}",
                }
        return None
