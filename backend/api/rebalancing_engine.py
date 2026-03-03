"""
Automated Rebalancing Engine — Threshold-based drift detection,
tax-aware trade generation, and Review & Release workflow.
"""
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rebalancing", tags=["Rebalancing Engine"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)

ASSET_CLASSES = ["US Large Cap", "US Mid Cap", "US Small Cap", "International Developed",
                 "Emerging Markets", "US Aggregate Bond", "Short-Term Bond",
                 "TIPS", "High Yield", "Cash"]


def _drift_account(model_target: Dict[str, float]) -> Dict[str, Any]:
    current = {}
    for cls, target in model_target.items():
        drift = random.uniform(-4, 5)
        current[cls] = round(max(0, target + drift), 1)
    total = sum(current.values())
    if total > 0:
        current = {k: round(v / total * 100, 1) for k, v in current.items()}
    return current


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/drift")
async def get_drift_summary(current_user: dict = Depends(get_current_user)):
    model_targets = {
        "US Large Cap": 30, "US Mid Cap": 10, "US Small Cap": 8,
        "International Developed": 15, "Emerging Markets": 5,
        "US Aggregate Bond": 20, "Short-Term Bond": 5, "TIPS": 3,
        "High Yield": 2, "Cash": 2,
    }
    accounts = []
    for i in range(12):
        current = _drift_account(model_targets)
        max_drift = max(abs(current.get(k, 0) - model_targets.get(k, 0)) for k in model_targets)
        needs_rebalance = max_drift > 3.0
        accounts.append({
            "account_id": f"acct-{i+1:03d}",
            "account_name": ["Williams Trust", "Williams IRA", "Williams Roth",
                           "Anderson Joint", "Anderson 401k", "Martinez Portfolio",
                           "Park 529", "Chen Retirement", "Thompson Brokerage",
                           "Davis SEP IRA", "Wilson Joint", "Brown Roth"][i],
            "model_name": "Conservative Growth" if i < 3 else "Moderate" if i < 6 else "Growth",
            "balance": round(random.uniform(200000, 3500000), 2),
            "max_drift_pct": round(max_drift, 2),
            "needs_rebalance": needs_rebalance,
            "current_allocation": current,
            "target_allocation": model_targets,
            "last_rebalanced": (_now - timedelta(days=random.randint(15, 120))).strftime("%Y-%m-%d"),
        })
    flagged = [a for a in accounts if a["needs_rebalance"]]
    return {
        "accounts": accounts,
        "total_accounts": len(accounts),
        "flagged_count": len(flagged),
        "drift_threshold": 3.0,
        "total_aum": round(sum(a["balance"] for a in accounts), 2),
    }


@router.post("/generate-trades")
async def generate_trades(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    account_ids = request.get("account_ids", [])
    tax_aware = request.get("tax_aware", True)
    trades = []
    for acct_id in account_ids[:5]:
        n_trades = random.randint(3, 8)
        for _ in range(n_trades):
            action = random.choice(["Buy", "Sell"])
            symbol = random.choice(["VTI", "VXUS", "BND", "SCHD", "VOO", "IEMG", "VTIP", "AGG", "QQQ", "IWM"])
            shares = round(random.uniform(5, 200), 2)
            price = round(random.uniform(50, 400), 2)
            amount = round(shares * price, 2)
            tax_impact = round(random.uniform(-2000, 5000), 2) if action == "Sell" else 0
            trades.append({
                "id": f"trade-{uuid.uuid4().hex[:8]}",
                "account_id": acct_id,
                "action": action,
                "symbol": symbol,
                "shares": shares,
                "estimated_price": price,
                "estimated_amount": amount,
                "tax_impact": tax_impact if tax_aware else None,
                "lot_method": "Highest Cost" if tax_aware and action == "Sell" else "FIFO",
                "reason": random.choice([
                    "Reduce overweight position",
                    "Increase to target allocation",
                    "Tax-loss harvest replacement",
                    "Drift correction",
                    "Cash raise for withdrawal",
                ]),
                "status": "pending_review",
            })
    return {
        "trades": trades,
        "total_trades": len(trades),
        "total_buy_amount": round(sum(t["estimated_amount"] for t in trades if t["action"] == "Buy"), 2),
        "total_sell_amount": round(sum(t["estimated_amount"] for t in trades if t["action"] == "Sell"), 2),
        "total_tax_impact": round(sum(t.get("tax_impact", 0) or 0 for t in trades), 2),
        "tax_aware": tax_aware,
    }


@router.post("/execute")
async def execute_trades(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    trade_ids = request.get("trade_ids", [])
    return {
        "executed": len(trade_ids),
        "status": "submitted",
        "batch_id": f"batch-{uuid.uuid4().hex[:8]}",
        "submitted_at": _now.isoformat(),
        "estimated_settlement": (_now + timedelta(days=2)).strftime("%Y-%m-%d"),
    }


@router.get("/history")
async def rebalance_history(current_user: dict = Depends(get_current_user)):
    history = []
    for i in range(10):
        history.append({
            "id": f"reb-{i:03d}",
            "date": (_now - timedelta(days=i * 15)).strftime("%Y-%m-%d"),
            "accounts_rebalanced": random.randint(3, 12),
            "trades_executed": random.randint(15, 60),
            "total_amount": round(random.uniform(100000, 800000), 2),
            "tax_savings": round(random.uniform(500, 8000), 2),
            "initiated_by": "Leslie Thompson",
            "status": "completed",
        })
    return {"history": history}
