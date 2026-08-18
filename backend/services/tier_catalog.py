"""
Single source of truth for B2C subscription tiers, limits, and marketing copy.
Used by entitlements, Stripe checkout labels, and API responses.
"""

from typing import Any

# Industry fee benchmarks (annual % of AUM) for fee analyzer comparisons
FEE_BENCHMARKS = {
    "robo_advisor": {"label": "Robo-advisor avg", "rate_pct": 0.25},
    "low_cost_etf": {"label": "Low-cost ETF portfolio", "rate_pct": 0.15},
    "full_service": {"label": "Full-service advisor avg", "rate_pct": 0.89},
    "firmum_target": {"label": "Firmum target (DIY)", "rate_pct": 0.10},
}

B2C_TIERS: dict[str, dict[str, Any]] = {
    "free": {
        "display_name": "Free",
        "price_monthly_cents": 0,
        "price_annual_cents": 0,
        "statement_uploads_per_month": 2,
        "ai_chat_messages_per_month": 10,
        "max_accounts": 1,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "fee_benchmark": True,
        "concentration_risk": True,
        "net_worth_history": True,
        "risk_score_display": True,
        "rebalancing_plan": False,
        "tax_harvesting": False,
        "retirement_planner": False,
        "retirement_planner_lite": True,
        "direct_indexing": False,
        "household_aggregation": False,
        "account_aggregation": False,
        "coaching": False,
        "export_reports": False,
        "advisor_connect": False,
        "priority_advisor_match": False,
    },
    "starter": {
        "display_name": "Starter",
        "price_monthly_cents": 900,
        "price_annual_cents": 8900,
        "statement_uploads_per_month": 10,
        "ai_chat_messages_per_month": 50,
        "max_accounts": 3,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "fee_benchmark": True,
        "concentration_risk": True,
        "net_worth_history": True,
        "risk_score_display": True,
        "rebalancing_plan": True,
        "tax_harvesting": False,
        "retirement_planner": False,
        "retirement_planner_lite": True,
        "direct_indexing": False,
        "household_aggregation": True,
        "account_aggregation": False,
        "coaching": True,
        "export_reports": True,
        "advisor_connect": False,
        "priority_advisor_match": False,
    },
    "pro": {
        "display_name": "Pro",
        "price_monthly_cents": 1900,
        "price_annual_cents": 17900,
        "statement_uploads_per_month": 50,
        "ai_chat_messages_per_month": 200,
        "max_accounts": 10,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "fee_benchmark": True,
        "concentration_risk": True,
        "net_worth_history": True,
        "risk_score_display": True,
        "rebalancing_plan": True,
        "tax_harvesting": True,
        "retirement_planner": True,
        "direct_indexing": False,
        "household_aggregation": True,
        "account_aggregation": False,
        "coaching": True,
        "export_reports": True,
        "priority_support": True,
        "advisor_connect": True,
        "priority_advisor_match": False,
    },
    "premium": {
        "display_name": "Premium",
        "price_monthly_cents": 4900,
        "price_annual_cents": 44900,
        "statement_uploads_per_month": -1,
        "ai_chat_messages_per_month": -1,
        "max_accounts": -1,
        "portfolio_analysis": True,
        "fee_impact_report": True,
        "fee_benchmark": True,
        "concentration_risk": True,
        "net_worth_history": True,
        "risk_score_display": True,
        "rebalancing_plan": True,
        "tax_harvesting": True,
        "retirement_planner": True,
        "direct_indexing": True,
        "household_aggregation": True,
        "account_aggregation": True,
        "coaching": True,
        "export_reports": True,
        "priority_support": True,
        "api_access": True,
        "advisor_connect": True,
        "priority_advisor_match": True,
        "family_members": 5,
    },
}

# RIA platform tiers (marketing / billing reference)
RIA_TIERS: dict[str, dict[str, Any]] = {
    "breakaway": {
        "display_name": "Breakaway",
        "price_monthly_cents": 19900,
        "max_aum": 5_000_000,
        "max_households": 10,
        "max_advisors": 1,
    },
    "starter": {
        "display_name": "Starter",
        "price_monthly_cents": 49900,
        "max_aum": 10_000_000,
        "max_households": 25,
    },
    "professional": {
        "display_name": "Professional",
        "price_monthly_cents": 99900,
        "max_aum": 50_000_000,
        "max_households": 100,
    },
    "enterprise": {
        "display_name": "Enterprise",
        "price_monthly_cents": None,
        "max_aum": None,
        "max_households": None,
    },
}

# Platform fee on B2C→RIA advisor matches (basis points, annual)
ADVISOR_CONNECT_PLATFORM_FEE_BPS = 25  # 0.25%, aligned with Betterment BAN


def tier_features(tier: str) -> dict[str, Any]:
    return B2C_TIERS.get(tier, B2C_TIERS["free"])


def format_limit(value: int) -> str:
    if value == -1:
        return "Unlimited"
    return str(value)
