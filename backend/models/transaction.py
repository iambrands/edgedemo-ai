"""Buy/sell/dividend/fee transaction model."""

import logging
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import TransactionType
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .account import Account

logger = logging.getLogger(__name__)


class Transaction(Base, TimestampMixin):
    """Transaction within an account."""

    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True
    )
    transaction_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    settlement_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 6), nullable=True
    )
    price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 6), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    tax_lot_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    linked_account_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    account: Mapped["Account"] = relationship(
        "Account", back_populates="transactions"
    )
