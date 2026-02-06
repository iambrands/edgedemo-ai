"""Household aggregate entity model."""

import logging
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import AuditMixin, TimestampMixin

if TYPE_CHECKING:
    from .account import Account
    from .client import Client
    from .firm import Firm

logger = logging.getLogger(__name__)


class Household(Base, TimestampMixin, AuditMixin):
    """Household aggregation entity. One household has many clients and accounts."""

    __tablename__ = "households"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    primary_contact_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    risk_tolerance: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tax_filing_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    combined_aum: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    firm_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=True, index=True
    )
    advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=True, index=True
    )

    firm: Mapped[Optional["Firm"]] = relationship(
        "Firm", back_populates="households", foreign_keys=[firm_id]
    )
    clients: Mapped[List["Client"]] = relationship(
        "Client", back_populates="household", foreign_keys="Client.household_id"
    )
    accounts: Mapped[List["Account"]] = relationship(
        "Account", back_populates="household"
    )

