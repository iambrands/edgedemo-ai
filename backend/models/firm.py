"""B2B RIA firm entity model."""

import logging
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import AuditMixin, TimestampMixin

if TYPE_CHECKING:
    from .advisor import Advisor
    from .household import Household

logger = logging.getLogger(__name__)


class Firm(Base, TimestampMixin, AuditMixin):
    """B2B: RIA firm entity. Has many advisors and households."""

    __tablename__ = "firms"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    firm_name: Mapped[str] = mapped_column(String(255), nullable=False)
    crd_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sec_registration: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aum: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    advisor_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    plan: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    max_households: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_advisors: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    branding: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    concentration_thresholds: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    approved_products: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    advisors: Mapped[List["Advisor"]] = relationship(
        "Advisor", back_populates="firm"
    )
    households: Mapped[List["Household"]] = relationship(
        "Household", back_populates="firm"
    )
