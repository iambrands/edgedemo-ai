"""
RIA Account management endpoints.
Returns pre-seeded Leslie Wilson data for demo purposes.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/v1/ria/accounts", tags=["RIA Accounts"])

# --- Response Models ---

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

# --- Endpoints ---

@router.get("", response_model=List[Account])
async def list_accounts(current_user: dict = Depends(get_current_user)):
    """List all accounts for authenticated RIA."""
    return [Account(**a) for a in ACCOUNTS]
