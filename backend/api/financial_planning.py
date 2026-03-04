"""
Financial Planning API — Monte Carlo simulation, multi-goal planning,
Social Security optimization, Roth conversion analysis, and
integration layer for RightCapital/eMoney.
"""
import math
import random
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/planning", tags=["Financial Planning"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Monte Carlo Engine
# ---------------------------------------------------------------------------

def _monte_carlo(
    current_assets: float,
    annual_contribution: float,
    years_to_retire: int,
    years_in_retirement: int,
    annual_spending: float,
    expected_return: float = 0.07,
    volatility: float = 0.15,
    inflation: float = 0.025,
    simulations: int = 1000,
) -> Dict[str, Any]:
    success_count = 0
    ending_balances = []
    percentile_paths: Dict[str, List[float]] = {"p10": [], "p25": [], "p50": [], "p75": [], "p90": []}
    total_years = years_to_retire + years_in_retirement
    all_paths = []

    for _ in range(simulations):
        balance = current_assets
        path = [balance]
        failed = False
        for y in range(total_years):
            annual_r = random.gauss(expected_return, volatility)
            if y < years_to_retire:
                balance = balance * (1 + annual_r) + annual_contribution
            else:
                real_spending = annual_spending * ((1 + inflation) ** (y - years_to_retire))
                balance = balance * (1 + annual_r) - real_spending
            if balance < 0:
                balance = 0
                failed = True
            path.append(round(balance, 2))
        all_paths.append(path)
        ending_balances.append(balance)
        if not failed and balance > 0:
            success_count += 1

    ending_balances.sort()
    for y in range(total_years + 1):
        year_vals = sorted([p[y] if y < len(p) else 0 for p in all_paths])
        n = len(year_vals)
        percentile_paths["p10"].append(round(year_vals[int(n * 0.1)], 0))
        percentile_paths["p25"].append(round(year_vals[int(n * 0.25)], 0))
        percentile_paths["p50"].append(round(year_vals[int(n * 0.5)], 0))
        percentile_paths["p75"].append(round(year_vals[int(n * 0.75)], 0))
        percentile_paths["p90"].append(round(year_vals[int(n * 0.9)], 0))

    return {
        "success_rate": round(success_count / simulations * 100, 1),
        "simulations": simulations,
        "median_ending_balance": round(ending_balances[simulations // 2], 0),
        "p10_ending": round(ending_balances[int(simulations * 0.1)], 0),
        "p90_ending": round(ending_balances[int(simulations * 0.9)], 0),
        "percentile_paths": percentile_paths,
        "total_years": total_years,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/monte-carlo")
async def run_monte_carlo(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    result = _monte_carlo(
        current_assets=request.get("current_assets", 500000),
        annual_contribution=request.get("annual_contribution", 24000),
        years_to_retire=request.get("years_to_retire", 20),
        years_in_retirement=request.get("years_in_retirement", 30),
        annual_spending=request.get("annual_spending", 80000),
        expected_return=request.get("expected_return", 0.07),
        volatility=request.get("volatility", 0.15),
        inflation=request.get("inflation", 0.025),
        simulations=min(request.get("simulations", 1000), 5000),
    )
    return result


@router.get("/goals/{household_id}")
async def get_financial_plan(
    household_id: str,
    current_user: dict = Depends(get_current_user),
):
    goals = [
        {"id": "goal-001", "name": "Retirement", "type": "retirement",
         "target_amount": 3500000, "current_progress": 2150000, "target_date": "2042-01-01",
         "monthly_contribution": 4000, "probability_of_success": 78.5,
         "status": "on_track", "priority": 1},
        {"id": "goal-002", "name": "College Fund — Sarah", "type": "education",
         "target_amount": 300000, "current_progress": 185000, "target_date": "2030-09-01",
         "monthly_contribution": 1500, "probability_of_success": 92.3,
         "status": "on_track", "priority": 2},
        {"id": "goal-003", "name": "Vacation Home", "type": "major_purchase",
         "target_amount": 500000, "current_progress": 125000, "target_date": "2028-06-01",
         "monthly_contribution": 3000, "probability_of_success": 64.2,
         "status": "at_risk", "priority": 3},
        {"id": "goal-004", "name": "Emergency Fund", "type": "emergency",
         "target_amount": 100000, "current_progress": 95000, "target_date": "2026-12-31",
         "monthly_contribution": 500, "probability_of_success": 99.1,
         "status": "on_track", "priority": 4},
    ]
    return {
        "household_id": household_id,
        "goals": goals,
        "overall_score": 82,
        "overall_status": "on_track",
        "next_review_date": (_now + timedelta(days=90)).strftime("%Y-%m-%d"),
    }


@router.post("/social-security")
async def optimize_social_security(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    birth_year = request.get("birth_year", 1965)
    pia = request.get("monthly_pia", 2800)
    spouse_pia = request.get("spouse_monthly_pia", 1500)

    scenarios = []
    for claim_age in [62, 65, 67, 70]:
        reduction = max(0, (67 - claim_age) * 6.67) if claim_age < 67 else 0
        bonus = max(0, (claim_age - 67) * 8) if claim_age > 67 else 0
        adjusted = round(pia * (1 - reduction / 100 + bonus / 100))
        lifetime_years = 90 - claim_age
        total = adjusted * 12 * lifetime_years

        scenarios.append({
            "claim_age": claim_age,
            "monthly_benefit": adjusted,
            "annual_benefit": adjusted * 12,
            "lifetime_total": total,
            "adjustment": f"{'-' if reduction else '+'}{reduction or bonus:.1f}%",
            "breakeven_age": claim_age + round(claim_age * 0.3),
        })

    optimal = max(scenarios, key=lambda s: s["lifetime_total"])
    return {
        "scenarios": scenarios,
        "optimal_age": optimal["claim_age"],
        "optimal_monthly": optimal["monthly_benefit"],
        "spouse_scenarios": [
            {"claim_age": 62, "monthly_benefit": round(spouse_pia * 0.7)},
            {"claim_age": 67, "monthly_benefit": spouse_pia},
            {"claim_age": 70, "monthly_benefit": round(spouse_pia * 1.24)},
        ],
    }


@router.post("/roth-conversion")
async def analyze_roth_conversion(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    traditional_balance = request.get("traditional_ira_balance", 500000)
    current_tax_rate = request.get("current_tax_rate", 0.24)
    retirement_tax_rate = request.get("retirement_tax_rate", 0.22)
    years_to_retire = request.get("years_to_retire", 15)
    growth_rate = request.get("growth_rate", 0.07)

    strategies = []
    for annual_conv in [0, 25000, 50000, 75000, 100000]:
        remaining_trad = traditional_balance
        roth_balance = 0
        total_tax_paid = 0

        for y in range(years_to_retire):
            convert = min(annual_conv, remaining_trad)
            tax = convert * current_tax_rate
            total_tax_paid += tax
            remaining_trad = (remaining_trad - convert) * (1 + growth_rate)
            roth_balance = (roth_balance + convert) * (1 + growth_rate)

        rmd_tax = remaining_trad * retirement_tax_rate * 0.04 * 20
        total_wealth = remaining_trad * (1 - retirement_tax_rate * 0.3) + roth_balance

        strategies.append({
            "annual_conversion": annual_conv,
            "total_tax_paid_now": round(total_tax_paid, 0),
            "traditional_balance_at_retirement": round(remaining_trad, 0),
            "roth_balance_at_retirement": round(roth_balance, 0),
            "estimated_rmd_tax": round(rmd_tax, 0),
            "net_wealth_at_retirement": round(total_wealth, 0),
            "tax_savings_vs_no_conversion": round(total_wealth - strategies[0]["net_wealth_at_retirement"], 0) if strategies else 0,
        })

    best = max(strategies, key=lambda s: s["net_wealth_at_retirement"])
    return {
        "strategies": strategies,
        "recommended_annual_conversion": best["annual_conversion"],
        "recommended_reason": f"Converting ${best['annual_conversion']:,}/yr maximizes after-tax wealth by ${best['net_wealth_at_retirement'] - strategies[0]['net_wealth_at_retirement']:,.0f}",
    }


@router.get("/estate/{household_id}")
async def get_estate_plan(
    household_id: str,
    current_user: dict = Depends(get_current_user),
):
    return {
        "household_id": household_id,
        "total_estate_value": 5250000,
        "federal_exemption": 13610000,
        "state_exemption": 5490000,
        "taxable_estate": 0,
        "estimated_estate_tax": 0,
        "documents": [
            {"type": "Will", "status": "current", "last_updated": "2024-06-15"},
            {"type": "Revocable Trust", "status": "current", "last_updated": "2024-06-15"},
            {"type": "Power of Attorney", "status": "current", "last_updated": "2024-06-15"},
            {"type": "Healthcare Directive", "status": "needs_review", "last_updated": "2021-03-10"},
        ],
        "beneficiary_summary": [
            {"account": "Williams Trust", "primary": "Sarah Williams (100%)", "contingent": "Children equally"},
            {"account": "Traditional IRA", "primary": "Sarah Williams (100%)", "contingent": "Estate"},
            {"account": "Roth IRA", "primary": "Sarah Williams (50%), Children (50%)", "contingent": "Estate"},
        ],
        "strategies": [
            "Annual gifting ($18,000/person) to reduce taxable estate",
            "Consider Irrevocable Life Insurance Trust (ILIT) for estate liquidity",
            "Review Healthcare Directive — last updated over 4 years ago",
        ],
    }
