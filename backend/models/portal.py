"""Client Portal models for white-labeled client experiences."""

import enum
import logging
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .client import Client
    from .firm import Firm

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================

class NudgeType(enum.Enum):
    """Types of behavioral nudges sent to clients."""
    REBALANCE = "rebalance"
    TAX_LOSS = "tax_loss"
    CASH_DRAG = "cash_drag"
    CONCENTRATION = "concentration"
    GOAL_PROGRESS = "goal_progress"
    MARKET_VOLATILITY = "market_volatility"
    CONTRIBUTION_REMINDER = "contribution_reminder"
    RMD_REMINDER = "rmd_reminder"


class NudgeStatus(enum.Enum):
    """Status of a behavioral nudge."""
    PENDING = "pending"
    DELIVERED = "delivered"
    VIEWED = "viewed"
    ACTED = "acted"
    DISMISSED = "dismissed"


class GoalType(enum.Enum):
    """Types of client financial goals."""
    RETIREMENT = "retirement"
    EDUCATION = "education"
    HOME_PURCHASE = "home_purchase"
    EMERGENCY_FUND = "emergency_fund"
    WEALTH_TRANSFER = "wealth_transfer"
    CUSTOM = "custom"


# ============================================================================
# MODELS
# ============================================================================

class ClientPortalUser(Base, TimestampMixin):
    """Client portal user account - separate login for client self-service."""

    __tablename__ = "client_portal_users"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    firm_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=True, index=True
    )
    
    # Email preferences
    email_narratives: Mapped[bool] = mapped_column(Boolean, default=True)
    email_nudges: Mapped[bool] = mapped_column(Boolean, default=True)
    email_documents: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="portal_user")
    firm: Mapped[Optional["Firm"]] = relationship("Firm")
    narratives: Mapped[List["PortalNarrative"]] = relationship(
        "PortalNarrative", back_populates="portal_user", cascade="all, delete-orphan"
    )
    nudges: Mapped[List["BehavioralNudge"]] = relationship(
        "BehavioralNudge", back_populates="portal_user", cascade="all, delete-orphan"
    )
    goals: Mapped[List["ClientGoal"]] = relationship(
        "ClientGoal", back_populates="portal_user", cascade="all, delete-orphan"
    )
    documents: Mapped[List["PortalDocument"]] = relationship(
        "PortalDocument", back_populates="portal_user", cascade="all, delete-orphan"
    )


class PortalNarrative(Base):
    """AI-generated narrative reports for clients (quarterly updates, etc.)."""

    __tablename__ = "portal_narratives"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    portal_user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("client_portal_users.id"), nullable=False, index=True
    )
    narrative_type: Mapped[str] = mapped_column(String(50), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    portal_user: Mapped["ClientPortalUser"] = relationship(
        "ClientPortalUser", back_populates="narratives"
    )


class BehavioralNudge(Base):
    """Behavioral nudges to encourage positive financial behaviors."""

    __tablename__ = "behavioral_nudges"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    portal_user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("client_portal_users.id"), nullable=False, index=True
    )
    nudge_type: Mapped[NudgeType] = mapped_column(Enum(NudgeType), nullable=False)
    status: Mapped[NudgeStatus] = mapped_column(Enum(NudgeStatus), default=NudgeStatus.PENDING)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    action_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=5)
    nudge_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    acted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    portal_user: Mapped["ClientPortalUser"] = relationship(
        "ClientPortalUser", back_populates="nudges"
    )
    interactions: Mapped[List["NudgeInteraction"]] = relationship(
        "NudgeInteraction", back_populates="nudge", cascade="all, delete-orphan"
    )


class NudgeInteraction(Base):
    """Tracks client interactions with nudges (views, clicks, dismissals)."""

    __tablename__ = "nudge_interactions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    nudge_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("behavioral_nudges.id"), nullable=False, index=True
    )
    interaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    interaction_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    nudge: Mapped["BehavioralNudge"] = relationship(
        "BehavioralNudge", back_populates="interactions"
    )


class ClientGoal(Base, TimestampMixin):
    """Client financial goals with progress tracking."""

    __tablename__ = "client_goals"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    portal_user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("client_portal_users.id"), nullable=False, index=True
    )
    goal_type: Mapped[GoalType] = mapped_column(Enum(GoalType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(14, 4, asdecimal=False), nullable=False)
    current_amount: Mapped[float] = mapped_column(Numeric(14, 4, asdecimal=False), default=0)
    target_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    monthly_contribution: Mapped[Optional[float]] = mapped_column(Numeric(14, 4, asdecimal=False), nullable=True)
    linked_account_ids: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=5)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    portal_user: Mapped["ClientPortalUser"] = relationship(
        "ClientPortalUser", back_populates="goals"
    )


class PortalDocument(Base):
    """Documents shared with clients (statements, reports, forms)."""

    __tablename__ = "portal_documents"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    portal_user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("client_portal_users.id"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    period: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_by: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    portal_user: Mapped["ClientPortalUser"] = relationship(
        "ClientPortalUser", back_populates="documents"
    )


class FirmWhiteLabel(Base, TimestampMixin):
    """White-label configuration for firm-branded client portal."""

    __tablename__ = "firm_white_labels"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    firm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=False, unique=True, index=True
    )
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#1a56db")
    secondary_color: Mapped[str] = mapped_column(String(7), default="#7c3aed")
    accent_color: Mapped[str] = mapped_column(String(7), default="#059669")
    font_family: Mapped[str] = mapped_column(String(100), default="Inter")
    portal_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    footer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disclaimer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    firm: Mapped["Firm"] = relationship("Firm", back_populates="white_label")
