"""Individual holdings within account model."""

import logging
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AssetClass
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .account import Account

logger = logging.getLogger(__name__)


class Position(Base, TimestampMixin):
    """Position (holding) within an account."""

    __tablename__ = "positions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True
    )
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    cost_basis_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    cusip: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    security_name: Mapped[str] = mapped_column(String(255), nullable=False)
    security_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    quantity_loaned: Mapped[Decimal] = mapped_column(
        Numeric(15, 6), default=0, nullable=False
    )
    cost_basis: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 6), nullable=True
    )
    market_price: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=False)
    market_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    unrealized_gain_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    unrealized_gl_type: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    asset_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sub_asset_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sub_adviser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dividend_yield: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 4), nullable=True
    )
    estimated_annual_income: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    share_class: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    expense_ratio: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    front_load: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    m_and_e_fee: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    target_allocation_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    actual_allocation_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    fund_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dividend_reinvest: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    cap_gains_reinvest: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="positions")

    __table_args__ = (
        UniqueConstraint(
            "account_id",
            "ticker",
            "cost_basis_date",
            name="uq_position_account_symbol_cost_basis",
        ),
    )
