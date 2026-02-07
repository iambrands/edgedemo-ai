"""
Model Portfolio Marketplace models.

Extends the basic ModelPortfolio / ModelPortfolioHolding with marketplace,
subscription, account-assignment, drift-tracking, rebalance-signal, and
performance-history capabilities.
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================


class ModelStatus(str, enum.Enum):
    """Status of a model portfolio."""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class ModelVisibility(str, enum.Enum):
    """Visibility / distribution scope."""

    PRIVATE = "private"
    FIRM = "firm"
    MARKETPLACE = "marketplace"


class AssetClassType(str, enum.Enum):
    """Broad asset-class categories."""

    US_EQUITY = "us_equity"
    INTL_EQUITY = "intl_equity"
    EMERGING_EQUITY = "emerging_equity"
    US_FIXED_INCOME = "us_fixed_income"
    INTL_FIXED_INCOME = "intl_fixed_income"
    REAL_ESTATE = "real_estate"
    COMMODITIES = "commodities"
    ALTERNATIVES = "alternatives"
    CASH = "cash"
    OTHER = "other"


class RebalanceFrequency(str, enum.Enum):
    """How often automatic rebalance checks run."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"
    MANUAL = "manual"


class RebalanceSignalStatus(str, enum.Enum):
    """Lifecycle of a rebalance signal."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    COMPLETED = "completed"
    EXPIRED = "expired"
    FAILED = "failed"


# ============================================================================
# MODELS
# ============================================================================


class MarketplaceModelPortfolio(Base, TimestampMixin):
    """
    Enhanced model portfolio with marketplace, drift-threshold, and
    subscription-fee capabilities.

    Complements the simpler ``ModelPortfolio`` in ``portfolio_models.py``
    which is used by the IPS / portfolio-builder feature.
    """

    __tablename__ = "marketplace_model_portfolios"
    __table_args__ = (
        Index("ix_mmp_advisor", "advisor_id"),
        Index("ix_mmp_status", "status"),
        Index("ix_mmp_visibility", "visibility"),
        Index("ix_mmp_category", "category"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )

    # Identity
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    ticker: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, unique=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Classification
    category: Mapped[str] = mapped_column(String(50), default="balanced")
    risk_level: Mapped[int] = mapped_column(Integer, default=5)
    investment_style: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    tags: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Targets
    target_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )
    target_volatility: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )
    benchmark_symbol: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )

    # Rebalance
    rebalance_frequency: Mapped[str] = mapped_column(
        String(30), default="quarterly"
    )
    drift_threshold_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("5.00")
    )
    tax_loss_harvesting_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    # Status
    status: Mapped[ModelStatus] = mapped_column(
        SQLEnum(ModelStatus), default=ModelStatus.DRAFT
    )
    visibility: Mapped[ModelVisibility] = mapped_column(
        SQLEnum(ModelVisibility), default=ModelVisibility.PRIVATE
    )

    # Marketplace
    subscription_fee_monthly: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    subscription_fee_annual: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    total_subscribers: Mapped[int] = mapped_column(Integer, default=0)
    total_aum: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Performance (snapshot)
    ytd_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )
    one_year_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )
    three_year_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )
    inception_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )

    inception_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )

    # Relationships
    holdings: Mapped[List["MarketplaceModelHolding"]] = relationship(
        "MarketplaceModelHolding",
        back_populates="model",
        cascade="all, delete-orphan",
    )
    subscriptions: Mapped[List["ModelSubscription"]] = relationship(
        "ModelSubscription",
        back_populates="model",
        cascade="all, delete-orphan",
    )


class MarketplaceModelHolding(Base, TimestampMixin):
    """
    Individual security holding within a marketplace model portfolio.
    """

    __tablename__ = "marketplace_model_holdings"
    __table_args__ = (
        Index("ix_mmh_model", "model_id"),
        UniqueConstraint("model_id", "symbol", name="uq_mmh_model_symbol"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    model_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("marketplace_model_portfolios.id"),
        nullable=False,
    )

    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    security_name: Mapped[str] = mapped_column(String(255), nullable=False)
    security_type: Mapped[str] = mapped_column(
        String(50), default="etf"
    )
    asset_class: Mapped[AssetClassType] = mapped_column(
        SQLEnum(AssetClassType), default=AssetClassType.US_EQUITY
    )
    sub_asset_class: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    target_weight_pct: Mapped[Decimal] = mapped_column(
        Numeric(6, 3), nullable=False
    )
    min_weight_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 3), nullable=True
    )
    max_weight_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 3), nullable=True
    )

    expense_ratio: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )

    # Relationship
    model: Mapped["MarketplaceModelPortfolio"] = relationship(
        "MarketplaceModelPortfolio", back_populates="holdings"
    )


class ModelSubscription(Base, TimestampMixin):
    """
    An advisor's subscription to a marketplace model portfolio.
    """

    __tablename__ = "model_subscriptions"
    __table_args__ = (
        Index("ix_msub_model", "model_id"),
        Index("ix_msub_advisor", "subscriber_advisor_id"),
        UniqueConstraint(
            "model_id",
            "subscriber_advisor_id",
            name="uq_msub_model_advisor",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    model_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("marketplace_model_portfolios.id"),
        nullable=False,
    )
    subscriber_advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(String(30), default="active")
    custom_drift_threshold: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    model: Mapped["MarketplaceModelPortfolio"] = relationship(
        "MarketplaceModelPortfolio", back_populates="subscriptions"
    )
    assignments: Mapped[List["AccountModelAssignment"]] = relationship(
        "AccountModelAssignment",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )


class AccountModelAssignment(Base, TimestampMixin):
    """
    Links a client account to a model portfolio via a subscription.
    """

    __tablename__ = "account_model_assignments"
    __table_args__ = (
        Index("ix_ama_subscription", "subscription_id"),
        Index("ix_ama_account", "account_id"),
        Index("ix_ama_model", "model_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    subscription_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("model_subscriptions.id"),
        nullable=False,
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=False,
    )
    model_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("marketplace_model_portfolios.id"),
        nullable=False,
    )
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=True,
    )
    assigned_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), nullable=False
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Drift snapshot
    current_drift_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 3), nullable=True
    )
    max_holding_drift_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 3), nullable=True
    )
    account_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    last_rebalanced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    subscription: Mapped["ModelSubscription"] = relationship(
        "ModelSubscription", back_populates="assignments"
    )


class RebalanceSignal(Base, TimestampMixin):
    """
    A generated rebalance signal when drift exceeds threshold.
    Follows an approval workflow before execution.
    """

    __tablename__ = "rebalance_signals"
    __table_args__ = (
        Index("ix_rs_assignment", "assignment_id"),
        Index("ix_rs_advisor", "advisor_id"),
        Index("ix_rs_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    assignment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("account_model_assignments.id"),
        nullable=False,
    )
    model_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("marketplace_model_portfolios.id"),
        nullable=False,
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=False,
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )

    # Trigger
    trigger_type: Mapped[str] = mapped_column(
        String(50), default="drift_threshold"
    )
    trigger_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 3), nullable=True
    )

    # Snapshot at signal creation
    account_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    cash_available: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    total_drift_pct: Mapped[Decimal] = mapped_column(
        Numeric(6, 3), default=Decimal("0")
    )
    drift_details: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    trades_required: Mapped[Optional[list]] = mapped_column(
        JSONB, nullable=True
    )
    estimated_trades_count: Mapped[int] = mapped_column(Integer, default=0)
    estimated_buy_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    estimated_sell_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Status
    status: Mapped[RebalanceSignalStatus] = mapped_column(
        SQLEnum(RebalanceSignalStatus),
        default=RebalanceSignalStatus.PENDING,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Approval
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    # Execution
    executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    execution_details: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Expiry
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ModelPerformanceHistory(Base, TimestampMixin):
    """
    Daily or periodic performance snapshot for a marketplace model.
    """

    __tablename__ = "model_performance_history"
    __table_args__ = (
        Index("ix_mph_model", "model_id"),
        UniqueConstraint(
            "model_id", "as_of_date", name="uq_mph_model_date"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    model_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("marketplace_model_portfolios.id"),
        nullable=False,
    )

    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    nav: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), default=Decimal("100")
    )
    daily_return_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    cumulative_return_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 6), nullable=True
    )
    total_aum: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    total_accounts: Mapped[int] = mapped_column(Integer, default=0)
