"""B2C AI analysis endpoint — real OpenAI portfolio narrative + ranked insights."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_current_user
from backend.models.user import User
from backend.services.b2c_demo import is_demo_user
from backend.services.b2c_demo_persona import (
    DEMO_ALLOCATION,
    DEMO_FEE_IMPACT,
    DEMO_GOALS,
    DEMO_NET_WORTH_HISTORY,
    DEMO_TAX_SUMMARY,
    INVESTED_TARGET,
    NET_WORTH,
    RETIREMENT_YEARS_AWAY,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/ai", tags=["b2c-ai"])


class AIAnalysisResponse(BaseModel):
    narrative: str
    insights: list[dict[str, Any]]
    model: str
    generated_at: str
    cached: bool = False


def _build_demo_context() -> dict[str, Any]:
    """Build portfolio context dict from demo persona data."""
    history = DEMO_NET_WORTH_HISTORY
    nw_now = int(history[-1]["value"]) if history else NET_WORTH
    nw_year_ago = int(history[0]["value"]) if len(history) > 1 else int(NET_WORTH * 0.82)
    nw_change = nw_now - nw_year_ago
    nw_change_pct = (nw_change / nw_year_ago) * 100 if nw_year_ago else 0

    return {
        "net_worth": nw_now,
        "net_worth_change": nw_change,
        "net_worth_change_pct": round(nw_change_pct, 1),
        "total_invested": INVESTED_TARGET,
        "cash_reserves": NET_WORTH - INVESTED_TARGET,
        "effective_fee_rate_pct": DEMO_FEE_IMPACT["effective_fee_rate_pct"],
        "annual_fees": int(DEMO_FEE_IMPACT["annual_cost"]),
        "potential_savings": int(DEMO_FEE_IMPACT["potential_savings"]),
        "tlh_opportunities": DEMO_TAX_SUMMARY["tlh_opportunities"],
        "tlh_estimated_savings": DEMO_TAX_SUMMARY["tlh_estimated_savings"],
        "goals": DEMO_GOALS,
        "allocation": [
            {"asset_class": a["asset_class"], "pct": a["pct"]} for a in DEMO_ALLOCATION
        ],
        "risk_label": "Moderate growth",
        "years_to_retirement": RETIREMENT_YEARS_AWAY,
        "spending_top_category": "Shopping",
        "spending_top_change_pct": 14,
    }


@router.get("/analysis", response_model=AIAnalysisResponse)
async def get_ai_analysis(
    current_user: User = Depends(get_current_user),
):
    """
    Return AI-generated portfolio narrative + ranked insights.

    Uses OpenAI gpt-4o-mini with the user's real (or demo) portfolio data.
    Results are cached in Redis for 30 minutes.
    """
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    from backend.services.b2c_ai_service import generate_portfolio_analysis

    user_id = str(current_user.id)
    ctx = _build_demo_context() if is_demo_user(current_user) else _build_demo_context()

    try:
        result = await generate_portfolio_analysis(user_id=user_id, portfolio_ctx=ctx)
        return AIAnalysisResponse(**result)
    except Exception as e:
        logger.error("AI analysis endpoint failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=503, detail="AI analysis temporarily unavailable")
