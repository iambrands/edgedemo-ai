"""
Firm Management API — Multi-advisor hierarchy, role-based access control,
team management, and firm administration.
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/firm", tags=["Firm Management"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Mock Data
# ---------------------------------------------------------------------------

ROLES = [
    {"id": "owner", "name": "Firm Owner", "permissions": ["all"],
     "description": "Full access to all firm features and settings"},
    {"id": "lead_advisor", "name": "Lead Advisor", "permissions": [
        "manage_clients", "manage_portfolios", "view_billing", "run_reports",
        "manage_compliance", "view_firm_dashboard"],
     "description": "Full client and portfolio access with firm-level reporting"},
    {"id": "advisor", "name": "Advisor", "permissions": [
        "manage_own_clients", "manage_portfolios", "run_reports", "view_compliance"],
     "description": "Access limited to assigned households and portfolios"},
    {"id": "associate", "name": "Associate Advisor", "permissions": [
        "view_own_clients", "view_portfolios", "run_reports"],
     "description": "Read access to assigned clients with report generation"},
    {"id": "operations", "name": "Operations Manager", "permissions": [
        "manage_billing", "manage_documents", "manage_compliance", "view_all_clients"],
     "description": "Operations and compliance with full client visibility"},
    {"id": "compliance", "name": "Chief Compliance Officer", "permissions": [
        "manage_compliance", "view_all_clients", "view_audit_trail", "manage_documents"],
     "description": "Full compliance access and audit oversight"},
    {"id": "paraplanner", "name": "Paraplanner", "permissions": [
        "view_own_clients", "run_reports", "manage_documents"],
     "description": "Client preparation and document management"},
    {"id": "readonly", "name": "Read-Only", "permissions": ["view_own_clients"],
     "description": "View-only access to assigned clients"},
]

MOCK_ADVISORS = [
    {"id": "adv-001", "name": "Leslie Thompson", "email": "leslie@iabadvisors.com",
     "role": "owner", "title": "Managing Partner & Senior Advisor",
     "households_assigned": 15, "aum_managed": 28500000, "status": "active",
     "crd_number": "1234567", "licenses": ["Series 65", "Insurance"],
     "last_login": (_now - timedelta(hours=1)).isoformat(),
     "created_at": (_now - timedelta(days=365)).isoformat()},
    {"id": "adv-002", "name": "Marcus Chen", "email": "marcus@iabadvisors.com",
     "role": "lead_advisor", "title": "Senior Financial Advisor",
     "households_assigned": 10, "aum_managed": 14200000, "status": "active",
     "crd_number": "2345678", "licenses": ["Series 7", "Series 66", "Insurance"],
     "last_login": (_now - timedelta(hours=3)).isoformat(),
     "created_at": (_now - timedelta(days=300)).isoformat()},
    {"id": "adv-003", "name": "Rachel Kim", "email": "rachel@iabadvisors.com",
     "role": "advisor", "title": "Financial Advisor",
     "households_assigned": 7, "aum_managed": 6050000, "status": "active",
     "crd_number": "3456789", "licenses": ["Series 65"],
     "last_login": (_now - timedelta(hours=5)).isoformat(),
     "created_at": (_now - timedelta(days=180)).isoformat()},
    {"id": "adv-004", "name": "James Rodriguez", "email": "james@iabadvisors.com",
     "role": "associate", "title": "Associate Advisor",
     "households_assigned": 5, "aum_managed": 2800000, "status": "active",
     "crd_number": "4567890", "licenses": ["Series 65"],
     "last_login": (_now - timedelta(days=1)).isoformat(),
     "created_at": (_now - timedelta(days=90)).isoformat()},
    {"id": "adv-005", "name": "Sarah Mitchell", "email": "sarah@iabadvisors.com",
     "role": "operations", "title": "Operations Manager",
     "households_assigned": 0, "aum_managed": 0, "status": "active",
     "crd_number": None, "licenses": [],
     "last_login": (_now - timedelta(hours=2)).isoformat(),
     "created_at": (_now - timedelta(days=250)).isoformat()},
    {"id": "adv-006", "name": "Daniel Park", "email": "daniel@iabadvisors.com",
     "role": "compliance", "title": "Chief Compliance Officer",
     "households_assigned": 0, "aum_managed": 0, "status": "active",
     "crd_number": "5678901", "licenses": ["Series 7", "Series 24", "Series 66"],
     "last_login": (_now - timedelta(hours=6)).isoformat(),
     "created_at": (_now - timedelta(days=320)).isoformat()},
    {"id": "adv-007", "name": "Emily Torres", "email": "emily@iabadvisors.com",
     "role": "paraplanner", "title": "Paraplanner",
     "households_assigned": 8, "aum_managed": 0, "status": "active",
     "crd_number": None, "licenses": [],
     "last_login": (_now - timedelta(days=2)).isoformat(),
     "created_at": (_now - timedelta(days=120)).isoformat()},
]

MOCK_TEAMS = [
    {"id": "team-001", "name": "Wealth Advisory", "lead_id": "adv-001",
     "members": ["adv-001", "adv-002", "adv-004", "adv-007"],
     "households": 25, "aum": 42000000},
    {"id": "team-002", "name": "Next-Gen Planning", "lead_id": "adv-003",
     "members": ["adv-003", "adv-004"],
     "households": 12, "aum": 8850000},
    {"id": "team-003", "name": "Operations & Compliance", "lead_id": "adv-005",
     "members": ["adv-005", "adv-006"],
     "households": 0, "aum": 0},
]

MOCK_FIRM = {
    "id": "firm-001",
    "name": "IAB Advisors, Inc.",
    "crd_number": "9876543",
    "sec_number": "801-12345",
    "address": "123 Financial Drive, Suite 400, Charlotte, NC 28202",
    "phone": "(704) 555-0100",
    "website": "https://iabadvisors.com",
    "aum_total": 48750000,
    "households_total": 32,
    "accounts_total": 87,
    "advisors_total": len(MOCK_ADVISORS),
    "founded": "2018",
    "custodians": ["Charles Schwab", "Fidelity", "Pershing (BNY Mellon)"],
}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/profile")
async def get_firm_profile(current_user: dict = Depends(get_current_user)):
    return MOCK_FIRM


@router.get("/advisors")
async def list_advisors(current_user: dict = Depends(get_current_user)):
    return {
        "advisors": MOCK_ADVISORS,
        "total": len(MOCK_ADVISORS),
        "active": sum(1 for a in MOCK_ADVISORS if a["status"] == "active"),
    }


@router.get("/advisors/{advisor_id}")
async def get_advisor(advisor_id: str, current_user: dict = Depends(get_current_user)):
    for a in MOCK_ADVISORS:
        if a["id"] == advisor_id:
            return a
    raise HTTPException(status_code=404, detail="Advisor not found")


@router.post("/advisors")
async def create_advisor(request: dict, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    advisor = {
        "id": f"adv-{uuid.uuid4().hex[:6]}",
        "name": request.get("name", "New Advisor"),
        "email": request.get("email", ""),
        "role": request.get("role", "advisor"),
        "title": request.get("title", "Financial Advisor"),
        "households_assigned": 0,
        "aum_managed": 0,
        "status": "active",
        "crd_number": request.get("crd_number"),
        "licenses": request.get("licenses", []),
        "last_login": None,
        "created_at": now,
    }
    return advisor


@router.get("/roles")
async def list_roles(current_user: dict = Depends(get_current_user)):
    return {"roles": ROLES}


@router.get("/teams")
async def list_teams(current_user: dict = Depends(get_current_user)):
    return {"teams": MOCK_TEAMS, "total": len(MOCK_TEAMS)}


@router.post("/teams")
async def create_team(request: dict, current_user: dict = Depends(get_current_user)):
    team = {
        "id": f"team-{uuid.uuid4().hex[:6]}",
        "name": request.get("name", "New Team"),
        "lead_id": request.get("lead_id"),
        "members": request.get("members", []),
        "households": 0,
        "aum": 0,
    }
    return team


@router.get("/audit-log")
async def get_audit_log(
    days: int = 7,
    current_user: dict = Depends(get_current_user),
):
    actions = [
        "Logged in", "Viewed household", "Generated report", "Updated IPS",
        "Sent document for signature", "Approved compliance review",
        "Modified fee schedule", "Ran rebalancing", "Exported data",
        "Added prospect", "Updated beneficiary", "Synced custodian data",
    ]
    entries = []
    for i in range(min(days * 8, 50)):
        advisor = MOCK_ADVISORS[i % len(MOCK_ADVISORS)]
        entries.append({
            "id": f"audit-{i:04d}",
            "advisor_id": advisor["id"],
            "advisor_name": advisor["name"],
            "action": actions[i % len(actions)],
            "resource": f"household-{(i % 5) + 1:03d}" if i % 3 else None,
            "ip_address": f"10.0.{i % 5}.{(i * 7) % 255}",
            "timestamp": (_now - timedelta(hours=i * 3)).isoformat(),
        })
    return {"entries": entries, "total": len(entries)}
