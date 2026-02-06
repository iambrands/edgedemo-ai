"""Meeting Intelligence Models"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, DateTime, Integer, Float, 
    ForeignKey, Boolean, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

try:
    from backend.models.base import Base
except ImportError:
    from models.base import Base


class MeetingStatus(enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MeetingType(enum.Enum):
    INITIAL_CONSULTATION = "initial_consultation"
    QUARTERLY_REVIEW = "quarterly_review"
    ANNUAL_REVIEW = "annual_review"
    PORTFOLIO_REVIEW = "portfolio_review"
    PLANNING_SESSION = "planning_session"
    AD_HOC = "ad_hoc"


class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relationships
    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id"), nullable=False)
    advisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Meeting metadata
    title = Column(String(255), nullable=False)
    meeting_type = Column(SQLEnum(MeetingType), default=MeetingType.AD_HOC)
    status = Column(SQLEnum(MeetingStatus), default=MeetingStatus.SCHEDULED)
    
    # Scheduling
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Platform integration
    platform = Column(String(50), nullable=True)  # zoom, teams, meet, in_person
    external_meeting_id = Column(String(255), nullable=True)
    recording_url = Column(String(500), nullable=True)
    
    # Participants (JSON array of {name, email, role})
    participants = Column(JSON, default=list)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    household = relationship("Household", back_populates="meetings")
    advisor = relationship("User", back_populates="meetings")
    transcript = relationship("MeetingTranscript", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    analysis = relationship("MeetingAnalysis", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("MeetingActionItem", back_populates="meeting", cascade="all, delete-orphan")


class MeetingTranscript(Base):
    __tablename__ = "meeting_transcripts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False, unique=True)
    
    # Raw transcript
    raw_text = Column(Text, nullable=True)
    
    # Diarized segments (JSON array)
    # [{speaker: "John Smith", start: 0.0, end: 5.2, text: "..."}, ...]
    segments = Column(JSON, default=list)
    
    # Processing metadata
    word_count = Column(Integer, default=0)
    confidence_score = Column(Float, nullable=True)
    language = Column(String(10), default="en")
    
    # Whisper model used
    model_version = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="transcript")


class MeetingAnalysis(Base):
    __tablename__ = "meeting_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False, unique=True)
    
    # AI-generated summary
    executive_summary = Column(Text, nullable=True)
    detailed_notes = Column(Text, nullable=True)
    
    # Extracted insights (JSON)
    key_topics = Column(JSON, default=list)  # ["retirement planning", "college savings"]
    client_concerns = Column(JSON, default=list)  # ["market volatility", "healthcare costs"]
    life_events = Column(JSON, default=list)  # ["expecting child", "job change"]
    
    # Risk/sentiment analysis
    risk_tolerance_signals = Column(JSON, nullable=True)  # {current: "moderate", signals: [...]}
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    sentiment_breakdown = Column(JSON, nullable=True)  # {positive: 0.6, neutral: 0.3, negative: 0.1}
    
    # Conversation metrics
    advisor_talk_ratio = Column(Float, nullable=True)  # 0.0 to 1.0
    client_talk_ratio = Column(Float, nullable=True)
    questions_asked = Column(Integer, default=0)
    
    # Follow-up content
    suggested_followup_email = Column(Text, nullable=True)
    next_meeting_topics = Column(JSON, default=list)
    
    # Compliance flags
    compliance_flags = Column(JSON, default=list)  # [{type: "suitability", text: "..."}]
    requires_review = Column(Boolean, default=False)
    
    # Model metadata
    model_used = Column(String(100), nullable=True)
    analysis_version = Column(String(20), default="1.0")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="analysis")


class MeetingActionItem(Base):
    __tablename__ = "meeting_action_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    
    # Action item details
    description = Column(Text, nullable=False)
    assigned_to = Column(String(255), nullable=True)  # advisor name or "client"
    due_date = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    # Status tracking
    status = Column(String(20), default="pending")  # pending, in_progress, completed, cancelled
    completed_at = Column(DateTime, nullable=True)
    
    # Source reference
    transcript_timestamp = Column(Float, nullable=True)  # seconds into meeting
    source_text = Column(Text, nullable=True)  # exact quote that generated this
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="action_items")


class MeetingTemplate(Base):
    """Reusable meeting agendas/templates"""
    __tablename__ = "meeting_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firm_id = Column(UUID(as_uuid=True), ForeignKey("firms.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    meeting_type = Column(SQLEnum(MeetingType), nullable=False)
    
    # Template content
    agenda_items = Column(JSON, default=list)  # ["Review portfolio performance", "Discuss goals"]
    discussion_prompts = Column(JSON, default=list)
    required_documents = Column(JSON, default=list)
    
    # Duration estimate
    estimated_duration_minutes = Column(Integer, default=60)
    
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
