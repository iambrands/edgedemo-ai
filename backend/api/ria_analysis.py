"""
Analysis endpoints for Portfolio, Fee, Tax, Risk, ETF, and IPS tools.
Returns mock data for demo purposes - wire to real AI when ready.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from backend.api.auth import get_current_user
from backend.api.ria_households import HOUSEHOLDS, ACCOUNTS

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])


@router.post("/portfolio/{household_id}")
async def portfolio_analysis(household_id: str, current_user: dict = Depends(get_current_user)):
    """Run portfolio analysis on a household."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    hh_accounts = [a for a in ACCOUNTS if a["householdId"] == household_id]
    total_value = sum(a["balance"] for a in hh_accounts)
    
    return {
        "householdId": household_id,
        "householdName": hh["name"],
        "totalValue": total_value,
        "allocation": [
            {"category": "US Stocks", "percentage": 45, "color": "#3B82F6"},
            {"category": "Int'l Stocks", "percentage": 15, "color": "#8B5CF6"},
            {"category": "Bonds", "percentage": 25, "color": "#22C55E"},
            {"category": "Cash", "percentage": 10, "color": "#6B7280"},
            {"category": "Alternatives", "percentage": 5, "color": "#F59E0B"},
        ],
        "metrics": [
            {"label": "Diversification Score", "value": "72/100"},
            {"label": "Sharpe Ratio", "value": "1.24"},
            {"label": "Beta", "value": "0.92"},
        ],
        "recommendations": [
            "Reduce single-stock concentration in NVDA (currently 47%)",
            "Consider adding international exposure for diversification",
            "Rebalance bonds to target allocation of 30%",
        ],
    }


@router.post("/fee/{household_id}")
async def fee_analysis(household_id: str, current_user: dict = Depends(get_current_user)):
    """Run fee analysis on a household."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    hh_accounts = [a for a in ACCOUNTS if a["householdId"] == household_id]
    
    breakdown = []
    total_fees = 0
    for acc in hh_accounts:
        fee_pct = float(acc["fees"].replace("%", ""))
        annual_cost = int(acc["balance"] * fee_pct / 100)
        total_fees += annual_cost
        breakdown.append({
            "account": acc["name"],
            "feePercent": fee_pct,
            "annualCost": annual_cost,
            "status": "high" if fee_pct > 1.5 else "moderate" if fee_pct > 0.5 else "good"
        })
    
    total_balance = sum(a["balance"] for a in hh_accounts) if hh_accounts else 1
    
    return {
        "householdId": household_id,
        "totalFees": total_fees,
        "feePercentage": round(total_fees / total_balance * 100, 2),
        "potentialSavings": int(total_fees * 0.65),
        "breakdown": breakdown,
    }


@router.post("/tax/{household_id}")
async def tax_analysis(household_id: str, current_user: dict = Depends(get_current_user)):
    """Run tax analysis on a household."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    return {
        "householdId": household_id,
        "unrealizedGains": 8750,
        "unrealizedLosses": 1250,
        "taxEfficiencyScore": 68,
        "harvestingOpportunities": [
            {"ticker": "INTC", "description": "Intel Corp - 52-week low", "loss": 450},
            {"ticker": "DIS", "description": "Walt Disney - sector rotation", "loss": 320},
        ],
    }


@router.post("/risk/{household_id}")
async def risk_analysis(household_id: str, current_user: dict = Depends(get_current_user)):
    """Run risk analysis on a household."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    return {
        "householdId": household_id,
        "riskScore": hh.get("riskScore", 65),
        "riskFactors": [
            {"name": "Concentration Risk", "description": "NVDA at 47% of taxable account", "level": "high"},
            {"name": "Sector Exposure", "description": "Tech sector overweight at 52%", "level": "moderate"},
            {"name": "Liquidity Risk", "description": "All positions highly liquid", "level": "low"},
            {"name": "Interest Rate Risk", "description": "Bond duration within target", "level": "low"},
        ],
    }


@router.post("/etf/{household_id}")
async def etf_builder(household_id: str, current_user: dict = Depends(get_current_user)):
    """Generate ETF portfolio recommendation."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    return {
        "householdId": household_id,
        "recommendations": [
            {"ticker": "VTI", "name": "Vanguard Total Stock Market", "category": "US Equity", "allocation": 40, "expenseRatio": 0.03},
            {"ticker": "VXUS", "name": "Vanguard Total International", "category": "Int'l Equity", "allocation": 20, "expenseRatio": 0.07},
            {"ticker": "BND", "name": "Vanguard Total Bond Market", "category": "Fixed Income", "allocation": 30, "expenseRatio": 0.03},
            {"ticker": "VNQ", "name": "Vanguard Real Estate", "category": "Real Estate", "allocation": 10, "expenseRatio": 0.12},
        ],
        "totalExpenseRatio": 0.05,
    }


@router.post("/ips/{household_id}")
async def ips_generator(household_id: str, current_user: dict = Depends(get_current_user)):
    """Generate Investment Policy Statement."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    members_count = len(hh.get("members", []))
    total_value = hh.get("totalValue", 0)
    
    return {
        "householdId": household_id,
        "clientProfile": f"{hh['name']} with {members_count} member(s). Total assets: ${total_value:,.2f}.",
        "objectives": "Long-term growth with moderate income generation. Primary goal is retirement funding with secondary goal of wealth preservation.",
        "riskTolerance": "Moderate risk tolerance. Client can accept temporary declines of up to 20% in pursuit of long-term growth.",
        "allocationGuidelines": "Target allocation: 60% equities, 30% fixed income, 10% alternatives. Rebalancing bands: ±5% from target.",
        "rebalancingPolicy": "Portfolio will be reviewed quarterly and rebalanced when any asset class deviates more than 5% from target allocation.",
    }
