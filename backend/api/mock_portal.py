"""
Mock Client Portal API endpoints — Nicole Wilson / Wilson Household.
Provides realistic demo data sourced from the RIA dashboard so the client
portal shows a coherent view of her household.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import hashlib
import uuid as _uuid

router = APIRouter(prefix="/api/v1/portal", tags=["Client Portal (Demo)"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PortalLoginRequest(BaseModel):
    email: str
    password: str


class PortalLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    client_name: str
    firm_name: Optional[str] = None


def _tok(seed: str) -> str:
    return hashlib.sha256(f"demo-{seed}-{_uuid.uuid4().hex[:8]}".encode()).hexdigest()


# ===== Nicole Wilson – Wilson Household data ================================

_CLIENT_NAME = "Nicole Wilson"
_ADVISOR_NAME = "Leslie Wilson, CFP\u00ae"
_FIRM_NAME = "IAB Advisors"

_ACCOUNTS = [
    {
        "id": "acc-001",
        "account_name": "NW Mutual VA IRA (***4532)",
        "account_type": "Variable Annuity IRA",
        "custodian": "Northwestern Mutual",
        "current_value": 27891.34,
        "tax_type": "Tax-Deferred",
    },
    {
        "id": "acc-002",
        "account_name": "Robinhood Individual (***8821)",
        "account_type": "Individual Brokerage",
        "custodian": "Robinhood",
        "current_value": 18234.56,
        "tax_type": "Taxable",
    },
    {
        "id": "acc-003",
        "account_name": "E*TRADE 401(k) (***3390)",
        "account_type": "401(k)",
        "custodian": "E*TRADE / Morgan Stanley",
        "current_value": 8779.68,
        "tax_type": "Tax-Deferred",
    },
]

_TOTAL_VALUE = sum(a["current_value"] for a in _ACCOUNTS)  # $54,905.58

_POSITIONS = {
    "acc-001": [
        {"symbol": "NWMVA", "name": "Index 500 Fund (BlackRock)", "quantity": 1, "price": 4631.55, "value": 4631.55, "cost_basis": 4200.00, "gain_loss": 431.55, "gain_pct": 10.27, "asset_class": "Large Cap Equity"},
        {"symbol": "NWMSB", "name": "Select Bond Fund (Allspring)", "quantity": 1, "price": 5473.65, "value": 5473.65, "cost_basis": 5600.00, "gain_loss": -126.35, "gain_pct": -2.26, "asset_class": "Fixed Income"},
        {"symbol": "NWMIG", "name": "Intl Growth Fund", "quantity": 1, "price": 3890.14, "value": 3890.14, "cost_basis": 3500.00, "gain_loss": 390.14, "gain_pct": 11.15, "asset_class": "International Equity"},
        {"symbol": "NWMRE", "name": "Real Estate Securities Fund", "quantity": 1, "price": 2420.00, "value": 2420.00, "cost_basis": 2600.00, "gain_loss": -180.00, "gain_pct": -6.92, "asset_class": "Real Estate"},
        {"symbol": "NWMHYB", "name": "High Yield Bond Fund", "quantity": 1, "price": 3176.00, "value": 3176.00, "cost_basis": 3100.00, "gain_loss": 76.00, "gain_pct": 2.45, "asset_class": "Fixed Income"},
        {"symbol": "OTHER", "name": "Other Sub-Account Funds (14)", "quantity": 1, "price": 8300.00, "value": 8300.00, "cost_basis": 8200.00, "gain_loss": 100.00, "gain_pct": 1.22, "asset_class": "Mixed"},
    ],
    "acc-002": [
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "quantity": 65, "price": 132.10, "value": 8586.50, "cost_basis": 4800.00, "gain_loss": 3786.50, "gain_pct": 78.89, "asset_class": "Large Cap Equity"},
        {"symbol": "AAPL", "name": "Apple Inc.", "quantity": 25, "price": 185.50, "value": 4637.50, "cost_basis": 4000.00, "gain_loss": 637.50, "gain_pct": 15.94, "asset_class": "Large Cap Equity"},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "quantity": 10, "price": 337.45, "value": 3374.50, "cost_basis": 3200.00, "gain_loss": 174.50, "gain_pct": 5.45, "asset_class": "Large Cap Equity"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "quantity": 8, "price": 204.51, "value": 1636.06, "cost_basis": 2100.00, "gain_loss": -463.94, "gain_pct": -22.09, "asset_class": "Large Cap Equity"},
    ],
    "acc-003": [
        {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "quantity": 20, "price": 239.43, "value": 4788.60, "cost_basis": 4500.00, "gain_loss": 288.60, "gain_pct": 6.41, "asset_class": "Broad Market Equity"},
        {"symbol": "VXUS", "name": "Vanguard Total Intl Stock ETF", "quantity": 30, "price": 59.20, "value": 1776.00, "cost_basis": 1650.00, "gain_loss": 126.00, "gain_pct": 7.64, "asset_class": "International Equity"},
        {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "quantity": 25, "price": 88.60, "value": 2215.08, "cost_basis": 2300.00, "gain_loss": -84.92, "gain_pct": -3.69, "asset_class": "Fixed Income"},
    ],
}

_NUDGES = [
    {
        "id": "nudge-001",
        "nudge_type": "concentration",
        "title": "NVDA Concentration Warning",
        "message": "NVIDIA makes up 47% of your Robinhood account. This concentrated position increases your risk. Your advisor recommends diversifying a portion into broad-market ETFs.",
        "action_url": "/portal/dashboard",
        "action_label": "View Details",
        "priority": 1,
        "status": "pending",
        "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
    },
    {
        "id": "nudge-002",
        "nudge_type": "fee",
        "title": "High-Fee Account Review",
        "message": "Your NW Mutual Variable Annuity charges 2.35% in total fees. Your advisor is evaluating a 1035 exchange to a lower-cost option after the surrender period ends.",
        "action_url": "/portal/dashboard",
        "action_label": "Learn More",
        "priority": 2,
        "status": "pending",
        "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
    },
    {
        "id": "nudge-003",
        "nudge_type": "planning",
        "title": "529 Plan Update Needed",
        "message": "With Emma starting college in Fall 2028, it's time to shift the 529 allocation to a more conservative mix. Your advisor has reallocation options ready.",
        "action_url": "/portal/goals",
        "action_label": "View Goals",
        "priority": 2,
        "status": "pending",
        "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
    },
]

_GOALS = [
    {
        "id": "goal-001",
        "goal_type": "retirement",
        "name": "Retirement Fund",
        "target_amount": 750000,
        "current_amount": 54905.58,
        "target_date": "2050-01-01T00:00:00",
        "monthly_contribution": 1500,
        "progress_pct": 0.073,
        "on_track": True,
        "notes": "Combined household retirement savings. Target age 65.",
        "created_at": "2024-06-01T10:00:00",
    },
    {
        "id": "goal-002",
        "goal_type": "education",
        "name": "Emma's College Fund",
        "target_amount": 120000,
        "current_amount": 22000,
        "target_date": "2028-09-01T00:00:00",
        "monthly_contribution": 800,
        "progress_pct": 0.183,
        "on_track": False,
        "notes": "529 plan for Emma. Starting college Fall 2028. Need to shift to conservative allocation.",
        "created_at": "2024-01-15T10:00:00",
    },
    {
        "id": "goal-003",
        "goal_type": "emergency_fund",
        "name": "Emergency Reserve",
        "target_amount": 30000,
        "current_amount": 18500,
        "target_date": "2026-12-31T00:00:00",
        "monthly_contribution": 500,
        "progress_pct": 0.617,
        "on_track": True,
        "notes": "6-month expense reserve. Especially important with mother moving in.",
        "created_at": "2025-03-01T10:00:00",
    },
]

_NARRATIVES = [
    {
        "id": "nar-001",
        "narrative_type": "quarterly",
        "title": "Q4 2025 Portfolio Review",
        "content": "Nicole, your portfolio gained 4.23% in Q4 2025, outperforming the blended benchmark by 0.36%. Your total household value stands at $54,905.58 across three accounts.\n\nKey highlights:\n\u2022 Your NVIDIA position in the Robinhood account was the top performer (+78.9% since purchase)\n\u2022 The NW Mutual VA IRA returned 2.1% after fees, underperforming the benchmark by 1.5%\n\u2022 Your E*TRADE 401(k) delivered solid returns through its diversified ETF allocation\n\nAreas of attention:\n\u2022 NVIDIA now represents 47% of your Robinhood account \u2014 we recommend reducing this concentration\n\u2022 The NW Mutual VA fees (2.35%) are significantly above average \u2014 we\u2019re evaluating lower-cost alternatives\n\u2022 Your overall allocation is equity-heavy; adding fixed income would better match your moderate risk profile",
        "content_html": None,
        "period_start": "2025-10-01T00:00:00",
        "period_end": "2025-12-31T00:00:00",
        "is_read": False,
        "created_at": "2026-01-15T10:00:00",
    },
    {
        "id": "nar-002",
        "narrative_type": "meeting_summary",
        "title": "Q1 2026 Review Meeting Summary",
        "content": "Summary of your review meeting on February 4, 2026 with Leslie Wilson, CFP\u00ae.\n\nTopics discussed:\n\u2022 Portfolio performance review (+2.15% YTD)\n\u2022 Emma\u2019s college planning \u2014 529 reallocation to conservative mix\n\u2022 Tax-loss harvesting opportunities (~$3,200 identified in TSLA and NWMRE)\n\u2022 Estate planning update with your mother moving in\n\nAction items:\n\u2022 Prepare 529 reallocation options (Due: Feb 11)\n\u2022 Execute tax-loss harvesting trades (In progress)\n\u2022 Schedule estate planning consultation (Completed)\n\nNext meeting: May 2026 (Q2 Review)",
        "content_html": None,
        "period_start": "2026-02-04T00:00:00",
        "period_end": "2026-02-04T00:00:00",
        "is_read": False,
        "created_at": "2026-02-04T14:00:00",
    },
]

_DOCUMENTS = [
    {
        "id": "doc-001",
        "document_type": "report",
        "title": "Q4 2025 Performance Report",
        "period": "Q4 2025",
        "file_size": 342000,
        "is_read": True,
        "created_at": "2026-01-15T10:00:00",
    },
    {
        "id": "doc-002",
        "document_type": "statement",
        "title": "January 2026 Account Statement",
        "period": "January 2026",
        "file_size": 198000,
        "is_read": True,
        "created_at": "2026-02-01T10:00:00",
    },
    {
        "id": "doc-003",
        "document_type": "tax",
        "title": "2025 Form 1099-DIV (Robinhood)",
        "period": "Tax Year 2025",
        "file_size": 85000,
        "is_read": False,
        "created_at": "2026-01-31T10:00:00",
    },
    {
        "id": "doc-004",
        "document_type": "tax",
        "title": "2025 Form 1099-B (Robinhood)",
        "period": "Tax Year 2025",
        "file_size": 112000,
        "is_read": False,
        "created_at": "2026-01-31T10:00:00",
    },
    {
        "id": "doc-005",
        "document_type": "agreement",
        "title": "Investment Advisory Agreement",
        "period": None,
        "file_size": 425000,
        "is_read": True,
        "created_at": "2024-06-01T10:00:00",
    },
    {
        "id": "doc-006",
        "document_type": "report",
        "title": "Fee Disclosure Schedule 2026",
        "period": "2026",
        "file_size": 67000,
        "is_read": False,
        "created_at": "2026-01-02T10:00:00",
    },
]


# ===== AUTH =================================================================

@router.post("/auth/login", response_model=PortalLoginResponse)
async def portal_login(req: PortalLoginRequest):
    name_parts = req.email.split("@")[0].replace(".", " ").title()
    return PortalLoginResponse(
        access_token=_tok(req.email),
        refresh_token=_tok(req.email + "-r"),
        expires_in=86400,
        client_name=name_parts if name_parts else _CLIENT_NAME,
        firm_name=_FIRM_NAME,
    )


@router.post("/auth/refresh", response_model=PortalLoginResponse)
async def portal_refresh():
    return PortalLoginResponse(
        access_token=_tok("refresh"),
        refresh_token=_tok("refresh-r"),
        expires_in=86400,
        client_name=_CLIENT_NAME,
        firm_name=_FIRM_NAME,
    )


@router.post("/auth/logout")
async def portal_logout():
    return {"message": "Logged out successfully"}


# ===== DASHBOARD ============================================================

@router.get("/dashboard")
async def get_dashboard():
    return {
        "client_name": _CLIENT_NAME,
        "advisor_name": _ADVISOR_NAME,
        "firm_name": _FIRM_NAME,
        "total_value": _TOTAL_VALUE,
        "ytd_return": 0.0215,
        "ytd_return_dollar": _TOTAL_VALUE * 0.0215,
        "accounts": _ACCOUNTS,
        "pending_nudges": len([n for n in _NUDGES if n["status"] == "pending"]),
        "unread_narratives": len([n for n in _NARRATIVES if not n["is_read"]]),
        "active_goals": len(_GOALS),
        "last_updated": datetime.utcnow().isoformat(),
    }


# ===== ACCOUNTS & POSITIONS ================================================

@router.get("/accounts/{account_id}/positions")
async def get_positions(account_id: str):
    return _POSITIONS.get(account_id, [])


# ===== NUDGES ===============================================================

@router.get("/nudges")
async def get_nudges():
    return _NUDGES


@router.post("/nudges/{nudge_id}/dismiss")
async def dismiss_nudge(nudge_id: str):
    return {"ok": True}


@router.post("/nudges/{nudge_id}/view")
async def view_nudge(nudge_id: str):
    return {"ok": True}


@router.post("/nudges/{nudge_id}/act")
async def act_on_nudge(nudge_id: str):
    return {"ok": True}


# ===== GOALS ================================================================

@router.get("/goals")
async def get_goals():
    return _GOALS


@router.post("/goals")
async def create_goal(data: dict):
    return {
        "id": str(_uuid.uuid4()),
        "goal_type": data.get("goal_type", "custom"),
        "name": data.get("name", "New Goal"),
        "target_amount": data.get("target_amount", 100000),
        "current_amount": 0,
        "target_date": data.get("target_date", "2035-01-01T00:00:00"),
        "monthly_contribution": data.get("monthly_contribution"),
        "progress_pct": 0,
        "on_track": True,
        "notes": data.get("notes"),
        "created_at": datetime.utcnow().isoformat(),
    }


@router.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, data: dict):
    for g in _GOALS:
        if g["id"] == goal_id:
            g.update({k: v for k, v in data.items() if v is not None})
            return g
    return {"error": "Goal not found"}


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    return {"ok": True, "message": "Goal deleted"}


# ===== NARRATIVES ===========================================================

@router.get("/narratives")
async def get_narratives():
    return _NARRATIVES


@router.post("/narratives/{narrative_id}/read")
async def mark_narrative_read(narrative_id: str):
    return {"ok": True}


# ===== DOCUMENTS ============================================================

@router.get("/documents")
async def get_documents(document_type: str | None = None):
    if document_type:
        return [d for d in _DOCUMENTS if d["document_type"] == document_type]
    return _DOCUMENTS


@router.post("/documents/{document_id}/read")
async def mark_document_read(document_id: str):
    return {"ok": True}


# ===== BRANDING & PREFERENCES ===============================================

@router.get("/config/branding")
async def get_branding():
    return {
        "logo_url": None,
        "primary_color": "#1a56db",
        "secondary_color": "#7c3aed",
        "accent_color": "#059669",
        "font_family": "Inter",
        "portal_title": "IAB Advisors Client Portal",
        "footer_text": "IAB Advisors LLC \u00b7 Registered Investment Advisor",
        "disclaimer_text": "Investment advisory services offered through IAB Advisors LLC, a registered investment advisor. Past performance is not indicative of future results.",
    }


@router.get("/preferences")
async def get_preferences():
    return {
        "email_narratives": True,
        "email_nudges": True,
        "email_documents": True,
    }


@router.patch("/preferences")
async def update_preferences(data: dict):
    return {
        "email_narratives": data.get("email_narratives", True),
        "email_nudges": data.get("email_nudges", True),
        "email_documents": data.get("email_documents", True),
    }
