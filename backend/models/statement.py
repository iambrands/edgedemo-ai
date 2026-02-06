"""Uploaded statement metadata and raw text model."""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import ParsingStatus
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .account import Account

logger = logging.getLogger(__name__)


class Statement(Base, TimestampMixin):
    """Uploaded statement metadata, raw text, and parsed data."""

    __tablename__ = "statements"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    upload_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    custodian_detected: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    parser_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    parsing_status: Mapped[str] = mapped_column(String(30), nullable=False)
    statement_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    beginning_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    ending_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    file_hash: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    parser_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    parsed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    account: Mapped[Optional["Account"]] = relationship(
        "Account", back_populates="statements"
    )
