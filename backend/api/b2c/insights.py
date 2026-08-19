"""B2C proactive insights engine — generates contextual insights from portfolio
and spending data without making specific investment recommendations."""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.dependencies import get_current_user
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-insights"])

InsightType = Literal[
    "fee_savings",
    "rebalance_needed",
    "goal_off_track",
    "budget_overspend",
    "tax_opportunity",
]


class Insight(BaseModel):
    id: str
    type: InsightType
    title: str
    body: str
    cta_label: str
    cta_path: str
    priority: int  # 1 = highest


def _build_insights(user: User) -> list[dict]:
    """Generate insights by reading the user's live budget and portfolio data.

    Falls back gracefully if any sub-service is unavailable.
    Priority order: budget overspend → fee savings → goal drift → rebalance → tax.
    """
    insights: list[dict] = []

    # ── budget overspend ──────────────────────────────────────────────────────
    try:
        from backend.api.b2c.budgets import _build_budgets
        budgets = _build_budgets(str(user.id))
        over = [b for b in budgets if b["status"] == "over"]
        if over:
            cat = over[0]
            overpct = cat["pct"] - 100
            insights.append({
                "id": "budget-overspend",
                "type": "budget_overspend",
                "title": f"You're {overpct:.0f}% over your {cat['label']} budget",
                "body": (
                    f"You've spent {cat['label'].lower()} ${cat['current_spend']:.0f} "
                    f"this month against a ${cat['monthly_limit']:.0f} limit. "
                    "Reviewing your spending categories can help you stay on track."
                ),
                "cta_label": "Review budgets",
                "cta_path": "/client/budgets",
                "priority": 1,
            })
    except Exception as exc:
        logger.debug("budget insight skipped: %s", exc)

    # ── fee savings ───────────────────────────────────────────────────────────
    try:
        from backend.api.b2c.dashboard import _get_dashboard_for_user
        dash = _get_dashboard_for_user(str(user.id))
        benchmarks = dash.get("fee_benchmarks", [])
        user_bench = next((b for b in benchmarks if b.get("label", "").lower().startswith("your")), None)
        robo_bench = next((b for b in benchmarks if "robo" in b.get("label", "").lower()), None)
        if user_bench and robo_bench:
            user_rate = float(user_bench.get("rate_pct", 0))
            robo_rate = float(robo_bench.get("rate_pct", 0))
            if user_rate > robo_rate + 0.1:
                aum = float(dash.get("total_aum", 125000))
                savings = round((user_rate - robo_rate) / 100 * aum, 0)
                insights.append({
                    "id": "fee-savings",
                    "type": "fee_savings",
                    "title": f"You could save ~${savings:,.0f}/yr in fees",
                    "body": (
                        f"Your estimated fee rate ({user_rate:.2f}%) is above the robo-advisor "
                        f"average ({robo_rate:.2f}%). Understanding your fee structure helps you "
                        "make informed decisions about your investment strategy."
                    ),
                    "cta_label": "View fee analyzer",
                    "cta_path": "/client/dashboard",
                    "priority": 2,
                })
    except Exception as exc:
        logger.debug("fee insight skipped: %s", exc)

    # ── goal off track ────────────────────────────────────────────────────────
    try:
        from backend.api.b2c.goals import _get_goals_for_user  # type: ignore[import]
        goals = _get_goals_for_user(str(user.id))
        behind = [g for g in goals if g.get("progress_pct", 100) < 60]
        if behind:
            g = behind[0]
            insights.append({
                "id": "goal-off-track",
                "type": "goal_off_track",
                "title": f'Your "{g["name"]}" goal may need attention',
                "body": (
                    f"You're {g['progress_pct']:.0f}% of the way to your "
                    f"{g['name'].lower()} goal. Small, consistent contributions "
                    "can compound significantly over time."
                ),
                "cta_label": "Review goals",
                "cta_path": "/client/goals",
                "priority": 3,
            })
    except Exception as exc:
        logger.debug("goal insight skipped: %s", exc)

    # ── rebalance needed ──────────────────────────────────────────────────────
    try:
        from backend.api.b2c.dashboard import _get_dashboard_for_user  # noqa: F811
        dash = _get_dashboard_for_user(str(user.id))
        allocation = dash.get("allocation", [])
        equity = sum(
            float(a.get("pct", 0))
            for a in allocation
            if any(k in a.get("asset_class", "").lower() for k in ("stock", "equit", "us large"))
        )
        if equity > 80:
            insights.append({
                "id": "rebalance-needed",
                "type": "rebalance_needed",
                "title": "Your portfolio is heavily weighted toward equities",
                "body": (
                    f"About {equity:.0f}% of your portfolio is in equities. "
                    "Reviewing your target allocation relative to your risk profile "
                    "and time horizon is a routine part of portfolio maintenance."
                ),
                "cta_label": "View allocation",
                "cta_path": "/client/dashboard",
                "priority": 4,
            })
    except Exception as exc:
        logger.debug("rebalance insight skipped: %s", exc)

    # ── tax opportunity ───────────────────────────────────────────────────────
    try:
        from backend.api.b2c.tax import get_tax_summary  # type: ignore[import]
        from fastapi import Request
        tax = get_tax_summary.__wrapped__(user) if hasattr(get_tax_summary, "__wrapped__") else None
        if tax and tax.get("tlh_opportunities", 0) > 0:
            opp = tax["tlh_opportunities"]
            insights.append({
                "id": "tax-opportunity",
                "type": "tax_opportunity",
                "title": f"{opp} potential tax-loss harvesting opportunit{'y' if opp == 1 else 'ies'}",
                "body": (
                    "Some positions in your portfolio may have unrealised losses that could "
                    "offset taxable gains. Tax-loss harvesting is a strategy worth discussing "
                    "with a tax professional."
                ),
                "cta_label": "View tax summary",
                "cta_path": "/client/dashboard",
                "priority": 5,
            })
    except Exception as exc:
        logger.debug("tax insight skipped: %s", exc)

    # Sort by priority and return at most 5
    insights.sort(key=lambda i: i["priority"])
    return insights[:5]


@router.get("/insights")
async def get_insights(current_user: User = Depends(get_current_user)):
    """Return 3–5 contextual insights for the authenticated B2C user."""
    from fastapi import HTTPException
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    insights = _build_insights(current_user)

    # Always guarantee at least the fee-savings and budget insights exist
    # by falling back to static defaults when sub-services are unavailable.
    if not insights:
        insights = _default_insights()

    return {"insights": insights, "count": len(insights)}


def _default_insights() -> list[dict]:
    """Fallback static insights shown when no live data is available."""
    return [
        {
            "id": "fee-savings-default",
            "type": "fee_savings",
            "title": "Link accounts to see your fee analysis",
            "body": (
                "Once your accounts are connected, Firmum analyses your investment fees "
                "against robo-advisor and traditional averages so you know exactly what you pay."
            ),
            "cta_label": "Connect accounts",
            "cta_path": "/client/dashboard",
            "priority": 1,
        },
        {
            "id": "goal-default",
            "type": "goal_off_track",
            "title": "Set a goal to start tracking your progress",
            "body": (
                "Goals give you a target to aim for. Add a retirement, emergency fund, "
                "or savings goal and Firmum will track your progress automatically."
            ),
            "cta_label": "Add a goal",
            "cta_path": "/client/goals",
            "priority": 2,
        },
        {
            "id": "budget-default",
            "type": "budget_overspend",
            "title": "Set spending budgets to stay on track",
            "body": (
                "Budgets help you understand where your money goes each month. "
                "Link a bank account and Firmum will automatically track spend by category."
            ),
            "cta_label": "Set up budgets",
            "cta_path": "/client/budgets",
            "priority": 3,
        },
    ]
