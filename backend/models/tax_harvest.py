"""
Tax-Loss Harvesting Models.

Tracks harvesting opportunities, wash sale windows, security relationships,
and executed harvests. Depends on Multi-Custodian Aggregation models
(AggregatedPosition, AggregatedTransaction, CustodianAccount).
"""

import enum
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================


class HarvestStatus(str, enum.Enum):
    """Status of a harvest opportunity."""

    IDENTIFIED = "identified"
    RECOMMENDED = "recommended"
    APPROVED = "approved"
    EXECUTING = "executing"
    EXECUTED = "executed"
    EXPIRED = "expired"
    REJECTED = "rejected"
    WASH_SALE_RISK = "wash_sale_risk"


class WashSaleStatus(str, enum.Enum):
    """Wash sale tracking status."""

    CLEAR = "clear"
    IN_WINDOW = "in_window"
    VIOLATED = "violated"
    ADJUSTED = "adjusted"


class SecurityRelationType(str, enum.Enum):
    """Type of relationship between securities."""

    SUBSTANTIALLY_IDENTICAL = "substantially_identical"
    SAME_SECTOR_ETF = "same_sector_etf"
    CORRELATED = "correlated"
    REPLACEMENT_CANDIDATE = "replacement_candidate"


class TaxLotStatus(str, enum.Enum):
    """Status of a harvest tax lot."""

    OPEN = "open"
    PARTIALLY_CLOSED = "partially_closed"
    CLOSED = "closed"
    WASH_SALE_ADJUSTED = "wash_sale_adjusted"


# ============================================================================
# MODELS
# ============================================================================


class SecurityRelationship(Base, TimestampMixin):
    """
    Defines relationships between securities for wash sale detection
    and replacement recommendations.

    Used to identify:
    - Substantially identical securities (triggers wash sale)
    - Suitable replacement securities (similar exposure, different enough)
    """

    __tablename__ = "security_relationships"
    __table_args__ = (
        UniqueConstraint(
            "symbol_a",
            "symbol_b",
            "relation_type",
            name="uq_security_relationship",
        ),
        Index("ix_security_relationships_symbol_a", "symbol_a"),
        Index("ix_security_relationships_symbol_b", "symbol_b"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Security pair
    symbol_a: Mapped[str] = mapped_column(String(20), nullable=False)
    symbol_b: Mapped[str] = mapped_column(String(20), nullable=False)
    cusip_a: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    cusip_b: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)

    # Relationship details
    relation_type: Mapped[SecurityRelationType] = mapped_column(
        SQLEnum(SecurityRelationType), nullable=False
    )
    confidence_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.95")
    )

    # For correlated securities
    correlation_coefficient: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    # Metadata
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="system")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Expiration for dynamic relationships
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class HarvestTaxLot(Base, TimestampMixin):
    """
    Individual tax lots for custodian-aggregated positions.

    Tracks acquisition date, cost basis, and holding period for each lot.
    References Multi-Custodian Aggregation models (aggregated_positions,
    custodian_accounts) — distinct from liquidity.TaxLot which references
    the basic accounts/positions tables.
    """

    __tablename__ = "harvest_tax_lots"
    __table_args__ = (
        Index("ix_harvest_tax_lots_position", "position_id"),
        Index("ix_harvest_tax_lots_symbol", "symbol"),
        Index("ix_harvest_tax_lots_acquisition_date", "acquisition_date"),
        Index("ix_harvest_tax_lots_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Link to aggregated position
    position_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("aggregated_positions.id"),
        nullable=False,
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=False,
    )

    # Security identifiers
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    cusip: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)

    # Lot details
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    remaining_quantity: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )

    # Cost basis
    cost_basis_per_share: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    total_cost_basis: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    adjusted_cost_basis: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Dates
    acquisition_date: Mapped[date] = mapped_column(Date, nullable=False)
    acquisition_transaction_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("aggregated_transactions.id"),
        nullable=True,
    )

    # Holding period
    is_long_term: Mapped[bool] = mapped_column(Boolean, default=False)
    holding_days: Mapped[int] = mapped_column(Integer, default=0)
    long_term_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Current valuation (updated on sync)
    current_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 6), nullable=True
    )
    current_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    unrealized_gain_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    unrealized_gain_loss_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )

    # Status
    status: Mapped[TaxLotStatus] = mapped_column(
        SQLEnum(TaxLotStatus), default=TaxLotStatus.OPEN
    )

    # Wash sale tracking
    wash_sale_adjustment: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    wash_sale_disallowed: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    wash_sale_source_lot_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    # External reference
    external_lot_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    custodian_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )


class HarvestOpportunity(Base, TimestampMixin):
    """
    Identified tax-loss harvesting opportunity.
    Tracks the analysis, recommendation, and execution status.
    """

    __tablename__ = "harvest_opportunities"
    __table_args__ = (
        Index("ix_harvest_opportunities_advisor", "advisor_id"),
        Index("ix_harvest_opportunities_client", "client_id"),
        Index("ix_harvest_opportunities_status", "status"),
        Index("ix_harvest_opportunities_symbol", "symbol"),
        Index("ix_harvest_opportunities_identified_at", "identified_at"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Ownership
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    household_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=False,
    )

    # Position being harvested
    position_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("aggregated_positions.id"),
        nullable=False,
    )
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    cusip: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    security_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Harvest details
    quantity_to_harvest: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    current_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    cost_basis: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    market_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )

    # Loss calculation
    unrealized_loss: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    estimated_tax_savings: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    tax_rate_used: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.35")
    )

    # Holding period breakdown
    short_term_loss: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    long_term_loss: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Tax lots involved
    tax_lot_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Status tracking
    status: Mapped[HarvestStatus] = mapped_column(
        SQLEnum(HarvestStatus), default=HarvestStatus.IDENTIFIED
    )
    wash_sale_status: Mapped[WashSaleStatus] = mapped_column(
        SQLEnum(WashSaleStatus), default=WashSaleStatus.CLEAR
    )

    # Wash sale analysis
    wash_sale_risk_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    wash_sale_blocking_transactions: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    wash_sale_window_start: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    wash_sale_window_end: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )

    # Recommended replacement securities
    replacement_recommendations: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Selected replacement (after advisor approval)
    replacement_symbol: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    replacement_cusip: Mapped[Optional[str]] = mapped_column(
        String(9), nullable=True
    )

    # Timestamps
    identified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    recommended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Execution details
    sell_transaction_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("aggregated_transactions.id"),
        nullable=True,
    )
    buy_transaction_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    actual_loss_realized: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Notes
    advisor_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # AI analysis
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class WashSaleTransaction(Base, TimestampMixin):
    """
    Tracks transactions within wash sale windows.
    Used to prevent wash sales and track violations.
    """

    __tablename__ = "wash_sale_transactions"
    __table_args__ = (
        Index("ix_wash_sale_transactions_symbol", "symbol"),
        Index(
            "ix_wash_sale_transactions_window", "window_start", "window_end"
        ),
        Index("ix_wash_sale_transactions_account", "account_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # The triggering sale
    harvest_opportunity_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("harvest_opportunities.id"),
        nullable=True,
    )
    sell_transaction_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("aggregated_transactions.id"),
        nullable=False,
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=False,
    )

    # Security sold
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    cusip: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)

    # Sale details
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_sold: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    loss_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )

    # Wash sale window (30 days before and after)
    window_start: Mapped[date] = mapped_column(Date, nullable=False)
    window_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Substantially identical securities to watch
    watch_symbols: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    watch_cusips: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Violation tracking
    status: Mapped[WashSaleStatus] = mapped_column(
        SQLEnum(WashSaleStatus), default=WashSaleStatus.IN_WINDOW
    )
    violating_transaction_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("aggregated_transactions.id"),
        nullable=True,
    )
    violation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    disallowed_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Cost basis adjustment
    adjustment_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    adjusted_lot_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("harvest_tax_lots.id"),
        nullable=True,
    )


class HarvestingSettings(Base, TimestampMixin):
    """
    Per-client or per-account harvesting preferences and thresholds.
    """

    __tablename__ = "harvesting_settings"
    __table_args__ = (
        UniqueConstraint(
            "advisor_id",
            "client_id",
            "account_id",
            name="uq_harvesting_settings",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Scope (advisor-level, client-level, or account-level)
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    account_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=True,
    )

    # Thresholds
    min_loss_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("100")
    )
    min_loss_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.05")
    )
    min_tax_savings: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("50")
    )

    # Tax rates for calculations
    short_term_tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.37")
    )
    long_term_tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.20")
    )

    # Automation preferences
    auto_identify: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_recommend: Mapped[bool] = mapped_column(Boolean, default=False)
    require_approval: Mapped[bool] = mapped_column(Boolean, default=True)

    # Exclusions
    excluded_symbols: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    excluded_account_types: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Replacement preferences
    prefer_etf_replacements: Mapped[bool] = mapped_column(
        Boolean, default=True
    )
    min_replacement_correlation: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.90")
    )

    # Notifications
    notify_on_opportunity: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_wash_sale_risk: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
