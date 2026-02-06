"""Fee schedules (expense ratios, advisory, M&E, surrender) model."""

import logging
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import FeeType
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .account import Account

logger = logging.getLogger(__name__)


class FeeStructure(Base, TimestampMixin):
    """Fee schedule for an account or position."""

    __tablename__ = "fee_structures"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True
    )
    fee_type: Mapped[str] = mapped_column(String(30), nullable=False)
    fee_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 6), nullable=True
    )
    fee_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    flat_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    fee_schedule: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    surrender_schedule: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    applies_to: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # account or position
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    account: Mapped["Account"] = relationship(
        "Account", back_populates="fee_structures"
    )
