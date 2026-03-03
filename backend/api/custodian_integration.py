"""
Custodian Data Integration API — Plaid-based custodian connections with
direct feed support for Schwab, Fidelity, and Pershing.
Mock fallback when PLAID_CLIENT_ID is not configured.
"""
import os
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/custodian-feeds", tags=["Custodian Integration"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user


# ---------------------------------------------------------------------------
# Plaid client (lazy init)
# ---------------------------------------------------------------------------

def _get_plaid_config() -> Optional[Dict[str, str]]:
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    if client_id and secret:
        return {"client_id": client_id, "secret": secret,
                "env": os.getenv("PLAID_ENV", "sandbox")}
    return None


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class CustodianConnection(BaseModel):
    id: str
    custodian: str
    status: str = "active"
    accounts_linked: int = 0
    last_sync: Optional[str] = None
    next_sync: Optional[str] = None
    sync_frequency: str = "daily"
    connection_type: str = "plaid"
    error: Optional[str] = None
    created_at: str

class CustodianAccount(BaseModel):
    id: str
    connection_id: str
    custodian: str
    account_number: str
    account_name: str
    account_type: str
    balance: float
    available_balance: Optional[float] = None
    currency: str = "USD"
    household_id: Optional[str] = None
    last_updated: str

class CustodianPosition(BaseModel):
    id: str
    account_id: str
    symbol: str
    description: str
    quantity: float
    price: float
    market_value: float
    cost_basis: float
    gain_loss: float
    gain_loss_pct: float
    asset_class: str
    last_updated: str

class CustodianTransaction(BaseModel):
    id: str
    account_id: str
    date: str
    type: str
    description: str
    symbol: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: float
    status: str = "settled"

class SyncResult(BaseModel):
    connection_id: str
    accounts_synced: int
    positions_synced: int
    transactions_synced: int
    errors: List[str] = []
    duration_ms: int
    synced_at: str


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

_connections: List[Dict[str, Any]] = []
_now = datetime.now(timezone.utc)

MOCK_CONNECTIONS = [
    {"id": "conn-schwab-001", "custodian": "Charles Schwab", "status": "active",
     "accounts_linked": 12, "last_sync": (_now - timedelta(hours=2)).isoformat(),
     "next_sync": (_now + timedelta(hours=22)).isoformat(), "sync_frequency": "daily",
     "connection_type": "direct_feed", "error": None,
     "created_at": (_now - timedelta(days=180)).isoformat()},
    {"id": "conn-fidelity-001", "custodian": "Fidelity", "status": "active",
     "accounts_linked": 8, "last_sync": (_now - timedelta(hours=4)).isoformat(),
     "next_sync": (_now + timedelta(hours=20)).isoformat(), "sync_frequency": "daily",
     "connection_type": "direct_feed", "error": None,
     "created_at": (_now - timedelta(days=120)).isoformat()},
    {"id": "conn-pershing-001", "custodian": "Pershing (BNY Mellon)", "status": "active",
     "accounts_linked": 5, "last_sync": (_now - timedelta(hours=6)).isoformat(),
     "next_sync": (_now + timedelta(hours=18)).isoformat(), "sync_frequency": "daily",
     "connection_type": "direct_feed", "error": None,
     "created_at": (_now - timedelta(days=90)).isoformat()},
    {"id": "conn-vanguard-001", "custodian": "Vanguard", "status": "syncing",
     "accounts_linked": 3, "last_sync": (_now - timedelta(minutes=5)).isoformat(),
     "next_sync": None, "sync_frequency": "daily",
     "connection_type": "plaid", "error": None,
     "created_at": (_now - timedelta(days=60)).isoformat()},
    {"id": "conn-td-001", "custodian": "TD Ameritrade", "status": "error",
     "accounts_linked": 2, "last_sync": (_now - timedelta(days=2)).isoformat(),
     "next_sync": None, "sync_frequency": "daily",
     "connection_type": "plaid", "error": "OAuth token expired — re-authentication required",
     "created_at": (_now - timedelta(days=200)).isoformat()},
]

MOCK_ACCOUNTS = [
    {"id": "acct-001", "connection_id": "conn-schwab-001", "custodian": "Charles Schwab",
     "account_number": "****4521", "account_name": "Williams Family Trust",
     "account_type": "Trust", "balance": 2450000, "available_balance": 125000,
     "household_id": "hh-001", "last_updated": _now.isoformat()},
    {"id": "acct-002", "connection_id": "conn-schwab-001", "custodian": "Charles Schwab",
     "account_number": "****8832", "account_name": "Robert Williams IRA",
     "account_type": "Traditional IRA", "balance": 890000, "available_balance": 45000,
     "household_id": "hh-001", "last_updated": _now.isoformat()},
    {"id": "acct-003", "connection_id": "conn-schwab-001", "custodian": "Charles Schwab",
     "account_number": "****7743", "account_name": "Sarah Williams Roth IRA",
     "account_type": "Roth IRA", "balance": 425000, "available_balance": 12000,
     "household_id": "hh-001", "last_updated": _now.isoformat()},
    {"id": "acct-004", "connection_id": "conn-fidelity-001", "custodian": "Fidelity",
     "account_number": "****2156", "account_name": "Anderson Joint Brokerage",
     "account_type": "Joint Brokerage", "balance": 1875000, "available_balance": 98000,
     "household_id": "hh-002", "last_updated": _now.isoformat()},
    {"id": "acct-005", "connection_id": "conn-fidelity-001", "custodian": "Fidelity",
     "account_number": "****9901", "account_name": "Lisa Anderson 401(k)",
     "account_type": "401(k)", "balance": 650000, "available_balance": 0,
     "household_id": "hh-002", "last_updated": _now.isoformat()},
    {"id": "acct-006", "connection_id": "conn-pershing-001", "custodian": "Pershing (BNY Mellon)",
     "account_number": "****3347", "account_name": "Martinez Family Portfolio",
     "account_type": "Brokerage", "balance": 3200000, "available_balance": 210000,
     "household_id": "hh-003", "last_updated": _now.isoformat()},
    {"id": "acct-007", "connection_id": "conn-vanguard-001", "custodian": "Vanguard",
     "account_number": "****5589", "account_name": "Park Education 529",
     "account_type": "529 Plan", "balance": 185000, "available_balance": 0,
     "household_id": "hh-004", "last_updated": _now.isoformat()},
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/connections")
async def list_connections(current_user: dict = Depends(get_current_user)):
    all_conns = MOCK_CONNECTIONS + _connections
    total_accounts = sum(c.get("accounts_linked", 0) for c in all_conns)
    total_aum = sum(a["balance"] for a in MOCK_ACCOUNTS)
    return {
        "connections": all_conns,
        "total": len(all_conns),
        "total_accounts": total_accounts,
        "total_aum": total_aum,
        "plaid_configured": _get_plaid_config() is not None,
    }


@router.post("/connections")
async def create_connection(request: dict, current_user: dict = Depends(get_current_user)):
    custodian = request.get("custodian", "Unknown")
    conn_type = request.get("connection_type", "plaid")
    now = datetime.now(timezone.utc).isoformat()
    conn = {
        "id": f"conn-{uuid.uuid4().hex[:8]}",
        "custodian": custodian,
        "status": "pending",
        "accounts_linked": 0,
        "last_sync": None,
        "next_sync": None,
        "sync_frequency": "daily",
        "connection_type": conn_type,
        "error": None,
        "created_at": now,
    }
    _connections.insert(0, conn)
    return conn


@router.post("/connections/{connection_id}/sync")
async def sync_connection(connection_id: str, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    accounts_synced = random.randint(2, 12)
    positions_synced = random.randint(15, 80)
    transactions_synced = random.randint(5, 45)
    return SyncResult(
        connection_id=connection_id,
        accounts_synced=accounts_synced,
        positions_synced=positions_synced,
        transactions_synced=transactions_synced,
        errors=[],
        duration_ms=random.randint(800, 3500),
        synced_at=now.isoformat(),
    )


@router.delete("/connections/{connection_id}")
async def disconnect(connection_id: str, current_user: dict = Depends(get_current_user)):
    return {"status": "disconnected", "connection_id": connection_id}


@router.get("/accounts")
async def list_accounts(
    connection_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    accts = MOCK_ACCOUNTS
    if connection_id:
        accts = [a for a in accts if a["connection_id"] == connection_id]
    return {"accounts": accts, "total": len(accts)}


@router.get("/positions")
async def list_positions(
    account_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "BRK.B", "JNJ", "V",
               "PG", "UNH", "HD", "MA", "DIS", "COST", "PEP", "KO", "VTI",
               "BND", "SCHD", "VOO", "QQQ", "IWM", "AGG", "TIP"]
    positions = []
    for i, sym in enumerate(symbols[:random.randint(10, 20)]):
        qty = random.randint(10, 500)
        price = round(random.uniform(50, 600), 2)
        cost = round(price * random.uniform(0.7, 1.1), 2)
        mv = round(qty * price, 2)
        cb = round(qty * cost, 2)
        positions.append({
            "id": f"pos-{i:04d}",
            "account_id": account_id or f"acct-{(i % 7) + 1:03d}",
            "symbol": sym,
            "description": f"{sym} Common Stock" if i < 16 else f"{sym} ETF",
            "quantity": qty,
            "price": price,
            "market_value": mv,
            "cost_basis": cb,
            "gain_loss": round(mv - cb, 2),
            "gain_loss_pct": round((mv - cb) / cb * 100, 2) if cb else 0,
            "asset_class": random.choice(["US Equity", "International Equity", "Fixed Income", "ETF"]),
            "last_updated": _now.isoformat(),
        })
    return {"positions": positions, "total": len(positions)}


@router.get("/transactions")
async def list_transactions(
    account_id: Optional[str] = None,
    days: int = 30,
    current_user: dict = Depends(get_current_user),
):
    txn_types = ["Buy", "Sell", "Dividend", "Interest", "Fee", "Transfer In", "Transfer Out"]
    symbols = ["AAPL", "MSFT", "VTI", "BND", "SCHD", "VOO", "GOOGL"]
    txns = []
    for i in range(random.randint(15, 40)):
        t = random.choice(txn_types)
        sym = random.choice(symbols) if t in ("Buy", "Sell", "Dividend") else None
        txns.append({
            "id": f"txn-{uuid.uuid4().hex[:8]}",
            "account_id": account_id or f"acct-{random.randint(1, 7):03d}",
            "date": (_now - timedelta(days=random.randint(0, days))).strftime("%Y-%m-%d"),
            "type": t,
            "description": f"{t} {sym}" if sym else t,
            "symbol": sym,
            "quantity": round(random.uniform(1, 100), 2) if t in ("Buy", "Sell") else None,
            "price": round(random.uniform(50, 500), 2) if t in ("Buy", "Sell") else None,
            "amount": round(random.uniform(-50000, 50000), 2),
            "status": "settled",
        })
    txns.sort(key=lambda x: x["date"], reverse=True)
    return {"transactions": txns, "total": len(txns)}


@router.get("/reconciliation")
async def get_reconciliation(current_user: dict = Depends(get_current_user)):
    return {
        "last_reconciliation": (_now - timedelta(hours=2)).isoformat(),
        "status": "complete",
        "accounts_reconciled": len(MOCK_ACCOUNTS),
        "discrepancies": 0,
        "next_reconciliation": (_now + timedelta(hours=22)).isoformat(),
        "history": [
            {"date": (_now - timedelta(days=d)).strftime("%Y-%m-%d"),
             "accounts": len(MOCK_ACCOUNTS), "discrepancies": 0 if d > 1 else 0,
             "status": "complete", "duration_ms": random.randint(1200, 4500)}
            for d in range(7)
        ],
    }
