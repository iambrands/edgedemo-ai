"""
Main custodian service — orchestrates connections, syncs, and unified views.

Follows patterns from services/meeting_service.py:
  - Accepts AsyncSession in __init__
  - Uses SQLAlchemy select() with async execution
  - Returns model instances or dicts for API serialization
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.custodian import (
    AggregatedPosition,
    AggregatedTransaction,
    ConnectionStatus,
    Custodian,
    CustodianAccount,
    CustodianConnection,
    CustodianSyncLog,
    CustodianType,
    SyncStatus,
)
from .adapters import get_adapter
from .base_adapter import RawAccount, RawPosition, RawTransaction
from .encryption_service import encryption_service
from .normalizer import normalizer

logger = logging.getLogger(__name__)


class CustodianService:
    """Main service for multi-custodian aggregation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ═════════════════════════════════════════════════════════════
    # Connection Management
    # ═════════════════════════════════════════════════════════════

    async def get_available_custodians(self) -> List[Custodian]:
        """Return all active custodian platforms."""
        result = await self.db.execute(
            select(Custodian).where(Custodian.is_active == True)  # noqa: E712
        )
        return list(result.scalars().all())

    async def initiate_oauth(
        self,
        advisor_id: uuid.UUID,
        custodian_type: CustodianType,
        redirect_uri: str,
    ) -> tuple:
        """
        Initiate OAuth flow for a custodian.
        Returns (authorization_url, state_token).
        """
        adapter = get_adapter(custodian_type)
        state = str(uuid.uuid4())

        custodian = await self._get_custodian_by_type(custodian_type)

        connection = CustodianConnection(
            advisor_id=advisor_id,
            custodian_id=custodian.id,
            status=ConnectionStatus.PENDING,
        )
        self.db.add(connection)
        await self.db.commit()
        await self.db.refresh(connection)

        auth_url = await adapter.get_authorization_url(state, redirect_uri)
        logger.info(
            "OAuth initiated for advisor=%s custodian=%s",
            advisor_id,
            custodian_type.value,
        )
        return auth_url, state

    async def complete_oauth(
        self,
        advisor_id: uuid.UUID,
        custodian_type: CustodianType,
        code: str,
        redirect_uri: str,
    ) -> CustodianConnection:
        """Complete OAuth flow by exchanging authorization code for tokens."""
        adapter = get_adapter(custodian_type)
        tokens = await adapter.exchange_code_for_tokens(code, redirect_uri)

        custodian = await self._get_custodian_by_type(custodian_type)

        # Find the pending connection
        result = await self.db.execute(
            select(CustodianConnection).where(
                and_(
                    CustodianConnection.advisor_id == advisor_id,
                    CustodianConnection.custodian_id == custodian.id,
                    CustodianConnection.status == ConnectionStatus.PENDING,
                )
            )
        )
        connection = result.scalar_one()

        # Store encrypted tokens
        connection.access_token_encrypted = encryption_service.encrypt(
            tokens.access_token
        )
        if tokens.refresh_token:
            connection.refresh_token_encrypted = encryption_service.encrypt(
                tokens.refresh_token
            )
        connection.token_expires_at = tokens.expires_at
        connection.token_scope = tokens.scope
        connection.status = ConnectionStatus.CONNECTED

        await self.db.commit()
        await self.db.refresh(connection)

        # Kick off initial sync in background
        asyncio.create_task(self._background_sync(connection.id))

        logger.info(
            "OAuth completed for advisor=%s custodian=%s connection=%s",
            advisor_id,
            custodian_type.value,
            connection.id,
        )
        return connection

    async def disconnect(self, connection_id: uuid.UUID) -> bool:
        """Disconnect and revoke a custodian connection."""
        connection = await self._get_connection(connection_id)
        if not connection:
            return False

        # Attempt token revocation (best-effort)
        if connection.access_token_encrypted:
            try:
                adapter = get_adapter(connection.custodian.custodian_type)
                access_token = encryption_service.decrypt(
                    connection.access_token_encrypted
                )
                await adapter.revoke_tokens(access_token)
            except Exception:
                logger.warning(
                    "Token revocation failed for connection=%s", connection_id
                )

        connection.status = ConnectionStatus.REVOKED
        connection.access_token_encrypted = None
        connection.refresh_token_encrypted = None
        await self.db.commit()

        logger.info("Disconnected connection=%s", connection_id)
        return True

    async def get_connections(
        self, advisor_id: uuid.UUID
    ) -> List[CustodianConnection]:
        """List all custodian connections for an advisor."""
        result = await self.db.execute(
            select(CustodianConnection)
            .options(selectinload(CustodianConnection.custodian))
            .where(CustodianConnection.advisor_id == advisor_id)
        )
        return list(result.scalars().all())

    # ═════════════════════════════════════════════════════════════
    # Sync Operations
    # ═════════════════════════════════════════════════════════════

    async def sync_connection(
        self, connection_id: uuid.UUID, sync_type: str = "full"
    ) -> CustodianSyncLog:
        """
        Synchronize data from a custodian connection.
        Returns the sync log entry for auditing.
        """
        connection = await self._get_connection(connection_id)
        if not connection or connection.status != ConnectionStatus.CONNECTED:
            raise ValueError(
                f"Invalid or disconnected connection: {connection_id}"
            )

        # Create sync log
        sync_log = CustodianSyncLog(
            connection_id=connection_id,
            sync_type=sync_type,
            status=SyncStatus.SYNCING,
            started_at=datetime.utcnow(),
        )
        self.db.add(sync_log)
        await self.db.commit()
        await self.db.refresh(sync_log)

        try:
            # Refresh tokens if needed
            await self._ensure_valid_tokens(connection)

            adapter = get_adapter(connection.custodian.custodian_type)
            access_token = encryption_service.decrypt(
                connection.access_token_encrypted
            )

            # Full sync via adapter
            result = await adapter.full_sync(access_token)
            if not result.success:
                raise Exception(result.error_message or "Sync failed")

            # Upsert accounts
            for raw_account in result.accounts:
                await self._upsert_account(connection, raw_account)

            # Upsert positions (clear + recreate for accuracy)
            for account_ext_id, positions in result.positions.items():
                account = await self._get_account_by_external_id(
                    connection.id, account_ext_id
                )
                if account:
                    await self._clear_positions(account.id)
                    for raw_position in positions:
                        await self._create_position(account, raw_position)

            # Upsert transactions
            for account_ext_id, transactions in result.transactions.items():
                account = await self._get_account_by_external_id(
                    connection.id, account_ext_id
                )
                if account:
                    for raw_txn in transactions:
                        await self._upsert_transaction(account, raw_txn)

            # Mark success
            sync_log.status = SyncStatus.SUCCESS
            sync_log.accounts_synced = len(result.accounts)
            sync_log.positions_synced = sum(
                len(p) for p in result.positions.values()
            )
            sync_log.transactions_synced = sum(
                len(t) for t in result.transactions.values()
            )
            sync_log.api_calls_made = result.api_calls_made

            connection.last_sync_at = datetime.utcnow()
            connection.last_sync_status = SyncStatus.SUCCESS

            logger.info(
                "Sync completed connection=%s accounts=%d positions=%d txns=%d",
                connection_id,
                sync_log.accounts_synced,
                sync_log.positions_synced,
                sync_log.transactions_synced,
            )

        except Exception as exc:
            sync_log.status = SyncStatus.FAILED
            sync_log.error_code = type(exc).__name__
            sync_log.error_message = str(exc)

            connection.last_sync_status = SyncStatus.FAILED
            connection.last_error = str(exc)
            connection.last_error_at = datetime.utcnow()

            logger.exception(
                "Sync failed connection=%s: %s", connection_id, exc
            )

        finally:
            sync_log.completed_at = datetime.utcnow()
            if sync_log.started_at:
                sync_log.duration_seconds = int(
                    (sync_log.completed_at - sync_log.started_at).total_seconds()
                )
            await self.db.commit()

        return sync_log

    async def _background_sync(self, connection_id: uuid.UUID) -> None:
        """Fire-and-forget sync wrapper for asyncio.create_task."""
        try:
            await self.sync_connection(connection_id)
        except Exception:
            logger.exception(
                "Background sync failed for connection=%s", connection_id
            )

    async def _ensure_valid_tokens(
        self, connection: CustodianConnection
    ) -> None:
        """Refresh tokens if they are about to expire."""
        if not connection.token_expires_at:
            return
        if connection.token_expires_at < datetime.utcnow() + timedelta(
            minutes=5
        ):
            adapter = get_adapter(connection.custodian.custodian_type)
            refresh_token = encryption_service.decrypt(
                connection.refresh_token_encrypted or ""
            )
            if not refresh_token:
                raise ValueError("No refresh token available for token renewal")

            tokens = await adapter.refresh_tokens(refresh_token)
            connection.access_token_encrypted = encryption_service.encrypt(
                tokens.access_token
            )
            if tokens.refresh_token:
                connection.refresh_token_encrypted = encryption_service.encrypt(
                    tokens.refresh_token
                )
            connection.token_expires_at = tokens.expires_at
            await self.db.commit()

            logger.info("Tokens refreshed for connection=%s", connection.id)

    # ═════════════════════════════════════════════════════════════
    # Unified Portfolio Views
    # ═════════════════════════════════════════════════════════════

    async def get_unified_positions(
        self,
        advisor_id: uuid.UUID,
        client_id: Optional[uuid.UUID] = None,
        household_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get unified position view across all custodians.
        Aggregates by symbol for a cross-custodian total.
        """
        query = (
            select(AggregatedPosition)
            .join(CustodianAccount)
            .join(CustodianConnection)
            .where(CustodianConnection.advisor_id == advisor_id)
        )
        if client_id:
            query = query.where(CustodianAccount.client_id == client_id)
        if household_id:
            query = query.where(CustodianAccount.household_id == household_id)

        result = await self.db.execute(query)
        positions = result.scalars().all()

        # Aggregate by symbol
        aggregated: Dict[str, Dict[str, Any]] = {}
        for pos in positions:
            key = pos.symbol
            if key not in aggregated:
                aggregated[key] = {
                    "symbol": pos.symbol,
                    "cusip": pos.cusip,
                    "security_name": pos.security_name,
                    "asset_class": pos.asset_class.value if pos.asset_class else "other",
                    "total_quantity": Decimal("0"),
                    "total_market_value": Decimal("0"),
                    "total_cost_basis": Decimal("0"),
                    "accounts": [],
                }
            aggregated[key]["total_quantity"] += pos.quantity
            aggregated[key]["total_market_value"] += pos.market_value
            if pos.cost_basis:
                aggregated[key]["total_cost_basis"] += pos.cost_basis
            aggregated[key]["accounts"].append(
                {
                    "account_id": str(pos.account_id),
                    "quantity": float(pos.quantity),
                    "market_value": float(pos.market_value),
                }
            )

        # Convert decimals to floats for JSON serialization
        for data in aggregated.values():
            if data["total_cost_basis"] > 0:
                data["unrealized_gain_loss"] = float(
                    data["total_market_value"] - data["total_cost_basis"]
                )
            else:
                data["unrealized_gain_loss"] = None
            data["total_quantity"] = float(data["total_quantity"])
            data["total_market_value"] = float(data["total_market_value"])
            data["total_cost_basis"] = float(data["total_cost_basis"])

        return list(aggregated.values())

    async def get_asset_allocation(
        self,
        advisor_id: uuid.UUID,
        client_id: Optional[uuid.UUID] = None,
        household_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Calculate asset allocation across all custodians.
        Returns total value and percentage breakdown by asset class.
        """
        positions = await self.get_unified_positions(
            advisor_id, client_id, household_id
        )
        allocation: Dict[str, Decimal] = {}
        total_value = Decimal("0")

        for pos in positions:
            asset_class = pos["asset_class"]
            market_value = Decimal(str(pos["total_market_value"]))
            allocation[asset_class] = (
                allocation.get(asset_class, Decimal("0")) + market_value
            )
            total_value += market_value

        result: Dict[str, Any] = {
            "total_value": float(total_value),
            "allocation": [],
        }
        for asset_class, value in allocation.items():
            pct = (
                (value / total_value * 100) if total_value > 0 else Decimal("0")
            )
            result["allocation"].append(
                {
                    "asset_class": asset_class,
                    "market_value": float(value),
                    "percentage": float(pct),
                }
            )
        result["allocation"].sort(key=lambda x: x["market_value"], reverse=True)
        return result

    async def get_account_summary(
        self, advisor_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """Get summary of all custodian accounts for an advisor."""
        result = await self.db.execute(
            select(CustodianAccount)
            .join(CustodianConnection)
            .options(
                selectinload(CustodianAccount.connection).selectinload(
                    CustodianConnection.custodian
                )
            )
            .where(
                and_(
                    CustodianConnection.advisor_id == advisor_id,
                    CustodianAccount.is_active == True,  # noqa: E712
                )
            )
        )
        accounts = result.scalars().all()
        return [
            {
                "id": str(a.id),
                "custodian": a.connection.custodian.display_name,
                "account_name": a.account_name,
                "account_type": a.account_type.value if a.account_type else "individual",
                "market_value": float(a.market_value),
                "cash_balance": float(a.cash_balance),
                "client_id": str(a.client_id) if a.client_id else None,
                "household_id": str(a.household_id) if a.household_id else None,
                "is_managed": a.is_managed,
            }
            for a in accounts
        ]

    async def map_account_to_client(
        self,
        account_id: uuid.UUID,
        client_id: uuid.UUID,
        household_id: Optional[uuid.UUID] = None,
    ) -> CustodianAccount:
        """Map a custodian account to a client (and optionally a household)."""
        result = await self.db.execute(
            select(CustodianAccount).where(CustodianAccount.id == account_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise ValueError(f"Account not found: {account_id}")

        account.client_id = client_id
        account.household_id = household_id
        await self.db.commit()
        await self.db.refresh(account)

        logger.info(
            "Account %s mapped to client=%s household=%s",
            account_id,
            client_id,
            household_id,
        )
        return account

    # ═════════════════════════════════════════════════════════════
    # Private Helpers
    # ═════════════════════════════════════════════════════════════

    async def _get_custodian_by_type(
        self, custodian_type: CustodianType
    ) -> Custodian:
        result = await self.db.execute(
            select(Custodian).where(
                Custodian.custodian_type == custodian_type
            )
        )
        custodian = result.scalar_one_or_none()
        if not custodian:
            raise ValueError(f"Custodian not found: {custodian_type.value}")
        return custodian

    async def _get_connection(
        self, connection_id: uuid.UUID
    ) -> Optional[CustodianConnection]:
        result = await self.db.execute(
            select(CustodianConnection)
            .options(selectinload(CustodianConnection.custodian))
            .where(CustodianConnection.id == connection_id)
        )
        return result.scalar_one_or_none()

    async def _get_account_by_external_id(
        self, connection_id: uuid.UUID, external_account_id: str
    ) -> Optional[CustodianAccount]:
        result = await self.db.execute(
            select(CustodianAccount).where(
                and_(
                    CustodianAccount.connection_id == connection_id,
                    CustodianAccount.external_account_id == external_account_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _upsert_account(
        self, connection: CustodianConnection, raw: RawAccount
    ) -> CustodianAccount:
        """Create or update a custodian account from raw adapter data."""
        account = await self._get_account_by_external_id(
            connection.id, raw.external_account_id
        )
        account_type = normalizer.normalize_account_type(raw.account_type)

        if account:
            # Update existing
            account.account_name = raw.account_name
            account.market_value = raw.market_value
            account.cash_balance = raw.cash_balance
            account.custodian_metadata = raw.raw_metadata
        else:
            # Create new
            account = CustodianAccount(
                connection_id=connection.id,
                external_account_id=raw.external_account_id,
                external_account_number=raw.external_account_number,
                account_name=raw.account_name,
                account_type=account_type,
                tax_status=normalizer.infer_tax_status(account_type),
                market_value=raw.market_value,
                cash_balance=raw.cash_balance,
                primary_owner_name=raw.primary_owner_name,
                primary_owner_ssn_last4=raw.primary_owner_ssn_last4,
                joint_owner_name=raw.joint_owner_name,
                custodian_metadata=raw.raw_metadata,
            )
            self.db.add(account)

        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def _clear_positions(self, account_id: uuid.UUID) -> None:
        """Delete all positions for an account (before re-creating from sync)."""
        result = await self.db.execute(
            select(AggregatedPosition).where(
                AggregatedPosition.account_id == account_id
            )
        )
        for pos in result.scalars().all():
            await self.db.delete(pos)
        await self.db.commit()

    async def _create_position(
        self, account: CustodianAccount, raw: RawPosition
    ) -> AggregatedPosition:
        """Create a normalized position from raw adapter data."""
        asset_class = normalizer.normalize_asset_class(raw.security_type)
        unrealized_gl, unrealized_gl_pct = (
            normalizer.calculate_unrealized_gain_loss(
                raw.market_value, raw.cost_basis
            )
        )

        position = AggregatedPosition(
            account_id=account.id,
            symbol=raw.symbol,
            cusip=raw.cusip,
            isin=raw.isin,
            security_name=raw.security_name,
            security_type=raw.security_type,
            asset_class=asset_class,
            position_type=raw.position_type,
            quantity=raw.quantity,
            price=raw.price,
            price_as_of=raw.price_as_of,
            market_value=raw.market_value,
            cost_basis=raw.cost_basis,
            cost_basis_per_share=raw.cost_basis_per_share,
            unrealized_gain_loss=unrealized_gl,
            unrealized_gain_loss_pct=unrealized_gl_pct,
            external_position_id=raw.external_position_id,
            custodian_metadata=raw.raw_metadata,
        )
        self.db.add(position)
        await self.db.commit()
        await self.db.refresh(position)
        return position

    async def _upsert_transaction(
        self, account: CustodianAccount, raw: RawTransaction
    ) -> AggregatedTransaction:
        """Create or update a normalized transaction from raw adapter data."""
        result = await self.db.execute(
            select(AggregatedTransaction).where(
                and_(
                    AggregatedTransaction.account_id == account.id,
                    AggregatedTransaction.external_transaction_id
                    == raw.external_transaction_id,
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update settlement and pending status only
            existing.settlement_date = raw.settlement_date
            existing.is_pending = raw.is_pending
            await self.db.commit()
            return existing

        transaction = AggregatedTransaction(
            account_id=account.id,
            external_transaction_id=raw.external_transaction_id,
            transaction_type=normalizer.normalize_transaction_type(
                raw.transaction_type
            ),
            symbol=raw.symbol,
            cusip=raw.cusip,
            security_name=raw.security_name,
            quantity=raw.quantity,
            price=raw.price,
            gross_amount=raw.gross_amount,
            net_amount=raw.net_amount,
            commission=raw.commission,
            fees=raw.fees,
            trade_date=raw.transaction_date,
            settlement_date=raw.settlement_date,
            description=raw.description,
            is_pending=raw.is_pending,
            custodian_metadata=raw.raw_metadata,
        )
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)
        return transaction
