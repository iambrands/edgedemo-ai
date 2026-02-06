"""
Liquidity management models for tax-optimized withdrawals.
Supports tax lot tracking, withdrawal requests, and optimized liquidation plans.
"""

import enum
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .account import Account
    from .client import Client
    from .position import Position
    from .user import User

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================

class WithdrawalPriority(enum.Enum):
    """Priority levels for withdrawal requests."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class LotSelectionMethod(enum.Enum):
    """Tax lot selection methods for liquidations."""
    FIFO = "fifo"           # First In, First Out
    LIFO = "lifo"           # Last In, First Out
    HIFO = "hifo"           # Highest Cost, First Out
    LOFO = "lofo"           # Lowest Cost, First Out
    SPEC_ID = "spec_id"     # Specific Identification
    TAX_OPT = "tax_opt"     # AI Tax Optimized


class WithdrawalStatus(enum.Enum):
    """Status of a withdrawal request."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class CashFlowType(enum.Enum):
    """Types of cash flows."""
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"
    WITHDRAWAL = "withdrawal"
    DEPOSIT = "deposit"
    DIVIDEND = "dividend"
    INTEREST = "interest"
    TAX = "tax"


# ============================================================================
# MODELS
# ============================================================================

class LiquidityProfile(Base, TimestampMixin):
    """Client-level liquidity and tax settings."""

    __tablename__ = "liquidity_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, unique=True, index=True
    )

    # Tax Settings
    federal_tax_bracket: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )  # e.g., 0.24 for 24%
    state_tax_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    capital_gains_rate_short: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.24")
    )
    capital_gains_rate_long: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.15")
    )

    # YTD Tax Tracking
    ytd_short_term_gains: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    ytd_long_term_gains: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    ytd_short_term_losses: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    ytd_long_term_losses: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    loss_carryforward: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )

    # Liquidity Settings
    min_cash_reserve: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("10000")
    )
    max_single_position_liquidation_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.25")
    )  # Max 25% of any single position

    # Default Preferences
    default_priority: Mapped[WithdrawalPriority] = mapped_column(
        Enum(WithdrawalPriority), default=WithdrawalPriority.NORMAL
    )
    default_lot_selection: Mapped[LotSelectionMethod] = mapped_column(
        Enum(LotSelectionMethod), default=LotSelectionMethod.TAX_OPT
    )
    avoid_wash_sales: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    client: Mapped["Client"] = relationship("Client")
    withdrawal_requests: Mapped[List["WithdrawalRequest"]] = relationship(
        "WithdrawalRequest", back_populates="liquidity_profile", cascade="all, delete-orphan"
    )
    cash_flows: Mapped[List["CashFlow"]] = relationship(
        "CashFlow", back_populates="liquidity_profile", cascade="all, delete-orphan"
    )


class TaxLot(Base, TimestampMixin):
    """Individual tax lot for a position."""

    __tablename__ = "tax_lots"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True
    )
    position_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("positions.id"), nullable=True, index=True
    )

    # Identification
    broker_lot_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Quantity & Cost
    shares: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    cost_basis_per_share: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    total_cost_basis: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    # Acquisition Info
    acquisition_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    acquisition_method: Mapped[str] = mapped_column(
        String(50), default="purchase"
    )  # purchase, gift, inheritance, transfer

    # Current Valuation
    current_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 6), nullable=True)
    current_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    unrealized_gain_loss: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)

    # Holding Period
    days_held: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_short_term: Mapped[bool] = mapped_column(Boolean, default=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_wash_sale_affected: Mapped[bool] = mapped_column(Boolean, default=False)
    wash_sale_disallowed_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )

    # Relationships
    account: Mapped["Account"] = relationship("Account")
    position: Mapped[Optional["Position"]] = relationship("Position")


class WithdrawalRequest(Base, TimestampMixin):
    """Client withdrawal request with optimization."""

    __tablename__ = "withdrawal_requests"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    liquidity_profile_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("liquidity_profiles.id"), nullable=False, index=True
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    # Request Details
    requested_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    requested_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Settings
    priority: Mapped[WithdrawalPriority] = mapped_column(
        Enum(WithdrawalPriority), default=WithdrawalPriority.NORMAL
    )
    lot_selection: Mapped[LotSelectionMethod] = mapped_column(
        Enum(LotSelectionMethod), default=LotSelectionMethod.TAX_OPT
    )

    # Status & Workflow
    status: Mapped[WithdrawalStatus] = mapped_column(
        Enum(WithdrawalStatus), default=WithdrawalStatus.DRAFT
    )
    optimized_plan_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    # Audit
    requested_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    approved_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    liquidity_profile: Mapped["LiquidityProfile"] = relationship(
        "LiquidityProfile", back_populates="withdrawal_requests"
    )
    client: Mapped["Client"] = relationship("Client")
    requester: Mapped["User"] = relationship("User", foreign_keys=[requested_by])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by])
    plans: Mapped[List["WithdrawalPlan"]] = relationship(
        "WithdrawalPlan", back_populates="request", cascade="all, delete-orphan"
    )


class WithdrawalPlan(Base, TimestampMixin):
    """Optimized withdrawal plan with line items."""

    __tablename__ = "withdrawal_plans"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("withdrawal_requests.id"), nullable=False, index=True
    )

    # Plan Details
    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=False)

    # AI Generation
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_alternatives_considered: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Tax Impact Estimates
    estimated_tax_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    estimated_short_term_gains: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    estimated_long_term_gains: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    estimated_short_term_losses: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )
    estimated_long_term_losses: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0")
    )

    # Relationships
    request: Mapped["WithdrawalRequest"] = relationship(
        "WithdrawalRequest", back_populates="plans"
    )
    line_items: Mapped[List["WithdrawalLineItem"]] = relationship(
        "WithdrawalLineItem", back_populates="plan", cascade="all, delete-orphan"
    )


class WithdrawalLineItem(Base):
    """Individual liquidation within a withdrawal plan."""

    __tablename__ = "withdrawal_line_items"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    plan_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("withdrawal_plans.id"), nullable=False, index=True
    )
    account_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True
    )
    position_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("positions.id"), nullable=True
    )
    tax_lot_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tax_lots.id"), nullable=True
    )

    # Security Info
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    shares_to_sell: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)

    # Estimates
    estimated_proceeds: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    cost_basis: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    estimated_gain_loss: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    is_short_term: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Execution Details
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_proceeds: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    actual_gain_loss: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)

    # Relationships
    plan: Mapped["WithdrawalPlan"] = relationship(
        "WithdrawalPlan", back_populates="line_items"
    )
    account: Mapped[Optional["Account"]] = relationship("Account")
    position: Mapped[Optional["Position"]] = relationship("Position")
    tax_lot: Mapped[Optional["TaxLot"]] = relationship("TaxLot")


class CashFlow(Base, TimestampMixin):
    """Projected and actual cash flows for liquidity planning."""

    __tablename__ = "cash_flows"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    liquidity_profile_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("liquidity_profiles.id"), nullable=False, index=True
    )
    account_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True
    )

    # Cash Flow Details
    flow_type: Mapped[CashFlowType] = mapped_column(Enum(CashFlowType), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    # Timing
    expected_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_pattern: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Status
    is_projected: Mapped[bool] = mapped_column(Boolean, default=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    liquidity_profile: Mapped["LiquidityProfile"] = relationship(
        "LiquidityProfile", back_populates="cash_flows"
    )
    account: Mapped[Optional["Account"]] = relationship("Account")
