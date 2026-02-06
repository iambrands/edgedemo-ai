"""ETF Portfolio Builder and IPS data models."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .advisor import Advisor
    from .client import Client
    from .household import Household


class RiskToleranceLevel(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATELY_CONSERVATIVE = "moderately_conservative"
    MODERATE = "moderate"
    MODERATELY_AGGRESSIVE = "moderately_aggressive"
    AGGRESSIVE = "aggressive"


class InvestmentObjective(str, Enum):
    CAPITAL_PRESERVATION = "capital_preservation"
    INCOME = "income"
    GROWTH_AND_INCOME = "growth_and_income"
    GROWTH = "growth"
    AGGRESSIVE_GROWTH = "aggressive_growth"


class TimeHorizon(str, Enum):
    SHORT = "short"  # < 3 years
    MEDIUM = "medium"  # 3-7 years
    LONG = "long"  # 7-15 years
    VERY_LONG = "very_long"  # 15+ years


class RiskQuestionnaire(Base, TimestampMixin):
    """Client risk assessment questionnaire responses."""

    __tablename__ = "risk_questionnaires"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    q1_investment_experience: Mapped[int] = mapped_column(Integer, nullable=False)
    q2_risk_comfort: Mapped[int] = mapped_column(Integer, nullable=False)
    q3_loss_reaction: Mapped[int] = mapped_column(Integer, nullable=False)
    q4_income_stability: Mapped[int] = mapped_column(Integer, nullable=False)
    q5_emergency_fund: Mapped[int] = mapped_column(Integer, nullable=False)
    q6_investment_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    q7_time_horizon_years: Mapped[int] = mapped_column(Integer, nullable=False)
    q8_withdrawal_needs: Mapped[int] = mapped_column(Integer, nullable=False)
    q9_portfolio_volatility: Mapped[int] = mapped_column(Integer, nullable=False)
    q10_financial_knowledge: Mapped[int] = mapped_column(Integer, nullable=False)

    total_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    risk_tolerance: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    recommended_equity_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    annual_income: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    liquid_net_worth: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    total_net_worth: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    investment_objective: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    time_horizon: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    special_considerations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client: Mapped["Client"] = relationship(
        "Client", back_populates="risk_questionnaires", foreign_keys=[client_id]
    )
    generated_portfolios: Mapped[List["ModelPortfolio"]] = relationship(
        "ModelPortfolio", back_populates="questionnaire"
    )


class ModelPortfolio(Base, TimestampMixin, SoftDeleteMixin):
    """Pre-built or AI-generated model portfolios."""

    __tablename__ = "model_portfolios"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)

    is_preset: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    questionnaire_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("risk_questionnaires.id"), nullable=True
    )
    created_by_advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=True
    )

    equity_allocation: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    fixed_income_allocation: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    alternatives_allocation: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    cash_allocation: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    large_cap_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    mid_cap_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    small_cap_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    international_developed_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    emerging_markets_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    govt_bonds_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    corp_bonds_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    tips_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    high_yield_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    intl_bonds_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)

    rebalancing_frequency: Mapped[str] = mapped_column(String(20), default="quarterly")
    tax_efficiency_optimized: Mapped[bool] = mapped_column(Boolean, default=True)
    esg_compliant: Mapped[bool] = mapped_column(Boolean, default=False)

    questionnaire: Mapped[Optional["RiskQuestionnaire"]] = relationship(
        "RiskQuestionnaire", back_populates="generated_portfolios"
    )
    holdings: Mapped[List["ModelPortfolioHolding"]] = relationship(
        "ModelPortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan"
    )


class ModelPortfolioHolding(Base):
    """Individual ETF holdings within a model portfolio."""

    __tablename__ = "model_portfolio_holdings"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    portfolio_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("model_portfolios.id"), nullable=False
    )

    symbol: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_class: Mapped[str] = mapped_column(String(50), nullable=False)
    sub_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    target_weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    min_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    max_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)

    expense_ratio: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4), nullable=True)
    dividend_yield: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    aum_billions: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    avg_daily_volume: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    selection_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    portfolio: Mapped["ModelPortfolio"] = relationship(
        "ModelPortfolio", back_populates="holdings"
    )


class InvestmentPolicyStatement(Base, TimestampMixin):
    """Generated Investment Policy Statement for a client."""

    __tablename__ = "investment_policy_statements"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    household_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )

    questionnaire_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("risk_questionnaires.id"), nullable=False
    )
    portfolio_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("model_portfolios.id"), nullable=False
    )

    executive_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    client_profile_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    investment_objectives_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    risk_tolerance_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    time_horizon_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    asset_allocation_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    investment_guidelines_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    rebalancing_policy_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    monitoring_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    fiduciary_acknowledgment_section: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    review_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    client_signed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    advisor_signed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=True
    )

    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    client: Mapped["Client"] = relationship(
        "Client", back_populates="ips_documents", foreign_keys=[client_id]
    )
