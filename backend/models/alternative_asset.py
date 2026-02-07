"""
Alternative Asset Tracking models.

Supports private equity, hedge funds, real estate, venture capital,
private debt, commodities, collectibles, and other illiquid assets.

Tracks commitments, capital calls, distributions, valuations, performance
metrics (IRR, TVPI, DPI, RVPI, MOIC), and K-1 / tax document management.
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


class AlternativeAssetType(str, enum.Enum):
    """Type of alternative asset."""

    PRIVATE_EQUITY = "private_equity"
    VENTURE_CAPITAL = "venture_capital"
    HEDGE_FUND = "hedge_fund"
    REAL_ESTATE = "real_estate"
    PRIVATE_DEBT = "private_debt"
    COMMODITIES = "commodities"
    COLLECTIBLES = "collectibles"
    INFRASTRUCTURE = "infrastructure"
    NATURAL_RESOURCES = "natural_resources"
    CRYPTOCURRENCY = "cryptocurrency"
    OTHER = "other"


class InvestmentStatus(str, enum.Enum):
    """Lifecycle status of an alternative investment."""

    COMMITTED = "committed"
    ACTIVE = "active"
    HARVESTING = "harvesting"
    FULLY_REALIZED = "fully_realized"
    WRITTEN_OFF = "written_off"
    PENDING = "pending"


class TransactionType(str, enum.Enum):
    """Transaction type for alternative assets."""

    CAPITAL_CALL = "capital_call"
    DISTRIBUTION = "distribution"
    RETURN_OF_CAPITAL = "return_of_capital"
    MANAGEMENT_FEE = "management_fee"
    CARRIED_INTEREST = "carried_interest"
    RECALLABLE_DISTRIBUTION = "recallable_distribution"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    ADJUSTMENT = "adjustment"
    INCOME = "income"
    EXPENSE = "expense"
    VALUATION_ADJUSTMENT = "valuation_adjustment"


class ValuationSource(str, enum.Enum):
    """Source of a valuation update."""

    FUND_STATEMENT = "fund_statement"
    GP_REPORT = "gp_report"
    THIRD_PARTY = "third_party"
    APPRAISAL = "appraisal"
    INTERNAL = "internal"
    MARKET_DATA = "market_data"
    INTERNAL_ESTIMATE = "internal_estimate"
    MARKET_COMPARABLE = "market_comparable"
    COST_BASIS = "cost_basis"


class DocumentType(str, enum.Enum):
    """Type of document associated with an alternative investment."""

    K1 = "k1"
    FUND_STATEMENT = "fund_statement"
    CAPITAL_CALL_NOTICE = "capital_call_notice"
    DISTRIBUTION_NOTICE = "distribution_notice"
    SUBSCRIPTION_AGREEMENT = "subscription_agreement"
    SIDE_LETTER = "side_letter"
    PPM = "ppm"
    LPA = "lpa"
    ANNUAL_REPORT = "annual_report"
    QUARTERLY_REPORT = "quarterly_report"
    TAX_ESTIMATE = "tax_estimate"
    APPRAISAL = "appraisal"
    INSURANCE = "insurance"
    FINANCIAL_STATEMENT = "financial_statement"
    OTHER = "other"


# ============================================================================
# MODELS
# ============================================================================


class AlternativeInvestment(Base, TimestampMixin):
    """
    Core record for an alternative / illiquid investment.

    Covers PE/VC funds, hedge funds, real estate, private debt,
    commodities, collectibles, and infrastructure.
    """

    __tablename__ = "alternative_investments"
    __table_args__ = (
        Index("ix_altinv_advisor", "advisor_id"),
        Index("ix_altinv_client", "client_id"),
        Index("ix_altinv_type", "asset_type"),
        Index("ix_altinv_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=False,
    )
    account_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("custodian_accounts.id"),
        nullable=True,
    )

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[AlternativeAssetType] = mapped_column(
        SQLEnum(AlternativeAssetType), nullable=False
    )
    status: Mapped[InvestmentStatus] = mapped_column(
        SQLEnum(InvestmentStatus), default=InvestmentStatus.COMMITTED
    )

    # Fund details
    fund_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sponsor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fund_manager: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vintage_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    investment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    maturity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Strategy / classification
    investment_strategy: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    geography: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sector_focus: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Capital structure
    total_commitment: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0")
    )
    called_capital: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    uncalled_capital: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    distributions_received: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    recallable_distributions: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Current valuation
    current_nav: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    nav_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Cost basis
    cost_basis: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    adjusted_cost_basis: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Performance metrics (calculated)
    irr: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    tvpi: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    dpi: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    rvpi: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    moic: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )

    # Fee structure
    management_fee_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )
    carried_interest_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )
    preferred_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )

    # Tax
    tax_entity_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    ein: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    fiscal_year_end: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True
    )

    # Real estate specific
    property_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    property_type: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    square_footage: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Collectibles specific
    item_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provenance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    storage_location: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    insurance_policy: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    insurance_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    custom_fields: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )

    # Document links
    subscription_doc_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Relationships
    transactions: Mapped[List["AlternativeTransaction"]] = relationship(
        "AlternativeTransaction",
        back_populates="investment",
        cascade="all, delete-orphan",
        order_by="AlternativeTransaction.transaction_date.desc()",
    )
    capital_calls: Mapped[List["CapitalCall"]] = relationship(
        "CapitalCall",
        back_populates="investment",
        cascade="all, delete-orphan",
        order_by="CapitalCall.due_date.desc()",
    )
    valuations: Mapped[List["AlternativeValuation"]] = relationship(
        "AlternativeValuation",
        back_populates="investment",
        cascade="all, delete-orphan",
        order_by="AlternativeValuation.valuation_date.desc()",
    )
    documents: Mapped[List["AlternativeDocument"]] = relationship(
        "AlternativeDocument",
        back_populates="investment",
        cascade="all, delete-orphan",
    )


class AlternativeTransaction(Base, TimestampMixin):
    """
    Individual transaction for an alternative investment.
    Covers capital calls, distributions, fees, and adjustments.
    """

    __tablename__ = "alternative_transactions"
    __table_args__ = (
        Index("ix_alttxn_investment", "investment_id"),
        Index("ix_alttxn_type", "transaction_type"),
        Index("ix_alttxn_date", "transaction_date"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    investment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("alternative_investments.id"),
        nullable=False,
    )

    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType), nullable=False
    )
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    settlement_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )

    # Optional link to capital call
    capital_call_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("capital_calls.id"),
        nullable=True,
    )

    # Tax-related breakdowns (for distributions)
    return_of_capital: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    capital_gains_short: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    capital_gains_long: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    ordinary_income: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    qualified_dividends: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Reference
    reference_number: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="completed")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    investment: Mapped["AlternativeInvestment"] = relationship(
        "AlternativeInvestment", back_populates="transactions"
    )


class CapitalCall(Base, TimestampMixin):
    """
    Capital call notice and tracking.
    """

    __tablename__ = "capital_calls"
    __table_args__ = (
        Index("ix_capcall_investment", "investment_id"),
        Index("ix_capcall_status", "status"),
        Index("ix_capcall_due", "due_date"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    investment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("alternative_investments.id"),
        nullable=False,
    )

    call_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Amounts
    call_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )
    management_fee_portion: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    investment_portion: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    other_expenses: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Cumulative tracking
    cumulative_called: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    remaining_commitment: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    percentage_called: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 4), nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(String(50), default="pending")
    paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    paid_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Wire info (stored as JSON for structured bank details)
    wire_instructions: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Document
    notice_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    investment: Mapped["AlternativeInvestment"] = relationship(
        "AlternativeInvestment", back_populates="capital_calls"
    )


class AlternativeValuation(Base, TimestampMixin):
    """
    Periodic valuation / NAV update for an alternative investment.
    """

    __tablename__ = "alternative_valuations"
    __table_args__ = (
        UniqueConstraint(
            "investment_id", "valuation_date", name="uq_alt_valuation_date"
        ),
        Index("ix_altval_investment", "investment_id"),
        Index("ix_altval_date", "valuation_date"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    investment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("alternative_investments.id"),
        nullable=False,
    )

    valuation_date: Mapped[date] = mapped_column(Date, nullable=False)
    nav: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    source: Mapped[ValuationSource] = mapped_column(
        SQLEnum(ValuationSource), default=ValuationSource.FUND_STATEMENT
    )
    source_document: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Return metrics at valuation point
    period_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    ytd_return: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )

    # Breakdown (if available)
    unrealized_gain: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    realized_gain: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Performance as of this date
    irr: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    tvpi: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    dpi: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    investment: Mapped["AlternativeInvestment"] = relationship(
        "AlternativeInvestment", back_populates="valuations"
    )


class AlternativeDocument(Base, TimestampMixin):
    """
    Documents associated with an alternative investment.
    Includes K-1 tax form field storage with full box-level data.
    """

    __tablename__ = "alternative_documents"
    __table_args__ = (
        Index("ix_altdoc_investment", "investment_id"),
        Index("ix_altdoc_type", "document_type"),
        Index("ix_altdoc_taxyear", "tax_year"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    investment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("alternative_investments.id"),
        nullable=False,
    )

    document_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType, name="alt_documenttype"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dates
    document_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tax_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # File info
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # K-1 specific fields (Schedule K-1 box numbers)
    k1_box_1: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Ordinary business income (loss)
    k1_box_2: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Net rental real estate income (loss)
    k1_box_3: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Other net rental income (loss)
    k1_box_4a: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Guaranteed payments for services
    k1_box_5: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Interest income
    k1_box_6a: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Ordinary dividends
    k1_box_6b: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Qualified dividends
    k1_box_8: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Net short-term capital gain (loss)
    k1_box_9a: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Net long-term capital gain (loss)
    k1_box_11: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Section 179 deduction
    k1_box_13: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )  # Other deductions (code breakdown)
    k1_box_19: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )  # Distributions
    k1_box_20: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )  # Other information (code breakdown)

    # Processing
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    investment: Mapped["AlternativeInvestment"] = relationship(
        "AlternativeInvestment", back_populates="documents"
    )


class AlternativeAssetSummary(Base, TimestampMixin):
    """
    Cached / periodic summary snapshot of a client's alternative asset
    portfolio, used for dashboard aggregation.
    """

    __tablename__ = "alternative_asset_summaries"
    __table_args__ = (
        UniqueConstraint(
            "client_id", "as_of_date", name="uq_alt_summary_client_date"
        ),
        Index("ix_altsum_advisor", "advisor_id"),
        Index("ix_altsum_client", "client_id"),
        Index("ix_altsum_date", "as_of_date"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=False,
    )

    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)

    total_investments: Mapped[int] = mapped_column(Integer, default=0)
    total_commitment: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    total_called: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    total_uncalled: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    total_nav: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
    total_distributions: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )

    # Breakdown stored as JSONB
    nav_by_type: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    commitment_by_type: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Aggregate performance
    overall_irr: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    overall_tvpi: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )

    pending_capital_calls: Mapped[int] = mapped_column(Integer, default=0)
    pending_call_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0")
    )
