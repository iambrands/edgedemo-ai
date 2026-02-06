"""
RIA Dashboard summary endpoints.
Returns pre-seeded Leslie Wilson data for demo purposes.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional

from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/v1/ria/dashboard", tags=["RIA Dashboard"])

# --- Response Models ---

class KPISummary(BaseModel):
    totalAUM: float
    householdCount: int
    accountCount: int
    alertCount: int

class HouseholdSummary(BaseModel):
    id: str
    name: str
    members: List[str]
    totalValue: float
    accounts: int
    riskScore: int
    lastAnalysis: str
    status: str

class Alert(BaseModel):
    id: int
    type: str
    severity: str
    message: str
    householdId: Optional[str]
    date: str

class Activity(BaseModel):
    id: int
    action: str
    detail: str
    date: str

class DashboardResponse(BaseModel):
    kpis: KPISummary
    households: List[HouseholdSummary]
    alerts: List[Alert]
    recentActivity: List[Activity]

# --- Pre-seeded Leslie Wilson Data ---

HOUSEHOLDS = [
    {"id": "hh-001", "name": "Wilson Household", "members": ["Nicole Wilson"], "totalValue": 54905.58, "accounts": 3, "riskScore": 72, "lastAnalysis": "2026-02-04", "status": "attention"},
    {"id": "hh-002", "name": "Henderson Family", "members": ["Mark Henderson", "Susan Henderson"], "totalValue": 487230.00, "accounts": 4, "riskScore": 45, "lastAnalysis": "2026-01-28", "status": "good"},
    {"id": "hh-003", "name": "Martinez Retirement", "members": ["Carlos Martinez"], "totalValue": 312500.00, "accounts": 2, "riskScore": 58, "lastAnalysis": "2026-01-30", "status": "rebalance"},
    {"id": "hh-004", "name": "Patel Household", "members": ["Raj Patel", "Priya Patel"], "totalValue": 198750.00, "accounts": 3, "riskScore": 35, "lastAnalysis": "2026-02-01", "status": "good"},
]

ALERTS = [
    {"id": 1, "type": "concentration", "severity": "high", "message": "Wilson Household: NVDA concentration at 47% in Robinhood account", "householdId": "hh-001", "date": "2026-02-04"},
    {"id": 2, "type": "fee", "severity": "high", "message": "Wilson Household: NW Mutual VA total fees at 2.35% — consider 1035 exchange after surrender period", "householdId": "hh-001", "date": "2026-02-04"},
    {"id": 3, "type": "rebalance", "severity": "medium", "message": "Martinez Retirement: Allocation drift >5% from IPS targets in Rollover IRA", "householdId": "hh-003", "date": "2026-02-03"},
    {"id": 4, "type": "compliance", "severity": "low", "message": "Quarterly compliance report due — 4 households pending review", "householdId": None, "date": "2026-02-05"},
]

ACTIVITY = [
    {"id": 1, "action": "Statement Parsed", "detail": "NW Mutual VA IRA — 19 sub-account funds extracted", "date": "2026-02-04 09:15"},
    {"id": 2, "action": "Household Analysis", "detail": "Wilson Household — IIM/CIM/BIM pipeline completed", "date": "2026-02-04 09:22"},
    {"id": 3, "action": "Alert Generated", "detail": "NVDA concentration warning — Wilson Household", "date": "2026-02-04 09:23"},
    {"id": 4, "action": "Rebalance Proposed", "detail": "Martinez Retirement — 6 trades generated", "date": "2026-02-03 14:30"},
    {"id": 5, "action": "Compliance Report", "detail": "Henderson Family — quarterly review completed", "date": "2026-01-28 16:45"},
    {"id": 6, "action": "IPS Generated", "detail": "Patel Household — moderate growth IPS created", "date": "2026-02-01 11:00"},
]

# --- Endpoints ---

@router.get("/summary", response_model=DashboardResponse)
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    """
    Get complete dashboard summary for authenticated RIA.
    Returns KPIs, households, alerts, and recent activity.
    """
    total_aum = sum(h["totalValue"] for h in HOUSEHOLDS)
    
    return DashboardResponse(
        kpis=KPISummary(
            totalAUM=total_aum,
            householdCount=len(HOUSEHOLDS),
            accountCount=12,  # Sum of all accounts
            alertCount=len(ALERTS),
        ),
        households=[HouseholdSummary(**h) for h in HOUSEHOLDS],
        alerts=[Alert(**a) for a in ALERTS],
        recentActivity=[Activity(**a) for a in ACTIVITY],
    )
