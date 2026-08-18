"""B2C retirement planning — Monte Carlo gated by subscription tier."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.api.financial_planning import _monte_carlo
from backend.models.user import User
from backend.services.entitlements import EntitlementService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/planning", tags=["b2c-planning"])


class RetirementPlanRequest(BaseModel):
    current_assets: float = Field(default=100000, ge=0)
    annual_contribution: float = Field(default=12000, ge=0)
    years_to_retire: int = Field(default=20, ge=1, le=50)
    years_in_retirement: int = Field(default=25, ge=5, le=50)
    annual_spending: float = Field(default=60000, ge=0)
    expected_return: float = Field(default=0.07, ge=0, le=0.2)
    volatility: float = Field(default=0.15, ge=0.05, le=0.4)
    inflation: float = Field(default=0.025, ge=0, le=0.1)


@router.post("/retirement")
async def run_retirement_plan(
    req: RetirementPlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Monte Carlo retirement projection. Lite mode on Free/Starter; full on Pro+."""
    entitlements = EntitlementService()
    full = entitlements.check_feature(current_user, "retirement_planner")
    lite = entitlements.check_feature(current_user, "retirement_planner_lite")
    if not full and not lite:
        raise HTTPException(
            status_code=402,
            detail="Upgrade to Starter to access the retirement planner",
        )

    simulations = 1000 if full else 250

    result = _monte_carlo(
        current_assets=req.current_assets,
        annual_contribution=req.annual_contribution,
        years_to_retire=req.years_to_retire,
        years_in_retirement=req.years_in_retirement,
        annual_spending=req.annual_spending,
        expected_return=req.expected_return,
        volatility=req.volatility,
        inflation=req.inflation,
        simulations=simulations,
    )
    mode = "full" if full else "lite"
    return {
        **result,
        "mode": mode,
        "simulations": simulations,
        "disclaimer": "Educational projection only — not personalized investment advice.",
    }


@router.get("/tiers")
async def list_b2c_tiers():
    """Public tier catalog for upgrade page (no auth required)."""
    from backend.services.tier_catalog import B2C_TIERS, format_limit

    out = []
    for tier_id, cfg in B2C_TIERS.items():
        if tier_id == "free":
            continue
        out.append({
            "id": tier_id,
            "name": cfg["display_name"],
            "price_monthly_cents": cfg["price_monthly_cents"],
            "price_annual_cents": cfg["price_annual_cents"],
            "features": {
                "statement_uploads": format_limit(cfg["statement_uploads_per_month"]),
                "ai_chat": format_limit(cfg["ai_chat_messages_per_month"]),
                "retirement_planner": cfg.get("retirement_planner", False),
                "retirement_planner_lite": cfg.get("retirement_planner_lite", False),
                "advisor_connect": cfg.get("advisor_connect", False),
                "priority_advisor_match": cfg.get("priority_advisor_match", False),
            },
        })
    return {"tiers": out}
