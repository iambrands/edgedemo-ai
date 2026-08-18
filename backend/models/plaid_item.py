"""Plaid Item model — stores encrypted access tokens for B2C account aggregation."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .mixins import TimestampMixin


class PlaidItem(Base, TimestampMixin):
    """One Plaid Item = one institution connection for a B2C user."""

    __tablename__ = "plaid_items"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    plaid_item_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    institution_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    institution_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
