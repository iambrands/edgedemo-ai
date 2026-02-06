"""
RIA Household management endpoints.
Returns pre-seeded Leslie Wilson data for demo purposes.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/v1/ria/households", tags=["RIA Households"])

# --- Request/Response Models ---

class Account(BaseModel):
    id: str
    householdId: str
    name: str
    custodian: str
    type: str
    taxType: str
    balance: float
    fees: str
    status: str

class HouseholdDetail(BaseModel):
    id: str
    name: str
    members: List[str]
    totalValue: float
    accounts: List[Account]
    riskScore: int
    lastAnalysis: Optional[str]
    status: str

class CreateHouseholdRequest(BaseModel):
    name: str
    members: List[str]
    riskTolerance: str  # conservative, moderate, aggressive
    investmentObjective: str
    timeHorizon: str

# --- Pre-seeded Data ---

ACCOUNTS = [
    {"id": "acc-001", "householdId": "hh-001", "name": "NW Mutual VA IRA", "custodian": "Northwestern Mutual", "type": "IRA", "taxType": "Tax-Deferred", "balance": 27891.34, "fees": "2.35%", "status": "high-fee"},
    {"id": "acc-002", "householdId": "hh-001", "name": "Robinhood Taxable", "custodian": "Robinhood", "type": "Individual", "taxType": "Taxable", "balance": 18234.56, "fees": "0.00%", "status": "concentrated"},
    {"id": "acc-003", "householdId": "hh-001", "name": "E*TRADE Employer Plan", "custodian": "E*TRADE/Morgan Stanley", "type": "401(k)", "taxType": "Tax-Deferred", "balance": 8779.68, "fees": "0.45%", "status": "good"},
    {"id": "acc-004", "householdId": "hh-002", "name": "Schwab Joint Account", "custodian": "Charles Schwab", "type": "Joint", "taxType": "Taxable", "balance": 245000.00, "fees": "0.12%", "status": "good"},
    {"id": "acc-005", "householdId": "hh-002", "name": "Fidelity IRA - Mark", "custodian": "Fidelity", "type": "IRA", "taxType": "Tax-Deferred", "balance": 142230.00, "fees": "0.08%", "status": "good"},
    {"id": "acc-006", "householdId": "hh-002", "name": "Fidelity Roth - Susan", "custodian": "Fidelity", "type": "Roth IRA", "taxType": "Tax-Free", "balance": 68000.00, "fees": "0.10%", "status": "good"},
    {"id": "acc-007", "householdId": "hh-002", "name": "529 College Fund", "custodian": "Vanguard", "type": "529", "taxType": "Tax-Free", "balance": 32000.00, "fees": "0.15%", "status": "good"},
    {"id": "acc-008", "householdId": "hh-003", "name": "Schwab Rollover IRA", "custodian": "Charles Schwab", "type": "IRA", "taxType": "Tax-Deferred", "balance": 225000.00, "fees": "0.10%", "status": "rebalance"},
    {"id": "acc-009", "householdId": "hh-003", "name": "Schwab Roth IRA", "custodian": "Charles Schwab", "type": "Roth IRA", "taxType": "Tax-Free", "balance": 87500.00, "fees": "0.10%", "status": "good"},
    {"id": "acc-010", "householdId": "hh-004", "name": "Vanguard Brokerage", "custodian": "Vanguard", "type": "Individual", "taxType": "Taxable", "balance": 98750.00, "fees": "0.05%", "status": "good"},
    {"id": "acc-011", "householdId": "hh-004", "name": "Vanguard IRA - Raj", "custodian": "Vanguard", "type": "IRA", "taxType": "Tax-Deferred", "balance": 65000.00, "fees": "0.05%", "status": "good"},
    {"id": "acc-012", "householdId": "hh-004", "name": "Vanguard IRA - Priya", "custodian": "Vanguard", "type": "IRA", "taxType": "Tax-Deferred", "balance": 35000.00, "fees": "0.05%", "status": "good"},
]

HOUSEHOLDS = [
    {"id": "hh-001", "name": "Wilson Household", "members": ["Nicole Wilson"], "totalValue": 54905.58, "riskScore": 72, "lastAnalysis": "2026-02-04", "status": "attention"},
    {"id": "hh-002", "name": "Henderson Family", "members": ["Mark Henderson", "Susan Henderson"], "totalValue": 487230.00, "riskScore": 45, "lastAnalysis": "2026-01-28", "status": "good"},
    {"id": "hh-003", "name": "Martinez Retirement", "members": ["Carlos Martinez"], "totalValue": 312500.00, "riskScore": 58, "lastAnalysis": "2026-01-30", "status": "rebalance"},
    {"id": "hh-004", "name": "Patel Household", "members": ["Raj Patel", "Priya Patel"], "totalValue": 198750.00, "riskScore": 35, "lastAnalysis": "2026-02-01", "status": "good"},
]

# --- Endpoints ---

@router.get("", response_model=List[HouseholdDetail])
async def list_households(current_user: dict = Depends(get_current_user)):
    """List all households for authenticated RIA with their accounts."""
    result = []
    for hh in HOUSEHOLDS:
        hh_accounts = [Account(**a) for a in ACCOUNTS if a["householdId"] == hh["id"]]
        result.append(HouseholdDetail(
            id=hh["id"],
            name=hh["name"],
            members=hh["members"],
            totalValue=hh["totalValue"],
            riskScore=hh["riskScore"],
            lastAnalysis=hh["lastAnalysis"],
            status=hh["status"],
            accounts=hh_accounts,
        ))
    return result

@router.get("/{household_id}", response_model=HouseholdDetail)
async def get_household(household_id: str, current_user: dict = Depends(get_current_user)):
    """Get single household with all accounts."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    hh_accounts = [Account(**a) for a in ACCOUNTS if a["householdId"] == household_id]
    return HouseholdDetail(
        id=hh["id"],
        name=hh["name"],
        members=hh["members"],
        totalValue=hh["totalValue"],
        riskScore=hh["riskScore"],
        lastAnalysis=hh["lastAnalysis"],
        status=hh["status"],
        accounts=hh_accounts,
    )

@router.post("/{household_id}/analyze")
async def analyze_household(household_id: str, current_user: dict = Depends(get_current_user)):
    """Trigger full IIM/CIM/BIM analysis on household."""
    hh = next((h for h in HOUSEHOLDS if h["id"] == household_id), None)
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    
    return {
        "status": "analysis_started",
        "householdId": household_id,
        "message": f"IIM/CIM/BIM pipeline started for {hh['name']}",
    }


@router.post("", response_model=HouseholdDetail)
async def create_household(
    request: CreateHouseholdRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new household."""
    # Generate unique ID based on timestamp
    household_id = f"hh-{int(datetime.utcnow().timestamp())}"
    
    # Calculate risk score from tolerance
    risk_scores = {"conservative": 25, "moderate": 50, "aggressive": 75}
    risk_score = risk_scores.get(request.riskTolerance, 50)
    
    new_household = {
        "id": household_id,
        "name": request.name,
        "members": request.members,
        "totalValue": 0.0,
        "riskScore": risk_score,
        "lastAnalysis": None,
        "status": "new",
    }
    
    # Add to mock database
    HOUSEHOLDS.append(new_household)
    
    return HouseholdDetail(
        id=household_id,
        name=request.name,
        members=request.members,
        totalValue=0.0,
        riskScore=risk_score,
        lastAnalysis=None,
        status="new",
        accounts=[],
    )
