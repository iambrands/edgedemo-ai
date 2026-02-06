"""Analysis endpoints — IIM household, fees, risk, rebalance."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from backend.api.dependencies import get_db
from backend.services.iim_service import IIMService
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])


@router.post("/household/{household_id}")
async def analyze_household(
    household_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Full household analysis (IIM)."""
    try:
        iim = IIMService(session)
        result = await iim.analyze_household(household_id)
        return {
            "household_id": result.household_id,
            "total_aum": float(result.total_aum),
            "account_count": result.account_count,
            "asset_allocation": [
                {
                    "asset_class": a.asset_class,
                    "actual_pct": float(a.actual_pct),
                    "value": float(a.value),
                }
                for a in result.asset_allocation
            ],
            "concentration_risks": [
                {
                    "type": v.type,
                    "description": v.description,
                    "severity": v.severity,
                }
                for v in result.concentration_risks
            ],
            "summary": result.summary,
        }
    except Exception as e:
        logger.exception("Household analysis error: %s", e)
        raise HTTPException(500, "Analysis failed")


@router.get("/fees/{account_id}")
async def fee_impact(
    account_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Fee impact report for account."""
    try:
        iim = IIMService(session)
        result = await iim.calculate_fee_impact(account_id)
        return {
            "account_id": result.account_id,
            "total_annual_fees": float(result.total_annual_fees),
            "projected_10yr": float(result.projected_10yr),
            "projected_30yr": float(result.projected_30yr),
            "opportunity_cost_30yr": float(result.opportunity_cost_30yr),
            "recommendations": result.recommendations,
        }
    except Exception as e:
        logger.exception("Fee impact error: %s", e)
        raise HTTPException(500, "Analysis failed")


@router.get("/risk/{household_id}")
async def concentration_risk(
    household_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Concentration risk report."""
    try:
        iim = IIMService(session)
        result = await iim.detect_concentration_risk(household_id)
        return {
            "household_id": result.household_id,
            "risk_score": result.risk_score,
            "violations": [
                {"type": v.type, "description": v.description}
                for v in result.violations
            ],
            "suggestions": result.suggestions,
        }
    except Exception as e:
        logger.exception("Risk analysis error: %s", e)
        raise HTTPException(500, "Analysis failed")


@router.post("/rebalance/{account_id}")
async def rebalancing_plan(
    account_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Generate rebalancing plan."""
    try:
        iim = IIMService(session)
        result = await iim.generate_rebalancing_plan(account_id)
        return {
            "account_id": result.account_id,
            "trades": [{"ticker": t.ticker, "action": t.action} for t in result.trades],
            "summary": result.summary,
        }
    except Exception as e:
        logger.exception("Rebalance error: %s", e)
        raise HTTPException(500, "Analysis failed")
