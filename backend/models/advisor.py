"""B2B Advisor within firm model."""

import logging
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import AuditMixin, TimestampMixin

if TYPE_CHECKING:
    from .client import Client
    from .firm import Firm

logger = logging.getLogger(__name__)


class Advisor(Base, TimestampMixin, AuditMixin):
    """B2B: Advisor within firm. Many-to-many with clients via accounts."""

    __tablename__ = "advisors"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    firm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=False, index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    crd_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    licenses: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    firm: Mapped["Firm"] = relationship("Firm", back_populates="advisors")
    clients: Mapped[List["Client"]] = relationship(
        "Client", back_populates="advisor", foreign_keys="Client.advisor_id"
    )
