"""B2C budget management endpoints (in-memory store — no DB migration required)."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_current_user
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-budgets"])

# Per-user budget limits stored in memory (resets on restart — fine for demo).
# Structure: {user_id_str: {category: monthly_limit}}
_budgets: dict[str, dict[str, float]] = {}

DEFAULT_LIMITS: dict[str, float] = {
    "groceries": 500.0,
    "dining": 200.0,
    "transport": 250.0,
    "entertainment": 100.0,
    "shopping": 300.0,
    "utilities": 350.0,
    "health": 100.0,
}

CAT_LABELS: dict[str, str] = {
    "groceries": "Groceries",
    "dining": "Dining",
    "transport": "Transport",
    "entertainment": "Entertainment",
    "shopping": "Shopping",
    "utilities": "Utilities",
    "health": "Health & Fitness",
}


class BudgetSetRequest(BaseModel):
    category: str
    monthly_limit: float


def _spending_from_demo() -> dict[str, float]:
    """Derive spending totals per category from demo transactions."""
    try:
        from backend.api.mock_b2c import DEMO_TRANSACTIONS
    except ImportError:
        from api.mock_b2c import DEMO_TRANSACTIONS  # type: ignore[no-redef]
    totals: dict[str, float] = {}
    for t in DEMO_TRANSACTIONS:
        if t["amount"] > 0:
            cat = t["category"]
            totals[cat] = totals.get(cat, 0.0) + t["amount"]
    return totals


def _build_budgets(user_id: str) -> list[dict]:
    """Build a budget list for the user, merging stored limits with demo spend."""
    user_limits = _budgets.get(user_id, {})
    spending = _spending_from_demo()
    result = []
    for cat, label in CAT_LABELS.items():
        limit = user_limits.get(cat, DEFAULT_LIMITS.get(cat, 200.0))
        current = round(spending.get(cat, 0.0), 2)
        pct = round((current / limit * 100) if limit > 0 else 0.0, 1)
        result.append({
            "category": cat,
            "label": label,
            "monthly_limit": limit,
            "current_spend": current,
            "pct": pct,
            "status": "over" if pct > 100 else "warning" if pct >= 80 else "ok",
        })
    return result


@router.get("/budgets")
async def get_budgets(current_user: User = Depends(get_current_user)):
    """Return all category budgets with current-month spend."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")
    return {"budgets": _build_budgets(str(current_user.id))}


@router.post("/budgets")
async def set_budget(
    body: BudgetSetRequest,
    current_user: User = Depends(get_current_user),
):
    """Set or update a monthly budget limit for a spending category."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    if body.monthly_limit < 0:
        raise HTTPException(status_code=400, detail="Monthly limit must be >= 0")
    if body.category not in CAT_LABELS:
        raise HTTPException(status_code=400, detail=f"Unknown category: {body.category}")

    uid = str(current_user.id)
    _budgets.setdefault(uid, {})[body.category] = body.monthly_limit

    spending = _spending_from_demo()
    current = round(spending.get(body.category, 0.0), 2)
    pct = round((current / body.monthly_limit * 100) if body.monthly_limit > 0 else 0.0, 1)
    return {
        "category": body.category,
        "label": CAT_LABELS[body.category],
        "monthly_limit": body.monthly_limit,
        "current_spend": current,
        "pct": pct,
        "status": "over" if pct > 100 else "warning" if pct >= 80 else "ok",
    }
