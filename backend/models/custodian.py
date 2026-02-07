"""
Multi-Custodian Aggregation Models.
Normalized data model for positions/transactions across custodians.
"""

import enum
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, Numeric,
    String, Text, UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS (prefixed to avoid conflicts with enums.py)
# ============================================================================

class CustodianType(str, enum.Enum):
    """Supported custodian platforms."""
    SCHWAB = "schwab"
    FIDELITY = "fidelity"
    PERSHING = "pershing"
    TD_AMERITRADE = "td_ameritrade"
    INTERACTIVE_BROKERS = "interactive_brokers"
    APEX = "apex"
    ALTRUIST = "altruist"
    MANUAL = "manual"


class ConnectionStatus(str, enum.Enum):
    """OAuth/API connection status."""
    PENDING = "pending"
    CONNECTED = "connected"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"


class SyncStatus(str, enum.Enum):
    """Data synchronization status."""
    IDLE = "idle"
    SYNCING = "syncing"
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class CustodianAssetClass(str, enum.Enum):
    """Normalized asset classifications for custodian positions."""
    EQUITY = "equity"
    FIXED_INCOME = "fixed_income"
    CASH = "cash"
    ALTERNATIVES = "alternatives"
    REAL_ESTATE = "real_estate"
    COMMODITIES = "commodities"
    CRYPTO = "crypto"
    OPTIONS = "options"
    FUTURES = "futures"
    MUTUAL_FUND = "mutual_fund"
    ETF = "etf"
    OTHER = "other"


class CustodianTransactionType(str, enum.Enum):
    """Normalized transaction types for custodian data."""
    BUY = "buy"
    SELL = "sell"
    DIVIDEND = "dividend"
    INTEREST = "interest"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    FEE = "fee"
    TAX = "tax"
    SPLIT = "split"
    MERGER = "merger"
    SPINOFF = "spinoff"
    EXERCISE = "exercise"
    ASSIGNMENT = "assignment"
    EXPIRATION = "expiration"
    OTHER = "other"


class CustodianAccountType(str, enum.Enum):
    """Account registration types at custodians."""
    INDIVIDUAL = "individual"
    JOINT = "joint"
    IRA_TRADITIONAL = "ira_traditional"
    IRA_ROTH = "ira_roth"
    IRA_SEP = "ira_sep"
    IRA_SIMPLE = "ira_simple"
    IRA_INHERITED = "ira_inherited"
    ROLLOVER = "rollover"
    TRUST = "trust"
    CUSTODIAL = "custodial"
    CORPORATE = "corporate"
    PARTNERSHIP = "partnership"
    PENSION = "pension"
    PROFIT_SHARING = "profit_sharing"
    ANNUITY = "annuity"
    EDUCATION_529 = "education_529"
    EDUCATION_ESA = "education_esa"
    HSA = "hsa"
    OTHER = "other"


# ============================================================================
# MODELS
# ============================================================================

class Custodian(Base, TimestampMixin):
    """
    Supported custodian platforms with integration configuration.
    Seeded data - not user-modifiable.
    """
    __tablename__ = "custodians"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    custodian_type: Mapped[CustodianType] = mapped_column(
        SQLEnum(CustodianType), unique=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Integration configuration
    api_base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    oauth_authorization_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    oauth_token_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    oauth_scopes: Mapped[Optional[list]] = mapped_column(JSONB, default=list, nullable=True)

    # Feature flags
    supports_oauth: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_realtime: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_transactions: Mapped[bool] = mapped_column(Boolean, default=True)
    supports_cost_basis: Mapped[bool] = mapped_column(Boolean, default=True)

    # Rate limiting
    rate_limit_requests: Mapped[int] = mapped_column(Integer, default=100)
    rate_limit_window_seconds: Mapped[int] = mapped_column(Integer, default=60)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    maintenance_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    connections: Mapped[List["CustodianConnection"]] = relationship(
        back_populates="custodian"
    )


class CustodianConnection(Base, TimestampMixin):
    """
    Advisor's authenticated connection to a custodian.
    Stores OAuth tokens or API credentials (encrypted at application layer).
    """
    __tablename__ = "custodian_connections"
    __table_args__ = (
        UniqueConstraint(
            "advisor_id", "custodian_id", "external_rep_id",
            name="uq_advisor_custodian_rep"
        ),
        Index("ix_custodian_connections_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )
    custodian_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("custodians.id"), nullable=False
    )

    # External identifiers
    external_rep_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    external_firm_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # OAuth tokens (encrypted at rest via application layer)
    access_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    token_scope: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # API credentials (for non-OAuth custodians, encrypted)
    api_key_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    api_secret_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Connection status
    status: Mapped[ConnectionStatus] = mapped_column(
        SQLEnum(ConnectionStatus), default=ConnectionStatus.PENDING, nullable=False
    )
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_error_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Sync tracking
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_status: Mapped[Optional[SyncStatus]] = mapped_column(
        SQLEnum(SyncStatus), nullable=True
    )
    sync_frequency_minutes: Mapped[int] = mapped_column(Integer, default=60)

    # Relationships
    custodian: Mapped["Custodian"] = relationship(back_populates="connections")
    accounts: Mapped[List["CustodianAccount"]] = relationship(
        back_populates="connection", cascade="all, delete-orphan"
    )
    sync_logs: Mapped[List["CustodianSyncLog"]] = relationship(
        back_populates="connection", cascade="all, delete-orphan"
    )


class CustodianAccount(Base, TimestampMixin):
    """
    Individual accounts at a custodian.
    Maps to client households for unified views.
    """
    __tablename__ = "custodian_accounts"
    __table_args__ = (
        UniqueConstraint(
            "connection_id", "external_account_id",
            name="uq_connection_account"
        ),
        Index("ix_custodian_accounts_client", "client_id"),
        Index("ix_custodian_accounts_household", "household_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    connection_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("custodian_connections.id"), nullable=False
    )

    # Client mapping (nullable until mapped)
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    household_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )

    # External identifiers
    external_account_id: Mapped[str] = mapped_column(String(100), nullable=False)
    external_account_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # Account details
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[CustodianAccountType] = mapped_column(
        SQLEnum(CustodianAccountType), default=CustodianAccountType.INDIVIDUAL
    )
    tax_status: Mapped[str] = mapped_column(String(50), default="taxable")

    # Ownership
    primary_owner_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    primary_owner_ssn_last4: Mapped[Optional[str]] = mapped_column(
        String(4), nullable=True
    )
    joint_owner_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Account values (updated on sync)
    market_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    cash_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    buying_power: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    margin_balance: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Dates
    account_opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_managed: Mapped[bool] = mapped_column(Boolean, default=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    # Custodian-specific metadata
    custodian_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )

    # Relationships
    connection: Mapped["CustodianConnection"] = relationship(
        back_populates="accounts"
    )
    positions: Mapped[List["AggregatedPosition"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    transactions: Mapped[List["AggregatedTransaction"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class AggregatedPosition(Base, TimestampMixin):
    """
    Normalized position data across custodians.
    Enables unified portfolio analysis regardless of custodian.
    """
    __tablename__ = "aggregated_positions"
    __table_args__ = (
        UniqueConstraint(
            "account_id", "symbol", "position_type",
            name="uq_account_position"
        ),
        Index("ix_aggregated_positions_symbol", "symbol"),
        Index("ix_aggregated_positions_cusip", "cusip"),
        Index("ix_aggregated_positions_asset_class", "asset_class"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("custodian_accounts.id"), nullable=False
    )

    # Security identifiers (normalized)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    cusip: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    sedol: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

    # Security details
    security_name: Mapped[str] = mapped_column(String(255), nullable=False)
    security_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    asset_class: Mapped[CustodianAssetClass] = mapped_column(
        SQLEnum(CustodianAssetClass), default=CustodianAssetClass.OTHER
    )

    # Position details
    position_type: Mapped[str] = mapped_column(String(20), default="long")
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)

    # Pricing
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0"))
    price_as_of: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    market_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Cost basis
    cost_basis: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    cost_basis_per_share: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 6), nullable=True
    )
    unrealized_gain_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    unrealized_gain_loss_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )

    # Tax lots summary
    short_term_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 6), nullable=True
    )
    long_term_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 6), nullable=True
    )
    short_term_gain_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    long_term_gain_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Income
    yield_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    annual_income: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # External reference
    external_position_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    custodian_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )

    # Relationships
    account: Mapped["CustodianAccount"] = relationship(
        back_populates="positions"
    )


class AggregatedTransaction(Base, TimestampMixin):
    """
    Normalized transaction data across custodians.
    Enables unified reporting and tax-loss harvesting analysis.
    """
    __tablename__ = "aggregated_transactions"
    __table_args__ = (
        Index("ix_aggregated_transactions_account", "account_id"),
        Index("ix_aggregated_transactions_date", "trade_date"),
        Index("ix_aggregated_transactions_symbol", "symbol"),
        Index("ix_aggregated_transactions_type", "transaction_type"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("custodian_accounts.id"), nullable=False
    )

    # External reference
    external_transaction_id: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    # Transaction type
    transaction_type: Mapped[CustodianTransactionType] = mapped_column(
        SQLEnum(CustodianTransactionType), nullable=False
    )
    transaction_subtype: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # Security identifiers
    symbol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cusip: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    security_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Transaction details
    quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 6), nullable=True
    )
    price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 6), nullable=True
    )
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    # Fees and adjustments
    commission: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), default=Decimal("0"), nullable=True
    )
    fees: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), default=Decimal("0"), nullable=True
    )

    # Dates
    trade_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    settlement_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Cost basis (for sells)
    cost_basis: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    realized_gain_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    gain_loss_type: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    wash_sale_disallowed: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    is_pending: Mapped[bool] = mapped_column(Boolean, default=False)
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Custodian metadata
    custodian_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )

    # Relationships
    account: Mapped["CustodianAccount"] = relationship(
        back_populates="transactions"
    )


class CustodianSyncLog(Base):
    """
    Audit trail for sync operations.
    Used for debugging and monitoring integration health.
    """
    __tablename__ = "custodian_sync_logs"
    __table_args__ = (
        Index("ix_custodian_sync_logs_connection", "connection_id"),
        Index("ix_custodian_sync_logs_started_at", "started_at"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    connection_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("custodian_connections.id"), nullable=False
    )

    # Sync details
    sync_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[SyncStatus] = mapped_column(
        SQLEnum(SyncStatus), nullable=False
    )

    # Timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Metrics
    accounts_synced: Mapped[int] = mapped_column(Integer, default=0)
    positions_synced: Mapped[int] = mapped_column(Integer, default=0)
    transactions_synced: Mapped[int] = mapped_column(Integer, default=0)

    # Errors
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # API metrics
    api_calls_made: Mapped[int] = mapped_column(Integer, default=0)
    rate_limit_hits: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    connection: Mapped["CustodianConnection"] = relationship(
        back_populates="sync_logs"
    )
