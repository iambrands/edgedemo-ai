"""
Conversation Intelligence Models.

Extends the Meeting Intelligence feature with real-time compliance monitoring,
deeper sentiment analysis, topic extraction, action-item tracking, speaker
diarisation, and aggregated conversation insights.
"""

import enum
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================


class ComplianceRiskLevel(str, enum.Enum):
    """Risk level for compliance flags."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplianceCategoryType(str, enum.Enum):
    """Categories of compliance concerns."""

    PERFORMANCE_GUARANTEE = "performance_guarantee"
    UNSUITABLE_RECOMMENDATION = "unsuitable_recommendation"
    MISSING_DISCLOSURE = "missing_disclosure"
    PROHIBITED_STATEMENT = "prohibited_statement"
    MISLEADING_INFORMATION = "misleading_information"
    UNAUTHORIZED_PROMISE = "unauthorized_promise"
    PRIVACY_VIOLATION = "privacy_violation"
    FIDUCIARY_BREACH = "fiduciary_breach"
    REGULATORY_VIOLATION = "regulatory_violation"
    OTHER = "other"


class SentimentType(str, enum.Enum):
    """Sentiment classification."""

    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"


class ActionItemStatus(str, enum.Enum):
    """Status of action items extracted from conversations."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class ActionItemPriority(str, enum.Enum):
    """Priority levels for conversation action items."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# ============================================================================
# MODELS
# ============================================================================


class ConversationAnalysis(Base, TimestampMixin):
    """
    Comprehensive analysis of a meeting / conversation.

    Links to the existing Meeting model (one-to-one) and stores
    AI-generated insights including sentiment, compliance, topics,
    and engagement metrics.
    """

    __tablename__ = "conversation_analyses"
    __table_args__ = (
        Index("ix_conversation_analyses_meeting", "meeting_id"),
        Index("ix_conversation_analyses_advisor", "advisor_id"),
        Index("ix_conversation_analyses_client", "client_id"),
        Index("ix_conversation_analyses_date", "analyzed_at"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    meeting_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("meetings.id"),
        nullable=False,
        unique=True,
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=True,
    )

    # Analysis Status
    analysis_status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )
    analyzed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    analysis_version: Mapped[str] = mapped_column(
        String(20), default="1.0"
    )

    # Duration / Talk-Time
    total_duration_seconds: Mapped[int] = mapped_column(
        Integer, default=0
    )
    talk_time_advisor_seconds: Mapped[int] = mapped_column(
        Integer, default=0
    )
    talk_time_client_seconds: Mapped[int] = mapped_column(
        Integer, default=0
    )
    talk_ratio: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    silence_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    # Word Counts
    total_words: Mapped[int] = mapped_column(Integer, default=0)
    advisor_words: Mapped[int] = mapped_column(Integer, default=0)
    client_words: Mapped[int] = mapped_column(Integer, default=0)

    # Sentiment Analysis
    overall_sentiment: Mapped[SentimentType] = mapped_column(
        SQLEnum(SentimentType), default=SentimentType.NEUTRAL
    )
    sentiment_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    client_sentiment: Mapped[SentimentType] = mapped_column(
        SQLEnum(SentimentType), default=SentimentType.NEUTRAL
    )
    client_sentiment_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    sentiment_timeline: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Engagement Metrics
    engagement_score: Mapped[int] = mapped_column(Integer, default=50)
    questions_asked_advisor: Mapped[int] = mapped_column(
        Integer, default=0
    )
    questions_asked_client: Mapped[int] = mapped_column(
        Integer, default=0
    )
    interruptions_count: Mapped[int] = mapped_column(Integer, default=0)

    # Topic Analysis
    topics_discussed: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    topic_breakdown: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    primary_topic: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Key Points
    key_points: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    decisions_made: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    concerns_raised: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Compliance Summary
    compliance_flags_count: Mapped[int] = mapped_column(
        Integer, default=0
    )
    compliance_risk_level: Mapped[ComplianceRiskLevel] = mapped_column(
        SQLEnum(ComplianceRiskLevel), default=ComplianceRiskLevel.LOW
    )
    compliance_reviewed: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    compliance_reviewed_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    compliance_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Action Items Summary
    action_items_count: Mapped[int] = mapped_column(Integer, default=0)
    action_items_completed: Mapped[int] = mapped_column(
        Integer, default=0
    )

    # AI Summary
    executive_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    detailed_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    follow_up_recommendations: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Next Steps
    suggested_next_meeting: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    suggested_next_topic: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Raw Analysis Data
    raw_analysis: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Relationships
    compliance_flags: Mapped[List["ComplianceFlag"]] = relationship(
        "ComplianceFlag",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )
    action_items: Mapped[List["ConversationActionItem"]] = relationship(
        "ConversationActionItem",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )
    speaker_segments: Mapped[List["SpeakerSegment"]] = relationship(
        "SpeakerSegment",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )


class ComplianceFlag(Base, TimestampMixin):
    """
    Individual compliance concerns identified in conversations.
    Requires review and resolution tracking.
    """

    __tablename__ = "compliance_flags"
    __table_args__ = (
        Index("ix_compliance_flags_analysis", "analysis_id"),
        Index("ix_compliance_flags_risk", "risk_level"),
        Index("ix_compliance_flags_category", "category"),
        Index("ix_compliance_flags_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    analysis_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversation_analyses.id"),
        nullable=False,
    )

    # Flag Details
    category: Mapped[ComplianceCategoryType] = mapped_column(
        SQLEnum(ComplianceCategoryType), nullable=False
    )
    risk_level: Mapped[ComplianceRiskLevel] = mapped_column(
        SQLEnum(ComplianceRiskLevel), nullable=False
    )

    # Context
    flagged_text: Mapped[str] = mapped_column(Text, nullable=False)
    context_before: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    context_after: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Timing
    timestamp_start: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    timestamp_end: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # AI Analysis
    ai_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    ai_confidence: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.85")
    )
    suggested_correction: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    regulatory_reference: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Status: pending | reviewed | false_positive | confirmed | remediated
    status: Mapped[str] = mapped_column(String(50), default="pending")

    # Review
    reviewed_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Remediation
    remediation_required: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    remediation_action: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    remediation_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    analysis: Mapped["ConversationAnalysis"] = relationship(
        "ConversationAnalysis", back_populates="compliance_flags"
    )


class ConversationActionItem(Base, TimestampMixin):
    """
    Action items extracted from conversations.
    Tracks assignment, due dates, and completion.
    """

    __tablename__ = "conversation_action_items"
    __table_args__ = (
        Index("ix_conversation_action_items_analysis", "analysis_id"),
        Index("ix_conversation_action_items_assignee", "assigned_to"),
        Index("ix_conversation_action_items_status", "status"),
        Index("ix_conversation_action_items_due", "due_date"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    analysis_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversation_analyses.id"),
        nullable=False,
    )

    # Item Details
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Source
    source_text: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    timestamp: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    speaker: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Assignment
    assigned_to: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    assigned_to_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    owner_type: Mapped[str] = mapped_column(
        String(20), default="advisor"
    )

    # Status
    status: Mapped[ActionItemStatus] = mapped_column(
        SQLEnum(ActionItemStatus), default=ActionItemStatus.PENDING
    )
    priority: Mapped[ActionItemPriority] = mapped_column(
        SQLEnum(ActionItemPriority), default=ActionItemPriority.MEDIUM
    )

    # Dates
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # AI Metadata
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_confidence: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.85")
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completion_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Relationship
    analysis: Mapped["ConversationAnalysis"] = relationship(
        "ConversationAnalysis", back_populates="action_items"
    )


class SpeakerSegment(Base, TimestampMixin):
    """
    Diarised speaker segments with per-segment analysis.
    Tracks who said what, with sentiment and topic tagging per segment.
    """

    __tablename__ = "speaker_segments"
    __table_args__ = (
        Index("ix_speaker_segments_analysis", "analysis_id"),
        Index("ix_speaker_segments_speaker", "speaker_label"),
        Index("ix_speaker_segments_time", "start_time"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    analysis_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversation_analyses.id"),
        nullable=False,
    )

    # Speaker
    speaker_label: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    speaker_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    # Timing
    start_time: Mapped[int] = mapped_column(Integer, nullable=False)
    end_time: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    # Content
    text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0)

    # Segment Analysis
    sentiment: Mapped[SentimentType] = mapped_column(
        SQLEnum(SentimentType), default=SentimentType.NEUTRAL
    )
    sentiment_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    # Flags
    contains_question: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    contains_action_item: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    contains_compliance_concern: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    # Topics in segment
    topics: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # Relationship
    analysis: Mapped["ConversationAnalysis"] = relationship(
        "ConversationAnalysis", back_populates="speaker_segments"
    )


class ComplianceRule(Base, TimestampMixin):
    """
    Configurable compliance rules for flagging conversations.
    System-wide rules (advisor_id IS NULL) plus per-advisor overrides.
    """

    __tablename__ = "compliance_rules"
    __table_args__ = (
        Index("ix_compliance_rules_advisor", "advisor_id"),
        Index("ix_compliance_rules_category", "category"),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=True,
    )

    # Rule Definition
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    category: Mapped[ComplianceCategoryType] = mapped_column(
        SQLEnum(ComplianceCategoryType), nullable=False
    )
    risk_level: Mapped[ComplianceRiskLevel] = mapped_column(
        SQLEnum(ComplianceRiskLevel), default=ComplianceRiskLevel.MEDIUM
    )

    # Detection
    keywords: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    phrases: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    regex_patterns: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # AI Detection
    use_ai_detection: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_prompt: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Response
    regulatory_reference: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    suggested_language: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)


class ConversationInsight(Base, TimestampMixin):
    """
    Aggregated insights across multiple conversations for a period.
    Used for trend analysis, coaching, and performance reporting.
    """

    __tablename__ = "conversation_insights"
    __table_args__ = (
        Index("ix_conversation_insights_advisor", "advisor_id"),
        Index(
            "ix_conversation_insights_period",
            "period_start",
            "period_end",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("advisors.id"),
        nullable=False,
    )

    # Period
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_type: Mapped[str] = mapped_column(
        String(20), default="weekly"
    )

    # Conversation Counts
    total_conversations: Mapped[int] = mapped_column(Integer, default=0)
    total_duration_minutes: Mapped[int] = mapped_column(
        Integer, default=0
    )

    # Averages
    avg_sentiment_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    avg_engagement_score: Mapped[int] = mapped_column(
        Integer, default=50
    )
    avg_talk_ratio: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    # Compliance
    total_compliance_flags: Mapped[int] = mapped_column(
        Integer, default=0
    )
    high_risk_flags: Mapped[int] = mapped_column(Integer, default=0)
    flags_resolved: Mapped[int] = mapped_column(Integer, default=0)

    # Action Items
    total_action_items: Mapped[int] = mapped_column(Integer, default=0)
    action_items_completed: Mapped[int] = mapped_column(
        Integer, default=0
    )
    completion_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )

    # Topics
    top_topics: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    topic_trends: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    # Coaching Insights
    coaching_opportunities: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    strengths_identified: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
    areas_for_improvement: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )

    # AI Generated Summary
    period_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    recommendations: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), default=list, nullable=True
    )
