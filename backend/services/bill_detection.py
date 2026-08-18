"""
Recurring bill detection service.

Analyzes a list of transactions to identify recurring charges by merchant
and approximate billing frequency (weekly, monthly, annual).
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)


def _approx_days(delta_days: float) -> str | None:
    """Map an average interval in days to a frequency label."""
    if delta_days <= 0:
        return None
    if 5 <= delta_days <= 9:
        return "weekly"
    if 25 <= delta_days <= 35:
        return "monthly"
    if 85 <= delta_days <= 95:
        return "quarterly"
    if 350 <= delta_days <= 380:
        return "annual"
    return None


def _next_billing_date(last_date: date, freq: str) -> date:
    if freq == "weekly":
        return last_date + timedelta(weeks=1)
    if freq == "monthly":
        month = last_date.month + 1
        year = last_date.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        return last_date.replace(year=year, month=month)
    if freq == "quarterly":
        month = last_date.month + 3
        year = last_date.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        return last_date.replace(year=year, month=month)
    if freq == "annual":
        return last_date.replace(year=last_date.year + 1)
    return last_date + timedelta(days=30)


def _monthly_equivalent(amount: float, freq: str) -> float:
    if freq == "weekly":
        return round(amount * 52 / 12, 2)
    if freq == "quarterly":
        return round(amount / 3, 2)
    if freq == "annual":
        return round(amount / 12, 2)
    return amount  # monthly


def detect_recurring(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Detect recurring bills from a transaction list.

    Args:
        transactions: list of transaction dicts with keys:
            id, date (YYYY-MM-DD), merchant, amount, category

    Returns:
        list of recurring bill dicts sorted by monthly_equivalent descending.
    """
    # Group by merchant (case-insensitive)
    by_merchant: dict[str, list[dict]] = {}
    for t in transactions:
        if t.get("amount", 0) <= 0:
            continue
        key = t.get("merchant", "").strip().lower()
        if not key:
            continue
        by_merchant.setdefault(key, []).append(t)

    bills: list[dict] = []
    for merchant_key, txns in by_merchant.items():
        if len(txns) < 2:
            continue

        # Sort by date ascending
        sorted_txns = sorted(txns, key=lambda x: x.get("date", ""))
        dates = [date.fromisoformat(t["date"]) for t in sorted_txns]

        # Compute average interval in days
        intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        avg_interval = sum(intervals) / len(intervals)

        freq = _approx_days(avg_interval)
        if freq is None:
            continue

        # Use median amount (ignore outliers)
        amounts = sorted(float(t["amount"]) for t in sorted_txns)
        median_amount = amounts[len(amounts) // 2]

        last = dates[-1]
        next_date = _next_billing_date(last, freq)
        monthly_eq = _monthly_equivalent(median_amount, freq)

        bills.append({
            "merchant": sorted_txns[-1].get("merchant"),
            "category": sorted_txns[-1].get("category", "other"),
            "amount": round(median_amount, 2),
            "frequency": freq,
            "next_expected_date": next_date.isoformat(),
            "monthly_equivalent": monthly_eq,
            "occurrences": len(sorted_txns),
        })

    bills.sort(key=lambda x: x["monthly_equivalent"], reverse=True)
    return bills
