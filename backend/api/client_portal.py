"""
Client portal endpoints — read-only views for clients.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/v1/portal", tags=["Client Portal"])


@router.get("/summary/{client_id}")
async def get_client_portal_summary(client_id: str):
    """Client-facing portfolio summary."""
    return {
        "client_name": "Nicole Wilson",
        "advisor_name": "Leslie Wilson",
        "firm_name": "IAB Advisors",
        "last_updated": datetime.now().isoformat(),
        "portfolio_summary": {
            "total_value": 54905.58,
            "ytd_return": 2.15,
            "ytd_return_dollar": 1155.42,
            "inception_date": "2024-03-15",
        },
        "allocation": {
            "equity": {"target": 60, "current": 100, "label": "Stocks"},
            "fixed_income": {"target": 30, "current": 0, "label": "Bonds"},
            "alternatives": {"target": 5, "current": 0, "label": "Real Estate & Other"},
            "cash": {"target": 5, "current": 0, "label": "Cash"},
        },
        "recent_activity": [
            {"date": "2025-12-15", "description": "Quarterly review completed", "type": "review"},
            {"date": "2025-11-15", "description": "Tax-loss harvest: AMRN → XBI", "type": "trade"},
            {"date": "2025-10-01", "description": "Quarterly report generated", "type": "report"},
        ],
        "documents": [
            {"name": "Investment Policy Statement", "date": "2025-06-01", "type": "ips"},
            {"name": "Q4 2025 Performance Report", "date": "2026-01-15", "type": "report"},
            {"name": "Q3 2025 Performance Report", "date": "2025-10-15", "type": "report"},
        ],
        "next_review": "2026-03-15",
        "advisor_message": "Looking forward to our Q1 review. We'll discuss the rebalancing plan we've been working on.",
    }
