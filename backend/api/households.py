"""
Household management endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/households", tags=["Households"])


class ClientSummary(BaseModel):
    id: str
    name: str
    is_primary: bool
    email: str | None = None


class AccountSummary(BaseModel):
    id: str
    account_number_masked: str
    type: str
    custodian: str
    value: float


class HouseholdSummary(BaseModel):
    id: str
    name: str
    primary_client: str
    total_aum: float
    risk_level: str
    account_count: int
    status: str
    last_activity: datetime


class HouseholdDetail(BaseModel):
    id: str
    name: str
    clients: list[ClientSummary]
    accounts: list[AccountSummary]
    total_aum: float
    risk_level: str
    status: str
    created_at: datetime
    last_activity: datetime
    notes: str | None = None


MOCK_HOUSEHOLDS = [
    {
        "id": "hh_001",
        "name": "Wilson Family",
        "primary_client": "Nicole Wilson",
        "total_aum": 54905.58,
        "risk_level": "moderate",
        "account_count": 3,
        "status": "active",
        "last_activity": datetime.now(),
        "clients": [
            {"id": "cl_001", "name": "Nicole Wilson", "is_primary": True, "email": "nicole@example.com"},
        ],
        "accounts": [
            {"id": "acc_001", "account_number_masked": "***4532", "type": "VA IRA", "custodian": "NW Mutual", "value": 42105.00},
            {"id": "acc_002", "account_number_masked": "***8821", "type": "Brokerage", "custodian": "Robinhood", "value": 8012.00},
            {"id": "acc_003", "account_number_masked": "***3390", "type": "Brokerage", "custodian": "E*TRADE", "value": 4788.58},
        ],
    },
    {
        "id": "hh_002",
        "name": "Johnson Household",
        "primary_client": "Robert Johnson",
        "total_aum": 312450.00,
        "risk_level": "conservative",
        "account_count": 5,
        "status": "active",
        "last_activity": datetime.now(),
        "clients": [
            {"id": "cl_002", "name": "Robert Johnson", "is_primary": True, "email": "robert@example.com"},
            {"id": "cl_003", "name": "Sarah Johnson", "is_primary": False, "email": "sarah@example.com"},
        ],
        "accounts": [
            {"id": "acc_004", "account_number_masked": "***7712", "type": "Roth IRA", "custodian": "Fidelity", "value": 156200.00},
            {"id": "acc_005", "account_number_masked": "***5543", "type": "401(k)", "custodian": "Schwab", "value": 156250.00},
        ],
    },
    {
        "id": "hh_003",
        "name": "Chen Family Trust",
        "primary_client": "David Chen",
        "total_aum": 892100.00,
        "risk_level": "moderate",
        "account_count": 4,
        "status": "review",
        "last_activity": datetime.now(),
        "clients": [
            {"id": "cl_004", "name": "David Chen", "is_primary": True, "email": "david@example.com"},
        ],
        "accounts": [],
    },
]


@router.get("", response_model=list[HouseholdSummary])
async def list_households(
    status: str | None = None,
    search: str | None = None,
):
    """List all households with optional filtering."""
    results = MOCK_HOUSEHOLDS
    if status:
        results = [h for h in results if h["status"] == status]
    if search:
        s = search.lower()
        results = [h for h in results if s in h["name"].lower() or s in h["primary_client"].lower()]
    return [
        HouseholdSummary(
            id=h["id"],
            name=h["name"],
            primary_client=h["primary_client"],
            total_aum=h["total_aum"],
            risk_level=h["risk_level"],
            account_count=h["account_count"],
            status=h["status"],
            last_activity=h["last_activity"],
        )
        for h in results
    ]


@router.get("/{household_id}", response_model=HouseholdDetail)
async def get_household(household_id: str):
    """Get detailed household information."""
    household = next((h for h in MOCK_HOUSEHOLDS if h["id"] == household_id), None)
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    return HouseholdDetail(
        id=household["id"],
        name=household["name"],
        clients=[ClientSummary(**c) for c in household["clients"]],
        accounts=[AccountSummary(**a) for a in household["accounts"]],
        total_aum=household["total_aum"],
        risk_level=household["risk_level"],
        status=household["status"],
        created_at=datetime.now(),
        last_activity=household["last_activity"],
    )


@router.post("")
async def create_household(name: str, primary_client_name: str):
    """Create a new household."""
    new_id = f"hh_{len(MOCK_HOUSEHOLDS) + 1:03d}"
    return {"id": new_id, "name": name, "message": "Household created"}
