"""Client (individual within household) model."""

import logging
from datetime import date
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import AuditMixin, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .account import Account
    from .advisor import Advisor
    from .household import Household
    from .portal import ClientPortalUser
    from .portfolio_models import InvestmentPolicyStatement, RiskQuestionnaire

logger = logging.getLogger(__name__)


class Client(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Client KYC and suitability data. Links to one household."""

    __tablename__ = "clients"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    household_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=True, index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ssn_encrypted: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    risk_tolerance: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    investment_objective: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    investment_timeline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    annual_income_range: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    net_worth_range: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    liquid_net_worth: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    annual_expenses: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    investment_experience: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tax_filing_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tax_bracket: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    state_of_residence: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=True, index=True
    )
    firm_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=True, index=True
    )

    household: Mapped[Optional["Household"]] = relationship(
        "Household", back_populates="clients", foreign_keys=[household_id]
    )
    advisor: Mapped[Optional["Advisor"]] = relationship(
        "Advisor", back_populates="clients", foreign_keys=[advisor_id]
    )
    accounts: Mapped[List["Account"]] = relationship(
        "Account", back_populates="client"
    )
    risk_questionnaires: Mapped[List["RiskQuestionnaire"]] = relationship(
        "RiskQuestionnaire", back_populates="client"
    )
    ips_documents: Mapped[List["InvestmentPolicyStatement"]] = relationship(
        "InvestmentPolicyStatement", back_populates="client"
    )
    portal_user: Mapped[Optional["ClientPortalUser"]] = relationship(
        "ClientPortalUser", back_populates="client", uselist=False
    )
