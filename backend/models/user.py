"""B2C User model — self-service retail investor authentication."""

import enum
import logging
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .advisor import Advisor
    from .client import Client
    from .firm import Firm
    from .household import Household

logger = logging.getLogger(__name__)


class UserType(str, enum.Enum):
    B2C_RETAIL = "b2c_retail"
    B2C_PREMIUM = "b2c_premium"
    B2B_ADVISOR = "b2b_advisor"
    B2B_FIRM_ADMIN = "b2b_firm_admin"


class User(Base, TimestampMixin):
    """B2C/B2B user for authentication and entitlements."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    user_type: Mapped[str] = mapped_column(String(30), default=UserType.B2C_RETAIL.value)

    subscription_tier: Mapped[Optional[str]] = mapped_column(String(50))
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    subscription_active: Mapped[bool] = mapped_column(Boolean, default=False)

    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    household_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
    advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=True
    )
    firm_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=True
    )

    features_enabled: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    risk_profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    client: Mapped[Optional["Client"]] = relationship("Client")
    household: Mapped[Optional["Household"]] = relationship("Household")
    advisor: Mapped[Optional["Advisor"]] = relationship("Advisor")
    firm: Mapped[Optional["Firm"]] = relationship("Firm")
