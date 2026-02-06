"""Investment account model (IRA, brokerage, 401k, VA, etc.)."""

import logging
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AccountType
from .mixins import AuditMixin, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .client import Client
    from .fee_structure import FeeStructure
    from .household import Household
    from .position import Position
    from .statement import Statement
    from .transaction import Transaction

logger = logging.getLogger(__name__)


class Account(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Investment account. Links to one household and one client."""

    __tablename__ = "accounts"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    household_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=False, index=True
    )
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True
    )
    account_number_masked: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    account_number_hash: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    custodian: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    clearing_firm: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    account_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # AccountType enum values
    tax_type: Mapped[str] = mapped_column(String(20), nullable=False)
    investment_objective: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    risk_tolerance: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    margin_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_statement_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_statement_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )

    household: Mapped["Household"] = relationship(
        "Household", back_populates="accounts"
    )
    client: Mapped[Optional["Client"]] = relationship(
        "Client", back_populates="accounts"
    )
    positions: Mapped[List["Position"]] = relationship(
        "Position", back_populates="account"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="account"
    )
    statements: Mapped[List["Statement"]] = relationship(
        "Statement", back_populates="account"
    )
    fee_structures: Mapped[List["FeeStructure"]] = relationship(
        "FeeStructure", back_populates="account"
    )
