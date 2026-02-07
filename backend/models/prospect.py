"""
Prospect Pipeline Models.

CRM for tracking leads through the sales funnel with AI-powered lead scoring,
activity tracking, proposal generation, configurable pipeline stages, and
email templates.
"""

import enum
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================


class ProspectStatus(str, enum.Enum):
    """Pipeline stage for prospects."""

    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    MEETING_SCHEDULED = "meeting_scheduled"
    MEETING_COMPLETED = "meeting_completed"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATING = "negotiating"
    WON = "won"
    LOST = "lost"
    NURTURING = "nurturing"


class LeadSource(str, enum.Enum):
    """How the prospect was acquired."""

    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    SEMINAR = "seminar"
    COLD_OUTREACH = "cold_outreach"
    ADVERTISING = "advertising"
    PARTNERSHIP = "partnership"
    EXISTING_CLIENT = "existing_client"
    OTHER = "other"


class ActivityType(str, enum.Enum):
    """Types of prospect interactions."""

    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    VIDEO_CALL = "video_call"
    TEXT = "text"
    LINKEDIN_MESSAGE = "linkedin_message"
    VOICEMAIL = "voicemail"
    NOTE = "note"
    TASK = "task"
    PROPOSAL = "proposal"
    DOCUMENT_SENT = "document_sent"
    DOCUMENT_SIGNED = "document_signed"


class ProposalStatus(str, enum.Enum):
    """Status of a proposal."""

    DRAFT = "draft"
    REVIEW = "review"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    REVISED = "revised"


# ============================================================================
# MODELS
# ============================================================================


class Prospect(Base, TimestampMixin):
    """
    Core prospect/lead record.
    Tracks individuals through the sales pipeline.
    """

    __tablename__ = "prospects"
    __table_args__ = (
        Index("ix_prospects_advisor", "advisor_id"),
        Index("ix_prospects_status", "status"),
        Index("ix_prospects_score", "lead_score"),
        Index("ix_prospects_email", "email"),
        Index("ix_prospects_created", "created_at"),
        Index("ix_prospects_next_action", "next_action_date"),
        Index(
            "ix_prospects_search",
            "search_vector",
            postgresql_using="gin",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )

    # Basic Info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    phone_secondary: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # Professional
    company: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    linkedin_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Location
    address_line1: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    address_line2: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    country: Mapped[str] = mapped_column(String(50), default="USA")

    # Pipeline
    status: Mapped[ProspectStatus] = mapped_column(
        SQLEnum(ProspectStatus), default=ProspectStatus.NEW
    )
    lead_source: Mapped[LeadSource] = mapped_column(
        SQLEnum(LeadSource), default=LeadSource.OTHER
    )
    source_detail: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Referral tracking
    referred_by_client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    referred_by_prospect_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("prospects.id"), nullable=True
    )

    # Financial Profile (for qualification)
    estimated_aum: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    annual_income: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    net_worth: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    current_advisor: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    investment_experience: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # Investment Preferences
    risk_tolerance: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    investment_goals: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    time_horizon: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    interested_services: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Lead Scoring
    lead_score: Mapped[int] = mapped_column(Integer, default=0)
    fit_score: Mapped[int] = mapped_column(Integer, default=0)
    intent_score: Mapped[int] = mapped_column(Integer, default=0)
    engagement_score: Mapped[int] = mapped_column(Integer, default=0)
    score_factors: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    last_scored_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Pipeline Tracking
    stage_entered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default="now()"
    )
    days_in_stage: Mapped[int] = mapped_column(Integer, default=0)
    total_days_in_pipeline: Mapped[int] = mapped_column(Integer, default=0)

    # Next Action
    next_action_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    next_action_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    next_action_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Assignment
    assigned_to: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    # Conversion
    converted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    converted_client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    lost_reason: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    lost_to_competitor: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Notes & Tags
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Full-text search
    search_vector: Mapped[Optional[str]] = mapped_column(
        TSVECTOR, nullable=True
    )

    # Custom fields
    custom_fields: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )

    # AI insights
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_recommendations: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Relationships
    activities: Mapped[List["ProspectActivity"]] = relationship(
        "ProspectActivity",
        back_populates="prospect",
        cascade="all, delete-orphan",
    )
    proposals: Mapped[List["Proposal"]] = relationship(
        "Proposal",
        back_populates="prospect",
        cascade="all, delete-orphan",
    )


class ProspectActivity(Base, TimestampMixin):
    """
    Tracks all interactions with a prospect.
    Calls, emails, meetings, notes, tasks, etc.
    """

    __tablename__ = "prospect_activities"
    __table_args__ = (
        Index("ix_prospect_activities_prospect", "prospect_id"),
        Index("ix_prospect_activities_type", "activity_type"),
        Index("ix_prospect_activities_date", "activity_date"),
        Index("ix_prospect_activities_advisor", "advisor_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    prospect_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("prospects.id"), nullable=False
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )

    # Activity Details
    activity_type: Mapped[ActivityType] = mapped_column(
        SQLEnum(ActivityType), nullable=False
    )
    subject: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    activity_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    duration_minutes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # For calls
    call_outcome: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    call_direction: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )

    # For emails
    email_status: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    email_template_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    # For meetings
    meeting_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("meetings.id"),
        nullable=True,
    )
    meeting_outcome: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # For tasks
    task_due_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    task_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    task_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Status change tracking
    status_before: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    status_after: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # Metadata
    is_automated: Mapped[bool] = mapped_column(Boolean, default=False)
    automation_trigger: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Relationship
    prospect: Mapped["Prospect"] = relationship(
        "Prospect", back_populates="activities"
    )


class Proposal(Base, TimestampMixin):
    """
    Investment proposals generated for prospects.
    Tracks AI-generated and manual proposals through approval flow.
    """

    __tablename__ = "proposals"
    __table_args__ = (
        Index("ix_proposals_prospect", "prospect_id"),
        Index("ix_proposals_status", "status"),
        Index("ix_proposals_advisor", "advisor_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    prospect_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("prospects.id"), nullable=False
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )

    # Proposal Details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    proposal_number: Mapped[Optional[str]] = mapped_column(
        String(50), unique=True, nullable=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)

    # Status
    status: Mapped[ProposalStatus] = mapped_column(
        SQLEnum(ProposalStatus), default=ProposalStatus.DRAFT
    )

    # Content
    executive_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    investment_philosophy: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    proposed_strategy: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    fee_structure: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Financial Projections
    proposed_aum: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    proposed_fee_percent: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    estimated_annual_fee: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Model Portfolio Recommendation
    recommended_models: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Risk Assessment
    risk_profile: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    risk_assessment: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Document
    document_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    document_format: Mapped[str] = mapped_column(
        String(20), default="pdf"
    )

    # Tracking
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_via: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    viewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    time_spent_viewing_seconds: Mapped[int] = mapped_column(
        Integer, default=0
    )

    # Response
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    response_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Expiration
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # AI Generation
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_generation_params: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    ai_confidence_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    # Approval
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Custom sections
    custom_sections: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )

    # Relationship
    prospect: Mapped["Prospect"] = relationship(
        "Prospect", back_populates="proposals"
    )


class LeadScoringRule(Base, TimestampMixin):
    """
    Configurable rules for lead scoring.
    Allows advisors to customise scoring criteria.
    """

    __tablename__ = "lead_scoring_rules"
    __table_args__ = (
        UniqueConstraint(
            "advisor_id", "rule_name", name="uq_scoring_rule"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )

    # Rule Definition
    rule_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rule_category: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # fit, intent, engagement
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Condition
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    operator: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)

    # Scoring
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    max_points: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)


class EmailTemplate(Base, TimestampMixin):
    """Email templates for prospect outreach."""

    __tablename__ = "email_templates"
    __table_args__ = (
        Index("ix_email_templates_advisor", "advisor_id"),
        Index("ix_email_templates_category", "category"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Available variables: {{first_name}}, {{last_name}}, {{company}}, etc.
    variables: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Tracking
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    open_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    reply_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class PipelineStageConfig(Base, TimestampMixin):
    """Customisable pipeline stages per advisor."""

    __tablename__ = "pipeline_stage_configs"
    __table_args__ = (
        UniqueConstraint(
            "advisor_id", "stage_order", name="uq_stage_order"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("advisors.id"), nullable=False
    )

    stage_key: Mapped[str] = mapped_column(String(50), nullable=False)
    stage_name: Mapped[str] = mapped_column(String(100), nullable=False)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#6B7280")

    # Automation
    auto_advance_days: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    reminder_days: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    required_activities: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False)
