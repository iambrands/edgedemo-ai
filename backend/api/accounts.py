"""
Account management endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])


class PositionSummary(BaseModel):
    symbol: str
    name: str
    quantity: float
    price: float
    value: float
    cost_basis: float
    gain_loss: float
    gain_loss_pct: float
    asset_class: str


class AccountDetail(BaseModel):
    id: str
    account_number_masked: str
    type: str
    custodian: str
    household_id: str
    household_name: str
    total_value: float
    positions: list[PositionSummary]
    last_statement_date: datetime | None = None
    status: str


class AccountListItem(BaseModel):
    id: str
    account_number_masked: str
    type: str
    custodian: str
    household_name: str
    value: float
    status: str


MOCK_ACCOUNTS = [
    {
        "id": "acc_001",
        "account_number_masked": "***4532",
        "type": "VA IRA",
        "custodian": "NW Mutual",
        "household_id": "hh_001",
        "household_name": "Wilson Family",
        "total_value": 42105.00,
        "status": "active",
        "positions": [
            {"symbol": "NWMVA", "name": "Index 500 (BlackRock)", "quantity": 1, "price": 4631.55, "value": 4631.55, "cost_basis": 4200.00, "gain_loss": 431.55, "gain_loss_pct": 10.27, "asset_class": "equity"},
            {"symbol": "NWMSB", "name": "Select Bond (Allspring)", "quantity": 1, "price": 5473.65, "value": 5473.65, "cost_basis": 5600.00, "gain_loss": -126.35, "gain_loss_pct": -2.26, "asset_class": "fixed_income"},
        ],
    },
    {
        "id": "acc_002",
        "account_number_masked": "***8821",
        "type": "Brokerage",
        "custodian": "Robinhood",
        "household_id": "hh_001",
        "household_name": "Wilson Family",
        "total_value": 8012.00,
        "status": "active",
        "positions": [
            {"symbol": "AAPL", "name": "Apple Inc.", "quantity": 25, "price": 185.50, "value": 4637.50, "cost_basis": 4000.00, "gain_loss": 637.50, "gain_loss_pct": 15.94, "asset_class": "equity"},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "quantity": 10, "price": 337.45, "value": 3374.50, "cost_basis": 3200.00, "gain_loss": 174.50, "gain_loss_pct": 5.45, "asset_class": "equity"},
        ],
    },
    {
        "id": "acc_003",
        "account_number_masked": "***3390",
        "type": "Brokerage",
        "custodian": "E*TRADE",
        "household_id": "hh_001",
        "household_name": "Wilson Family",
        "total_value": 4788.58,
        "status": "active",
        "positions": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "quantity": 20, "price": 239.43, "value": 4788.58, "cost_basis": 4500.00, "gain_loss": 288.58, "gain_loss_pct": 6.41, "asset_class": "equity"},
        ],
    },
]


@router.get("", response_model=list[AccountListItem])
async def list_accounts(
    custodian: str | None = None,
    type: str | None = None,
    household_id: str | None = None,
):
    """List all accounts with optional filtering."""
    results = MOCK_ACCOUNTS
    if custodian:
        results = [a for a in results if a["custodian"].lower() == custodian.lower()]
    if type:
        results = [a for a in results if a["type"].lower() == type.lower()]
    if household_id:
        results = [a for a in results if a["household_id"] == household_id]
    return [
        AccountListItem(
            id=a["id"],
            account_number_masked=a["account_number_masked"],
            type=a["type"],
            custodian=a["custodian"],
            household_name=a["household_name"],
            value=a["total_value"],
            status=a["status"],
        )
        for a in results
    ]


@router.get("/{account_id}", response_model=AccountDetail)
async def get_account(account_id: str):
    """Get detailed account information with positions."""
    account = next((a for a in MOCK_ACCOUNTS if a["id"] == account_id), None)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountDetail(
        id=account["id"],
        account_number_masked=account["account_number_masked"],
        type=account["type"],
        custodian=account["custodian"],
        household_id=account["household_id"],
        household_name=account["household_name"],
        total_value=account["total_value"],
        positions=[PositionSummary(**p) for p in account["positions"]],
        status=account["status"],
    )
