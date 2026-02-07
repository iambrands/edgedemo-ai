"""
Mock Client Portal API endpoints.
Provides demo data for the client portal when the real DB-backed endpoints
cannot be mounted (e.g. no PostgreSQL configured).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import hashlib

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


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_ACCOUNTS = [
    {"id": "acc-001", "account_name": "Individual Brokerage", "account_type": "Individual", "custodian": "Charles Schwab", "current_value": 287500.00, "tax_type": "Taxable"},
    {"id": "acc-002", "account_name": "Roth IRA", "account_type": "Retirement", "custodian": "Charles Schwab", "current_value": 145200.00, "tax_type": "Tax-Free"},
    {"id": "acc-003", "account_name": "Traditional IRA", "account_type": "Retirement", "custodian": "Fidelity", "current_value": 312800.00, "tax_type": "Tax-Deferred"},
]

DEMO_NUDGES = [
    {
        "id": "nudge-001",
        "nudge_type": "rebalance",
        "title": "Portfolio Rebalance Recommended",
        "message": "Your portfolio has drifted 6% from target allocation. Consider rebalancing to maintain your risk profile.",
        "action_url": "/portal/dashboard",
        "action_label": "View Details",
        "priority": 2,
        "status": "pending",
        "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
    },
    {
        "id": "nudge-002",
        "nudge_type": "document",
        "title": "New Tax Documents Available",
        "message": "Your 2025 1099-DIV is ready for download.",
        "action_url": "/portal/dashboard",
        "action_label": "View Documents",
        "priority": 1,
        "status": "pending",
        "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
    },
]

DEMO_GOALS = [
    {
        "id": "goal-001",
        "goal_type": "retirement",
        "name": "Retirement Fund",
        "target_amount": 2000000,
        "current_amount": 745500,
        "target_date": "2045-01-01T00:00:00",
        "monthly_contribution": 3500,
        "progress_pct": 0.37,
        "on_track": True,
        "notes": "Target retirement at 65",
        "created_at": "2024-03-15T10:00:00",
    },
    {
        "id": "goal-002",
        "goal_type": "education",
        "name": "College Fund - Emma",
        "target_amount": 250000,
        "current_amount": 82000,
        "target_date": "2036-09-01T00:00:00",
        "monthly_contribution": 1200,
        "progress_pct": 0.33,
        "on_track": True,
        "notes": "529 plan contributions",
        "created_at": "2024-06-01T10:00:00",
    },
]


def _make_token(email: str) -> str:
    """Generate a deterministic demo token."""
    return hashlib.sha256(f"demo-portal-{email}-{uuid.uuid4().hex[:8]}".encode()).hexdigest()


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@router.post("/auth/login", response_model=PortalLoginResponse)
async def portal_login(req: PortalLoginRequest):
    """Demo portal login. Accepts any email/password combination."""
    # For demo, accept any credentials
    name_parts = req.email.split("@")[0].replace(".", " ").title()
    client_name = name_parts if name_parts else "Demo Client"

    return PortalLoginResponse(
        access_token=_make_token(req.email),
        refresh_token=_make_token(req.email + "-refresh"),
        expires_in=86400,
        client_name=client_name,
        firm_name="IAB Advisors",
    )


@router.post("/auth/refresh", response_model=PortalLoginResponse)
async def portal_refresh():
    """Demo token refresh."""
    return PortalLoginResponse(
        access_token=_make_token("refresh"),
        refresh_token=_make_token("refresh-new"),
        expires_in=86400,
        client_name="Demo Client",
        firm_name="IAB Advisors",
    )


@router.post("/auth/logout")
async def portal_logout():
    """Demo logout."""
    return {"message": "Logged out successfully"}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def get_dashboard():
    """Demo portal dashboard data."""
    total_value = sum(a["current_value"] for a in DEMO_ACCOUNTS)
    return {
        "client_name": "Demo Client",
        "advisor_name": "Leslie Wilson, CFP",
        "firm_name": "IAB Advisors",
        "total_value": total_value,
        "ytd_return": 0.089,
        "ytd_return_dollar": total_value * 0.089,
        "accounts": DEMO_ACCOUNTS,
        "pending_nudges": len(DEMO_NUDGES),
        "unread_narratives": 1,
        "active_goals": len(DEMO_GOALS),
        "last_updated": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Nudges
# ---------------------------------------------------------------------------

@router.get("/nudges")
async def get_nudges():
    """Demo nudges list."""
    return DEMO_NUDGES


@router.post("/nudges/{nudge_id}/dismiss")
async def dismiss_nudge(nudge_id: str):
    """Demo dismiss nudge."""
    return {"ok": True}


@router.post("/nudges/{nudge_id}/view")
async def view_nudge(nudge_id: str):
    """Demo view nudge."""
    return {"ok": True}


@router.post("/nudges/{nudge_id}/act")
async def act_on_nudge(nudge_id: str):
    """Demo act on nudge."""
    return {"ok": True}


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------

@router.get("/goals")
async def get_goals():
    """Demo goals list."""
    return DEMO_GOALS


@router.post("/goals")
async def create_goal(data: dict):
    """Demo create goal."""
    goal = {
        "id": str(uuid.uuid4()),
        "goal_type": data.get("goal_type", "custom"),
        "name": data.get("name", "New Goal"),
        "target_amount": data.get("target_amount", 100000),
        "current_amount": 0,
        "target_date": data.get("target_date", (datetime.utcnow() + timedelta(days=365*10)).isoformat()),
        "monthly_contribution": data.get("monthly_contribution"),
        "progress_pct": 0,
        "on_track": True,
        "notes": data.get("notes"),
        "created_at": datetime.utcnow().isoformat(),
    }
    return goal


# ---------------------------------------------------------------------------
# Branding & Config
# ---------------------------------------------------------------------------

@router.get("/config/branding")
async def get_branding():
    """Demo branding config."""
    return {
        "logo_url": None,
        "primary_color": "#1a56db",
        "secondary_color": "#7c3aed",
        "accent_color": "#059669",
        "font_family": "Inter",
        "portal_title": "IAB Advisors Client Portal",
        "footer_text": "IAB Advisors LLC \u00b7 Registered Investment Advisor",
        "disclaimer_text": "Investment advisory services offered through IAB Advisors LLC, a registered investment advisor.",
    }


@router.get("/preferences")
async def get_preferences():
    """Demo preferences."""
    return {
        "email_narratives": True,
        "email_nudges": True,
        "email_documents": True,
    }


@router.patch("/preferences")
async def update_preferences():
    """Demo update preferences."""
    return {
        "email_narratives": True,
        "email_nudges": True,
        "email_documents": True,
    }


# ---------------------------------------------------------------------------
# Narratives & Documents
# ---------------------------------------------------------------------------

@router.get("/narratives")
async def get_narratives():
    """Demo narratives."""
    return [
        {
            "id": "nar-001",
            "narrative_type": "quarterly",
            "title": "Q4 2025 Portfolio Review",
            "content": "Your portfolio gained 4.2% this quarter, outperforming the benchmark by 0.8%. Your diversified allocation helped cushion against market volatility.",
            "content_html": None,
            "period_start": "2025-10-01T00:00:00",
            "period_end": "2025-12-31T00:00:00",
            "is_read": False,
            "created_at": "2026-01-15T10:00:00",
        }
    ]


@router.get("/documents")
async def get_documents():
    """Demo documents."""
    return [
        {
            "id": "doc-001",
            "document_type": "statement",
            "title": "January 2026 Statement",
            "period": "2026-01",
            "file_size": 245000,
            "is_read": True,
            "created_at": "2026-02-01T10:00:00",
        },
        {
            "id": "doc-002",
            "document_type": "tax",
            "title": "2025 1099-DIV",
            "period": "2025",
            "file_size": 128000,
            "is_read": False,
            "created_at": "2026-01-31T10:00:00",
        },
    ]
