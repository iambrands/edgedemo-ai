"""
Financial planning endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import random

router = APIRouter(prefix="/api/v1/planning/financial", tags=["Financial Planning"])


class RetirementInput(BaseModel):
    current_age: int
    retirement_age: int
    life_expectancy: int = 90
    current_savings: float
    annual_contribution: float
    employer_match_pct: float = 0
    social_security_monthly: float = 0
    desired_annual_income: float
    inflation_rate: float = 0.025
    pre_retirement_return: float = 0.07
    post_retirement_return: float = 0.05


class GoalInput(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    monthly_contribution: float
    target_date: date
    priority: str = "medium"


@router.post("/retirement-projection")
async def project_retirement(input: RetirementInput):
    """Generate retirement projection with Monte Carlo simulation."""
    years_to_retirement = input.retirement_age - input.current_age
    years_in_retirement = input.life_expectancy - input.retirement_age
    yearly_contribution = input.annual_contribution * (1 + input.employer_match_pct / 100)

    balance = input.current_savings
    accumulation = []
    for year in range(years_to_retirement):
        balance = balance * (1 + input.pre_retirement_return) + yearly_contribution
        accumulation.append({"age": input.current_age + year + 1, "year": year + 1, "balance": round(balance, 2), "phase": "accumulation"})

    retirement_balance = balance
    annual_withdrawal = input.desired_annual_income - (input.social_security_monthly * 12)
    distribution = []
    for year in range(years_in_retirement):
        withdrawal = annual_withdrawal * ((1 + input.inflation_rate) ** year)
        balance = balance * (1 + input.post_retirement_return) - withdrawal
        distribution.append({"age": input.retirement_age + year + 1, "year": years_to_retirement + year + 1, "balance": round(max(0, balance), 2), "withdrawal": round(withdrawal, 2), "phase": "distribution"})
        if balance <= 0:
            break

    num_simulations = 1000
    success_count = 0
    all_outcomes = []
    for sim in range(num_simulations):
        sim_balance = input.current_savings
        for year in range(years_to_retirement):
            annual_return = random.gauss(input.pre_retirement_return, 0.15)
            sim_balance = sim_balance * (1 + annual_return) + yearly_contribution
        survived = True
        for year in range(years_in_retirement):
            annual_return = random.gauss(input.post_retirement_return, 0.10)
            withdrawal = annual_withdrawal * ((1 + input.inflation_rate) ** year)
            sim_balance = sim_balance * (1 + annual_return) - withdrawal
            if sim_balance <= 0:
                survived = False
                break
        if survived and sim_balance > 0:
            success_count += 1
        all_outcomes.append(sim_balance)

    success_rate = success_count / num_simulations * 100
    sorted_outcomes = sorted(all_outcomes)

    return {
        "input_summary": {"current_age": input.current_age, "retirement_age": input.retirement_age, "years_to_retirement": years_to_retirement, "current_savings": input.current_savings, "annual_contribution": yearly_contribution},
        "deterministic_projection": {
            "retirement_balance": round(retirement_balance, 2),
            "annual_withdrawal_start": round(annual_withdrawal, 2),
            "years_funded": len([d for d in distribution if d["balance"] > 0]),
            "ending_balance": round(max(0, distribution[-1]["balance"]) if distribution else 0, 2),
            "timeline": accumulation + distribution,
        },
        "monte_carlo": {
            "num_simulations": num_simulations,
            "success_rate": round(success_rate, 1),
            "success_label": "Excellent" if success_rate >= 90 else "Good" if success_rate >= 75 else "Fair" if success_rate >= 60 else "Needs Attention",
            "median_ending_balance": round(sorted_outcomes[num_simulations // 2], 2),
        },
        "recommendations": _generate_retirement_recommendations(success_rate, input),
    }


@router.post("/goals")
async def analyze_goals(goals: List[GoalInput]):
    """Analyze progress toward financial goals."""
    results = []
    for goal in goals:
        months_remaining = max(1, (goal.target_date - date.today()).days / 30)
        projected_amount = goal.current_amount + (goal.monthly_contribution * months_remaining * 1.005)
        gap = goal.target_amount - projected_amount
        if projected_amount >= goal.target_amount:
            status = "on_track"
            monthly_needed = goal.monthly_contribution
        else:
            status = "behind"
            monthly_needed = (goal.target_amount - goal.current_amount) / months_remaining
        results.append({
            "name": goal.name,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "projected_amount": round(projected_amount, 2),
            "progress_pct": round(goal.current_amount / goal.target_amount * 100, 1),
            "gap": round(max(0, gap), 2),
            "status": status,
            "monthly_contribution_current": goal.monthly_contribution,
            "monthly_contribution_needed": round(monthly_needed, 2),
            "target_date": goal.target_date.isoformat(),
            "priority": goal.priority,
        })
    return {"goals": results}


@router.post("/cashflow")
async def analyze_cashflow(
    annual_income: float,
    annual_expenses: float,
    annual_savings: float,
    current_age: int,
    retirement_age: int = 65,
):
    """Simple cash flow and net worth projection."""
    savings_rate = annual_savings / annual_income * 100
    years = retirement_age - current_age
    projection = []
    net_worth = 0
    for year in range(years + 20):
        age = current_age + year
        if age < retirement_age:
            income = annual_income * (1.03 ** year)
            expenses = annual_expenses * (1.025 ** year)
            savings = income - expenses
        else:
            income = annual_savings * 0.04 * (1.025 ** (age - retirement_age))
            expenses = annual_expenses * (1.025 ** year)
            savings = income - expenses
        net_worth += savings + (net_worth * 0.06)
        projection.append({"age": age, "income": round(income, 2), "expenses": round(expenses, 2), "savings": round(savings, 2), "net_worth": round(max(0, net_worth), 2)})
    return {
        "savings_rate": round(savings_rate, 1),
        "savings_rate_label": "Excellent" if savings_rate >= 20 else "Good" if savings_rate >= 15 else "Fair" if savings_rate >= 10 else "Needs Improvement",
        "projection": projection,
    }


def _generate_retirement_recommendations(success_rate, input):
    recommendations = []
    if success_rate < 75:
        recommendations.append({"priority": "high", "action": "Increase monthly savings", "detail": "Increasing annual contributions by 10% would improve success probability by approximately 8 percentage points."})
    if success_rate < 90:
        recommendations.append({"priority": "medium", "action": "Consider delaying retirement by 2 years", "detail": f"Working until {input.retirement_age + 2} adds 2 more years of contributions and delays withdrawals."})
    if input.social_security_monthly == 0:
        recommendations.append({"priority": "medium", "action": "Include Social Security estimate", "detail": "Adding expected Social Security benefits will likely improve your projection. Visit ssa.gov for your personalized estimate."})
    recommendations.append({"priority": "low", "action": "Review annually", "detail": "Retirement projections should be updated annually or after major life changes."})
    return recommendations
