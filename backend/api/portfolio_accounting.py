"""
Portfolio Accounting Engine — TWRR/MWRR performance calculation,
daily NAV, benchmark-relative attribution, and performance reporting.
"""
import math
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/performance", tags=["Portfolio Accounting"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user


# ---------------------------------------------------------------------------
# TWRR / MWRR Calculation Helpers
# ---------------------------------------------------------------------------

def _twrr(daily_returns: List[float]) -> float:
    """Time-weighted rate of return: product of (1 + r_i) - 1."""
    product = 1.0
    for r in daily_returns:
        product *= (1 + r)
    return product - 1


def _mwrr_approx(cashflows: List[Dict], ending_value: float) -> float:
    """Modified Dietz approximation for money-weighted return."""
    if not cashflows:
        return 0.0
    beginning_value = cashflows[0].get("value", 0)
    total_cf = sum(cf.get("amount", 0) for cf in cashflows[1:])
    weighted_cf = 0.0
    total_days = max((len(cashflows) - 1), 1)
    for i, cf in enumerate(cashflows[1:], 1):
        weight = (total_days - i) / total_days
        weighted_cf += cf.get("amount", 0) * weight
    denominator = beginning_value + weighted_cf
    if denominator == 0:
        return 0.0
    return (ending_value - beginning_value - total_cf) / denominator


# ---------------------------------------------------------------------------
# Mock Data Generators
# ---------------------------------------------------------------------------

_now = datetime.now(timezone.utc)


def _generate_daily_nav(days: int = 365, start_value: float = 1000000) -> List[Dict]:
    """Generate realistic daily NAV series with market-like volatility."""
    nav_series = []
    value = start_value
    annual_return = random.uniform(0.06, 0.14)
    daily_drift = annual_return / 252
    daily_vol = random.uniform(0.008, 0.015)

    for d in range(days):
        date = (_now - timedelta(days=days - d)).strftime("%Y-%m-%d")
        daily_return = random.gauss(daily_drift, daily_vol)
        value *= (1 + daily_return)
        nav_series.append({
            "date": date,
            "nav": round(value, 2),
            "daily_return": round(daily_return * 100, 4),
            "cumulative_return": round((value / start_value - 1) * 100, 2),
        })
    return nav_series


def _generate_benchmark_series(days: int = 365) -> List[Dict]:
    value = 100.0
    series = []
    for d in range(days):
        date = (_now - timedelta(days=days - d)).strftime("%Y-%m-%d")
        value *= (1 + random.gauss(0.0004, 0.011))
        series.append({"date": date, "value": round(value, 2)})
    return series


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/account/{account_id}")
async def get_account_performance(
    account_id: str,
    period: str = Query("1Y", regex="^(1M|3M|6M|YTD|1Y|3Y|5Y|ALL)$"),
    current_user: dict = Depends(get_current_user),
):
    days_map = {"1M": 30, "3M": 90, "6M": 180, "YTD": 60, "1Y": 365, "3Y": 1095, "5Y": 1825, "ALL": 1825}
    days = days_map.get(period, 365)
    start_val = random.uniform(500000, 3000000)
    nav = _generate_daily_nav(days, start_val)
    end_val = nav[-1]["nav"] if nav else start_val

    daily_returns = [n["daily_return"] / 100 for n in nav]
    twrr = _twrr(daily_returns)
    annualized = (1 + twrr) ** (252 / max(len(nav), 1)) - 1 if len(nav) > 0 else 0

    returns_list = [n["daily_return"] / 100 for n in nav]
    vol = (sum((r - sum(returns_list)/max(len(returns_list),1))**2 for r in returns_list) / max(len(returns_list)-1, 1)) ** 0.5
    sharpe = (annualized - 0.045) / (vol * math.sqrt(252)) if vol > 0 else 0

    max_dd = 0
    peak = nav[0]["nav"] if nav else start_val
    for n in nav:
        if n["nav"] > peak:
            peak = n["nav"]
        dd = (n["nav"] - peak) / peak
        if dd < max_dd:
            max_dd = dd

    return {
        "account_id": account_id,
        "period": period,
        "beginning_value": round(start_val, 2),
        "ending_value": round(end_val, 2),
        "net_change": round(end_val - start_val, 2),
        "twrr": round(twrr * 100, 2),
        "twrr_annualized": round(annualized * 100, 2),
        "mwrr": round(twrr * 100 * random.uniform(0.92, 1.08), 2),
        "benchmark_return": round(random.uniform(5, 15), 2),
        "alpha": round((annualized * 100) - random.uniform(8, 12), 2),
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown": round(max_dd * 100, 2),
        "volatility": round(vol * math.sqrt(252) * 100, 2),
        "beta": round(random.uniform(0.7, 1.3), 2),
        "nav_series": nav[-90:],
    }


@router.get("/household/{household_id}")
async def get_household_performance(
    household_id: str,
    period: str = Query("1Y"),
    current_user: dict = Depends(get_current_user),
):
    accounts = [
        {"id": "acct-001", "name": "Family Trust", "balance": 2450000, "return_pct": 11.2},
        {"id": "acct-002", "name": "Traditional IRA", "balance": 890000, "return_pct": 9.8},
        {"id": "acct-003", "name": "Roth IRA", "balance": 425000, "return_pct": 13.5},
    ]
    total = sum(a["balance"] for a in accounts)
    weighted_return = sum(a["balance"] * a["return_pct"] for a in accounts) / total if total else 0

    return {
        "household_id": household_id,
        "period": period,
        "total_value": total,
        "weighted_return": round(weighted_return, 2),
        "accounts": accounts,
        "allocation": {
            "US Equity": 42.5, "International Equity": 15.2,
            "Fixed Income": 28.1, "Alternatives": 8.7, "Cash": 5.5,
        },
        "benchmark_return": round(random.uniform(8, 12), 2),
    }


@router.get("/firm/summary")
async def get_firm_performance(current_user: dict = Depends(get_current_user)):
    return {
        "total_aum": 48750000,
        "total_households": 32,
        "total_accounts": 87,
        "firm_return_ytd": round(random.uniform(7, 14), 2),
        "benchmark_return_ytd": round(random.uniform(8, 12), 2),
        "top_performers": [
            {"household": "Martinez Family", "return_pct": 18.2, "aum": 3200000},
            {"household": "Williams Trust", "return_pct": 14.5, "aum": 3765000},
            {"household": "Anderson Joint", "return_pct": 13.1, "aum": 2525000},
        ],
        "underperformers": [
            {"household": "Park Education", "return_pct": 2.1, "aum": 185000},
            {"household": "Chen Retirement", "return_pct": 4.3, "aum": 720000},
        ],
        "asset_allocation": {
            "US Equity": 41.2, "International Equity": 14.8,
            "Fixed Income": 26.5, "Alternatives": 10.2, "Cash": 7.3,
        },
    }


@router.get("/attribution/{account_id}")
async def get_performance_attribution(
    account_id: str,
    period: str = Query("1Y"),
    current_user: dict = Depends(get_current_user),
):
    sectors = ["Technology", "Healthcare", "Financials", "Consumer Discretionary",
               "Consumer Staples", "Energy", "Industrials", "Real Estate", "Utilities"]
    attribution = []
    for sector in sectors:
        port_weight = round(random.uniform(3, 25), 1)
        bench_weight = round(random.uniform(3, 20), 1)
        port_return = round(random.uniform(-5, 25), 2)
        bench_return = round(random.uniform(-3, 20), 2)
        allocation_effect = round((port_weight - bench_weight) / 100 * (bench_return - 10), 4)
        selection_effect = round(port_weight / 100 * (port_return - bench_return), 4)
        attribution.append({
            "sector": sector,
            "portfolio_weight": port_weight,
            "benchmark_weight": bench_weight,
            "portfolio_return": port_return,
            "benchmark_return": bench_return,
            "allocation_effect": round(allocation_effect * 100, 2),
            "selection_effect": round(selection_effect * 100, 2),
            "total_effect": round((allocation_effect + selection_effect) * 100, 2),
        })
    total_alpha = sum(a["total_effect"] for a in attribution)
    return {
        "account_id": account_id,
        "period": period,
        "model": "Brinson-Fachler",
        "total_alpha": round(total_alpha, 2),
        "attribution": attribution,
    }
