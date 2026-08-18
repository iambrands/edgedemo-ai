"""Advisor connection request model — B2C users requesting advisor matching."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin


class AdvisorConnectionRequest(Base, TimestampMixin):
    """A B2C user's request to be matched with an advisor."""

    __tablename__ = "advisor_connection_requests"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    household_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=True, index=True
    )
    investable_assets_range: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    primary_goal: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    preferred_meeting_format: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    matched_advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=True, index=True
    )
    matched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    declined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decline_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Advisor connect platform fee (25 bps on estimated AUM at match time)
    aum_at_match: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    platform_fee_bps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    platform_fee_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    platform_fee_logged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
