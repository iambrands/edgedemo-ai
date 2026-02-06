"""
Billing and fee management endpoints.
"""

from fastapi import APIRouter
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/billing", tags=["Billing"])


@router.get("/fee-schedules")
async def get_fee_schedules():
    """Get configured fee schedules."""
    return {
        "default_schedule": [
            {"tier": "Tier 1", "aum_min": 0, "aum_max": 250000, "annual_rate_bps": 125, "annual_rate_pct": 1.25},
            {"tier": "Tier 2", "aum_min": 250001, "aum_max": 500000, "annual_rate_bps": 100, "annual_rate_pct": 1.00},
            {"tier": "Tier 3", "aum_min": 500001, "aum_max": 1000000, "annual_rate_bps": 85, "annual_rate_pct": 0.85},
            {"tier": "Tier 4", "aum_min": 1000001, "aum_max": None, "annual_rate_bps": 65, "annual_rate_pct": 0.65},
        ],
        "billing_method": "advance",
        "billing_frequency": "quarterly",
        "minimum_fee": 500,
    }


@router.get("/calculate/{household_id}")
async def calculate_fees(household_id: str, quarter: Optional[str] = "Q1 2026"):
    """Calculate fees for a household based on AUM and fee schedule."""
    return {
        "household_id": household_id,
        "household_name": "Wilson Family",
        "quarter": quarter,
        "total_aum": 54905.58,
        "applicable_tier": "Tier 1",
        "annual_rate_bps": 125,
        "quarterly_fee": 171.58,
        "annual_fee": 686.32,
        "by_account": [
            {"account": "NW Mutual VA (***4532)", "aum": 42105.00, "fee": 131.58},
            {"account": "Robinhood (***8821)", "aum": 8012.00, "fee": 25.04},
            {"account": "E*TRADE (***3390)", "aum": 4788.58, "fee": 14.96},
        ],
        "fee_disclosure": "IAB Advisors charges a fee-only advisory fee based on assets under management. No commissions or 12b-1 fees are received.",
    }


@router.get("/invoices")
async def get_invoices(household_id: Optional[str] = None, limit: int = 20):
    """Get billing invoices."""
    return [
        {"id": "inv_001", "household_name": "Wilson Family", "quarter": "Q4 2025", "amount": 171.58, "status": "paid", "due_date": "2025-10-01", "paid_date": "2025-10-01"},
        {"id": "inv_002", "household_name": "Johnson Household", "quarter": "Q4 2025", "amount": 781.41, "status": "paid", "due_date": "2025-10-01", "paid_date": "2025-10-03"},
    ]


@router.get("/revenue-summary")
async def get_revenue_summary():
    """Get firm-wide revenue summary."""
    return {
        "current_quarter": {"total_revenue": 3125.45, "total_aum": 1247532.45, "effective_rate_bps": 100, "households_billed": 12},
        "ytd": {
            "total_revenue": 3125.45,
            "quarterly_trend": [
                {"quarter": "Q1 2025", "revenue": 2845.00},
                {"quarter": "Q2 2025", "revenue": 2920.00},
                {"quarter": "Q3 2025", "revenue": 3010.00},
                {"quarter": "Q4 2025", "revenue": 3125.45},
            ],
        },
    }
