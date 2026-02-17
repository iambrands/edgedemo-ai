"""
Bridge between Edge portfolio analysis and IAB Academy educational content.
"""

import logging
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)

ISSUE_TO_CONTENT = {
    "high_expense_ratios": {
        "track": "stock_investing",
        "module": "Understanding Investment Fees",
        "reason": "Your portfolio has high expense ratios. Learn how fees compound over time.",
    },
    "va_high_fees": {
        "track": "stock_investing",
        "module": "Variable Annuities: What You Need to Know",
        "reason": "Your variable annuity has M&E charges on top of fund expenses.",
    },
    "surrender_charges": {
        "track": "stock_investing",
        "module": "Navigating Surrender Periods",
        "reason": "Your account has surrender charge restrictions.",
    },
    "concentration_risk": {
        "track": "stock_investing",
        "module": "Diversification Fundamentals",
        "reason": "Your portfolio is concentrated. Learn why diversification matters.",
    },
    "allocation_drift": {
        "track": "stock_investing",
        "module": "Portfolio Rebalancing Strategies",
        "reason": "Your portfolio has drifted from target allocation.",
    },
    "no_international": {
        "track": "stock_investing",
        "module": "Global Investing",
        "reason": "Your portfolio lacks international exposure.",
    },
    "tax_inefficient_placement": {
        "track": "ai_and_investing",
        "module": "Tax-Efficient Asset Location",
        "reason": "Some tax-inefficient holdings are in taxable accounts.",
    },
    "tax_loss_opportunities": {
        "track": "ai_and_investing",
        "module": "Tax-Loss Harvesting",
        "reason": "You have unrealized losses that could offset gains.",
    },
    "risk_mismatch": {
        "track": "stock_investing",
        "module": "Understanding Your Risk Tolerance",
        "reason": "Portfolio risk doesn't match your stated tolerance.",
    },
    "no_emergency_fund": {
        "track": "faith_and_finance",
        "module": "Building Financial Foundations",
        "reason": "Ensure you have an emergency fund before investing aggressively.",
    },
    "options_positions": {
        "track": "options_trading",
        "module": "Options Fundamentals",
        "reason": "You hold options. Understand the risks and strategies.",
    },
    "crypto_holdings": {
        "track": "crypto",
        "module": "Cryptocurrency Investing",
        "reason": "You have crypto exposure. Learn about risks and tax implications.",
    },
}

ACADEMY_BASE_URL = "https://iabacademy.ai"


class ContentRecommendation(BaseModel):
    track: str
    module: str
    reason: str
    academy_url: str
    priority: str


class AcademyBridge:
    def get_recommendations(
        self, risk_flags: list[str], portfolio_issues: list[str] | None = None
    ) -> list[ContentRecommendation]:
        """Map portfolio findings to Academy content recommendations."""
        recommendations = []
        seen_tracks = set()
        all_issues = risk_flags + (portfolio_issues or [])

        for issue in all_issues:
            issue_key = self._classify_issue(issue)
            if issue_key and issue_key in ISSUE_TO_CONTENT:
                content = ISSUE_TO_CONTENT[issue_key]
                if content["track"] in seen_tracks:
                    continue
                seen_tracks.add(content["track"])
                recommendations.append(
                    ContentRecommendation(
                        track=content["track"],
                        module=content["module"],
                        reason=content["reason"],
                        academy_url=f"{ACADEMY_BASE_URL}/tracks/{content['track']}",
                        priority="high"
                        if issue_key
                        in ("high_expense_ratios", "concentration_risk", "risk_mismatch")
                        else "medium",
                    )
                )

        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda r: priority_order.get(r.priority, 2))
        return recommendations[:5]

    def _classify_issue(self, issue_text: str) -> Optional[str]:
        """Map free-text issue to canonical key."""
        issue_lower = issue_text.lower()
        keyword_map = {
            "expense ratio": "high_expense_ratios",
            "m&e": "va_high_fees",
            "m and e": "va_high_fees",
            "surrender": "surrender_charges",
            "concentration": "concentration_risk",
            "drift": "allocation_drift",
            "rebalanc": "allocation_drift",
            "international": "no_international",
            "tax-loss": "tax_loss_opportunities",
            "tax loss": "tax_loss_opportunities",
            "harvest": "tax_loss_opportunities",
            "asset location": "tax_inefficient_placement",
            "risk tolerance": "risk_mismatch",
            "risk mismatch": "risk_mismatch",
            "emergency": "no_emergency_fund",
            "option": "options_positions",
            "crypto": "crypto_holdings",
        }
        for keyword, key in keyword_map.items():
            if keyword in issue_lower:
                return key
        return None
