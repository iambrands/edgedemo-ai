"""
Multi-Custodian Aggregation API endpoints.

Provides endpoints for:
  - Custodian discovery
  - OAuth connection management
  - Sync operations
  - Unified portfolio views (positions, allocation, transactions)
  - Account-to-client mapping
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.custodian import (
    AggregatedPosition,
    AggregatedTransaction,
    ConnectionStatus,
    Custodian,
    CustodianAccount,
    CustodianAccountType,
    CustodianConnection,
    CustodianSyncLog,
    CustodianTransactionType,
    CustodianType,
    SyncStatus,
)
from backend.services.custodian import CustodianService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/custodians",
    tags=["Multi-Custodian Aggregation"],
)


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================


class _CustodianBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Custodian Discovery ────────────────────────────────────────

class CustodianResponse(_CustodianBase):
    id: str
    custodian_type: CustodianType
    display_name: str
    supports_oauth: bool
    supports_realtime: bool
    is_active: bool
    maintenance_message: Optional[str] = None


class CustodianListResponse(BaseModel):
    custodians: List[CustodianResponse]
    total: int


# ── Connection ─────────────────────────────────────────────────

class ConnectionInitiateRequest(BaseModel):
    custodian_type: CustodianType
    redirect_uri: str


class ConnectionInitiateResponse(BaseModel):
    authorization_url: str
    state: str
    custodian_type: CustodianType


class ConnectionCompleteRequest(BaseModel):
    custodian_type: CustodianType
    code: str
    state: str
    redirect_uri: str


class ConnectionResponse(_CustodianBase):
    id: str
    custodian_id: str
    custodian_type: CustodianType
    custodian_name: str
    status: ConnectionStatus
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[SyncStatus] = None
    last_error: Optional[str] = None
    sync_frequency_minutes: int
    created_at: datetime
    updated_at: datetime


class ConnectionListResponse(BaseModel):
    connections: List[ConnectionResponse]
    total: int


# ── Account ────────────────────────────────────────────────────

class AccountResponse(_CustodianBase):
    id: str
    connection_id: str
    custodian_type: CustodianType
    custodian_name: str
    external_account_id: str
    account_name: str
    account_type: CustodianAccountType
    tax_status: str
    market_value: float
    cash_balance: float
    client_id: Optional[str] = None
    household_id: Optional[str] = None
    is_active: bool
    last_sync_at: Optional[datetime] = None


class AccountListResponse(BaseModel):
    accounts: List[AccountResponse]
    total: int
    total_market_value: float
    total_cash_balance: float


class AccountMapRequest(BaseModel):
    client_id: str
    household_id: Optional[str] = None


# ── Position ───────────────────────────────────────────────────

class UnifiedPositionResponse(BaseModel):
    symbol: str
    cusip: Optional[str] = None
    security_name: str
    asset_class: str
    total_quantity: float
    total_market_value: float
    total_cost_basis: float
    unrealized_gain_loss: Optional[float] = None
    accounts: List[Dict[str, Any]]


class PositionListResponse(BaseModel):
    positions: List[UnifiedPositionResponse]
    total_positions: int
    total_market_value: float
    total_cost_basis: float


# ── Asset Allocation ───────────────────────────────────────────

class AssetAllocationItem(BaseModel):
    asset_class: str
    market_value: float
    percentage: float


class AssetAllocationResponse(BaseModel):
    total_value: float
    allocation: List[AssetAllocationItem]


# ── Transaction ────────────────────────────────────────────────

class TransactionResponse(_CustodianBase):
    id: str
    account_id: str
    account_name: str
    custodian: str
    transaction_type: CustodianTransactionType
    symbol: Optional[str] = None
    security_name: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    gross_amount: float
    net_amount: float
    trade_date: datetime
    settlement_date: Optional[datetime] = None
    description: Optional[str] = None
    is_pending: bool


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    page_size: int


# ── Sync ───────────────────────────────────────────────────────

class SyncTriggerRequest(BaseModel):
    sync_type: str = "full"


class SyncLogResponse(_CustodianBase):
    id: str
    connection_id: str
    custodian_name: str
    sync_type: str
    status: SyncStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    accounts_synced: int
    positions_synced: int
    transactions_synced: int
    error_message: Optional[str] = None


class SyncLogListResponse(BaseModel):
    logs: List[SyncLogResponse]
    total: int


# ============================================================================
# HELPER: convert UUID → str for JSON-safe responses
# ============================================================================

def _s(value: Any) -> Optional[str]:
    """Convert UUID or any value to string, None-safe."""
    if value is None:
        return None
    return str(value)


# ============================================================================
# ENDPOINTS: Custodian Discovery
# ============================================================================

@router.get("/available", response_model=CustodianListResponse)
async def list_available_custodians(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all available custodian platforms for connection."""
    service = CustodianService(db)
    custodians = await service.get_available_custodians()
    return CustodianListResponse(
        custodians=[
            CustodianResponse(
                id=_s(c.id),
                custodian_type=c.custodian_type,
                display_name=c.display_name,
                supports_oauth=c.supports_oauth,
                supports_realtime=c.supports_realtime,
                is_active=c.is_active,
                maintenance_message=c.maintenance_message,
            )
            for c in custodians
        ],
        total=len(custodians),
    )


# ============================================================================
# ENDPOINTS: Connection Management
# ============================================================================

@router.post(
    "/connections/initiate",
    response_model=ConnectionInitiateResponse,
)
async def initiate_connection(
    request: ConnectionInitiateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Initiate OAuth connection to a custodian."""
    service = CustodianService(db)
    try:
        auth_url, state_token = await service.initiate_oauth(
            advisor_id=UUID(current_user["id"]),
            custodian_type=request.custodian_type,
            redirect_uri=request.redirect_uri,
        )
        return ConnectionInitiateResponse(
            authorization_url=auth_url,
            state=state_token,
            custodian_type=request.custodian_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/connections/complete",
    response_model=ConnectionResponse,
)
async def complete_connection(
    request: ConnectionCompleteRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Complete OAuth flow with authorization code."""
    service = CustodianService(db)
    try:
        connection = await service.complete_oauth(
            advisor_id=UUID(current_user["id"]),
            custodian_type=request.custodian_type,
            code=request.code,
            redirect_uri=request.redirect_uri,
        )
        # Re-fetch with custodian eagerly loaded
        result = await db.execute(
            select(CustodianConnection)
            .options(selectinload(CustodianConnection.custodian))
            .where(CustodianConnection.id == connection.id)
        )
        connection = result.scalar_one()
        return _connection_to_response(connection)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/connections", response_model=ConnectionListResponse)
async def list_connections(
    status_filter: Optional[ConnectionStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all custodian connections for the current advisor."""
    service = CustodianService(db)
    connections = await service.get_connections(UUID(current_user["id"]))
    if status_filter:
        connections = [c for c in connections if c.status == status_filter]
    return ConnectionListResponse(
        connections=[_connection_to_response(c) for c in connections],
        total=len(connections),
    )


@router.delete(
    "/connections/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def disconnect_custodian(
    connection_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Disconnect a custodian and revoke tokens."""
    conn_uuid = UUID(connection_id)
    # Verify ownership
    result = await db.execute(
        select(CustodianConnection).where(
            and_(
                CustodianConnection.id == conn_uuid,
                CustodianConnection.advisor_id == UUID(current_user["id"]),
            )
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Connection not found")

    service = CustodianService(db)
    if not await service.disconnect(conn_uuid):
        raise HTTPException(status_code=500, detail="Failed to disconnect")


# ============================================================================
# ENDPOINTS: Sync Operations
# ============================================================================

@router.post(
    "/connections/{connection_id}/sync",
    response_model=SyncLogResponse,
)
async def trigger_sync(
    connection_id: str,
    request: SyncTriggerRequest = SyncTriggerRequest(),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Trigger data sync for a custodian connection."""
    conn_uuid = UUID(connection_id)
    # Verify ownership + connected status
    result = await db.execute(
        select(CustodianConnection)
        .options(selectinload(CustodianConnection.custodian))
        .where(
            and_(
                CustodianConnection.id == conn_uuid,
                CustodianConnection.advisor_id == UUID(current_user["id"]),
            )
        )
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    if connection.status != ConnectionStatus.CONNECTED:
        raise HTTPException(status_code=400, detail="Connection is not active")

    service = CustodianService(db)
    sync_log = await service.sync_connection(conn_uuid, request.sync_type)
    return _sync_log_to_response(sync_log, connection.custodian.display_name)


@router.get(
    "/connections/{connection_id}/sync-logs",
    response_model=SyncLogListResponse,
)
async def get_sync_logs(
    connection_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get sync history for a connection."""
    conn_uuid = UUID(connection_id)
    # Verify ownership
    result = await db.execute(
        select(CustodianConnection)
        .options(selectinload(CustodianConnection.custodian))
        .where(
            and_(
                CustodianConnection.id == conn_uuid,
                CustodianConnection.advisor_id == UUID(current_user["id"]),
            )
        )
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    logs_result = await db.execute(
        select(CustodianSyncLog)
        .where(CustodianSyncLog.connection_id == conn_uuid)
        .order_by(CustodianSyncLog.started_at.desc())
        .limit(limit)
    )
    logs = list(logs_result.scalars().all())

    return SyncLogListResponse(
        logs=[
            _sync_log_to_response(log, connection.custodian.display_name)
            for log in logs
        ],
        total=len(logs),
    )


# ============================================================================
# ENDPOINTS: Account Management
# ============================================================================

@router.get("/accounts", response_model=AccountListResponse)
async def list_accounts(
    client_id: Optional[str] = None,
    household_id: Optional[str] = None,
    unmapped_only: bool = Query(False),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all custodian accounts across connections."""
    query = (
        select(CustodianAccount)
        .join(CustodianConnection)
        .options(
            selectinload(CustodianAccount.connection).selectinload(
                CustodianConnection.custodian
            )
        )
        .where(
            and_(
                CustodianConnection.advisor_id == UUID(current_user["id"]),
                CustodianAccount.is_active == True,  # noqa: E712
            )
        )
    )
    if client_id:
        query = query.where(CustodianAccount.client_id == UUID(client_id))
    if household_id:
        query = query.where(
            CustodianAccount.household_id == UUID(household_id)
        )
    if unmapped_only:
        query = query.where(CustodianAccount.client_id == None)  # noqa: E711

    result = await db.execute(query)
    accounts = list(result.scalars().all())

    total_mv = sum(float(a.market_value) for a in accounts)
    total_cash = sum(float(a.cash_balance) for a in accounts)

    return AccountListResponse(
        accounts=[_account_to_response(a) for a in accounts],
        total=len(accounts),
        total_market_value=total_mv,
        total_cash_balance=total_cash,
    )


@router.patch("/accounts/{account_id}/map", response_model=AccountResponse)
async def map_account_to_client(
    account_id: str,
    request: AccountMapRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Map a custodian account to a client (and optionally a household)."""
    acct_uuid = UUID(account_id)
    # Verify ownership
    result = await db.execute(
        select(CustodianAccount)
        .join(CustodianConnection)
        .options(
            selectinload(CustodianAccount.connection).selectinload(
                CustodianConnection.custodian
            )
        )
        .where(
            and_(
                CustodianAccount.id == acct_uuid,
                CustodianConnection.advisor_id == UUID(current_user["id"]),
            )
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    service = CustodianService(db)
    await service.map_account_to_client(
        acct_uuid,
        UUID(request.client_id),
        UUID(request.household_id) if request.household_id else None,
    )

    # Re-fetch with relationships
    result = await db.execute(
        select(CustodianAccount)
        .options(
            selectinload(CustodianAccount.connection).selectinload(
                CustodianConnection.custodian
            )
        )
        .where(CustodianAccount.id == acct_uuid)
    )
    account = result.scalar_one()
    return _account_to_response(account)


# ============================================================================
# ENDPOINTS: Unified Portfolio Views
# ============================================================================

@router.get("/positions", response_model=PositionListResponse)
async def get_unified_positions(
    client_id: Optional[str] = None,
    household_id: Optional[str] = None,
    asset_class: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get unified positions across all custodians, aggregated by symbol."""
    service = CustodianService(db)
    positions = await service.get_unified_positions(
        advisor_id=UUID(current_user["id"]),
        client_id=UUID(client_id) if client_id else None,
        household_id=UUID(household_id) if household_id else None,
    )

    if asset_class:
        positions = [p for p in positions if p["asset_class"] == asset_class]

    return PositionListResponse(
        positions=[UnifiedPositionResponse(**p) for p in positions],
        total_positions=len(positions),
        total_market_value=sum(p["total_market_value"] for p in positions),
        total_cost_basis=sum(p["total_cost_basis"] for p in positions),
    )


@router.get("/asset-allocation", response_model=AssetAllocationResponse)
async def get_asset_allocation(
    client_id: Optional[str] = None,
    household_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get portfolio asset allocation breakdown across all custodians."""
    service = CustodianService(db)
    allocation = await service.get_asset_allocation(
        advisor_id=UUID(current_user["id"]),
        client_id=UUID(client_id) if client_id else None,
        household_id=UUID(household_id) if household_id else None,
    )
    return AssetAllocationResponse(
        total_value=allocation["total_value"],
        allocation=[
            AssetAllocationItem(**item) for item in allocation["allocation"]
        ],
    )


# ============================================================================
# ENDPOINTS: Transactions
# ============================================================================

@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    account_id: Optional[str] = None,
    client_id: Optional[str] = None,
    transaction_type: Optional[CustodianTransactionType] = None,
    symbol: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get transactions with filtering and pagination."""
    query = (
        select(AggregatedTransaction)
        .join(CustodianAccount)
        .join(CustodianConnection)
        .options(
            selectinload(AggregatedTransaction.account)
            .selectinload(CustodianAccount.connection)
            .selectinload(CustodianConnection.custodian)
        )
        .where(CustodianConnection.advisor_id == UUID(current_user["id"]))
    )

    if account_id:
        query = query.where(
            AggregatedTransaction.account_id == UUID(account_id)
        )
    if client_id:
        query = query.where(CustodianAccount.client_id == UUID(client_id))
    if transaction_type:
        query = query.where(
            AggregatedTransaction.transaction_type == transaction_type
        )
    if symbol:
        query = query.where(
            AggregatedTransaction.symbol == symbol.upper()
        )
    if start_date:
        query = query.where(AggregatedTransaction.trade_date >= start_date)
    if end_date:
        query = query.where(AggregatedTransaction.trade_date <= end_date)

    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar() or 0

    # Paginated results
    query = (
        query.order_by(AggregatedTransaction.trade_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    transactions = list(result.scalars().all())

    return TransactionListResponse(
        transactions=[_transaction_to_response(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# RESPONSE BUILDERS
# ============================================================================

def _connection_to_response(c: CustodianConnection) -> ConnectionResponse:
    return ConnectionResponse(
        id=_s(c.id),
        custodian_id=_s(c.custodian_id),
        custodian_type=c.custodian.custodian_type,
        custodian_name=c.custodian.display_name,
        status=c.status,
        last_sync_at=c.last_sync_at,
        last_sync_status=c.last_sync_status,
        last_error=c.last_error,
        sync_frequency_minutes=c.sync_frequency_minutes,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


def _account_to_response(a: CustodianAccount) -> AccountResponse:
    return AccountResponse(
        id=_s(a.id),
        connection_id=_s(a.connection_id),
        custodian_type=a.connection.custodian.custodian_type,
        custodian_name=a.connection.custodian.display_name,
        external_account_id=a.external_account_id,
        account_name=a.account_name,
        account_type=a.account_type,
        tax_status=a.tax_status,
        market_value=float(a.market_value),
        cash_balance=float(a.cash_balance),
        client_id=_s(a.client_id),
        household_id=_s(a.household_id),
        is_active=a.is_active,
        last_sync_at=a.connection.last_sync_at,
    )


def _sync_log_to_response(
    log: CustodianSyncLog, custodian_name: str
) -> SyncLogResponse:
    return SyncLogResponse(
        id=_s(log.id),
        connection_id=_s(log.connection_id),
        custodian_name=custodian_name,
        sync_type=log.sync_type,
        status=log.status,
        started_at=log.started_at,
        completed_at=log.completed_at,
        duration_seconds=log.duration_seconds,
        accounts_synced=log.accounts_synced,
        positions_synced=log.positions_synced,
        transactions_synced=log.transactions_synced,
        error_message=log.error_message,
    )


def _transaction_to_response(t: AggregatedTransaction) -> TransactionResponse:
    return TransactionResponse(
        id=_s(t.id),
        account_id=_s(t.account_id),
        account_name=t.account.account_name,
        custodian=t.account.connection.custodian.display_name,
        transaction_type=t.transaction_type,
        symbol=t.symbol,
        security_name=t.security_name,
        quantity=float(t.quantity) if t.quantity else None,
        price=float(t.price) if t.price else None,
        gross_amount=float(t.gross_amount),
        net_amount=float(t.net_amount),
        trade_date=t.trade_date,
        settlement_date=t.settlement_date,
        description=t.description,
        is_pending=t.is_pending,
    )
