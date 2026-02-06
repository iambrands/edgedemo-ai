"""
Compliance Document models for ADV Part 2B, Form CRS, and other regulatory documents.
Supports AI-powered generation, version control, and e-delivery tracking.
"""

import enum
import logging
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .client import Client
    from .firm import Firm
    from .user import User

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================

class DocumentType(enum.Enum):
    """Types of compliance documents."""
    ADV_PART_2A = "adv_part_2a"
    ADV_PART_2B = "adv_part_2b"
    FORM_CRS = "form_crs"
    PRIVACY_POLICY = "privacy_policy"
    ADVISORY_AGREEMENT = "advisory_agreement"


class DocumentStatus(enum.Enum):
    """Status of a compliance document."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class DeliveryStatus(enum.Enum):
    """Status of document delivery to a client."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"


# ============================================================================
# MODELS
# ============================================================================

class ComplianceDocument(Base, TimestampMixin):
    """Master compliance document with version history."""

    __tablename__ = "compliance_documents"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    firm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=False, index=True
    )
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_version_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("compliance_document_versions.id"), nullable=True
    )
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.DRAFT
    )

    # Metadata
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expiration_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    regulatory_filing_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    iard_filing_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    firm: Mapped["Firm"] = relationship("Firm")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    versions: Mapped[List["ComplianceDocumentVersion"]] = relationship(
        "ComplianceDocumentVersion",
        back_populates="document",
        foreign_keys="ComplianceDocumentVersion.document_id",
        cascade="all, delete-orphan"
    )
    current_version: Mapped[Optional["ComplianceDocumentVersion"]] = relationship(
        "ComplianceDocumentVersion",
        foreign_keys=[current_version_id],
        post_update=True
    )
    deliveries: Mapped[List["DocumentDelivery"]] = relationship(
        "DocumentDelivery", back_populates="document", cascade="all, delete-orphan"
    )


class ComplianceDocumentVersion(Base):
    """Version history for compliance documents."""

    __tablename__ = "compliance_document_versions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("compliance_documents.id"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Content
    content_json: Mapped[dict] = mapped_column(JSONB, nullable=False)  # Structured content
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Rendered HTML
    content_pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # PDF location

    # AI Generation metadata
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_prompt_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    generation_inputs: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Review workflow
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.DRAFT
    )
    reviewed_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Change tracking
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_sections: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document: Mapped["ComplianceDocument"] = relationship(
        "ComplianceDocument", back_populates="versions", foreign_keys=[document_id]
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by])


class ADVPart2BData(Base, TimestampMixin):
    """Structured data for ADV Part 2B (Brochure Supplement) per advisor."""

    __tablename__ = "adv_part_2b_data"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    advisor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    firm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=False, index=True
    )

    # Item 1: Cover Page
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    crd_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    business_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    business_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Item 2: Educational Background and Business Experience
    education: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # [{degree, institution, year}]
    certifications: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # [{name, issuer, year, expiration}]
    employment_history: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # [{firm, title, start, end}]

    # Item 3: Disciplinary Information
    has_disciplinary_history: Mapped[bool] = mapped_column(Boolean, default=False)
    disciplinary_disclosure: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Item 4: Other Business Activities
    other_business_activities: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # [{activity, compensation_type, time_spent}]
    outside_business_conflicts: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Item 5: Additional Compensation
    additional_compensation_sources: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    economic_benefit_disclosure: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Item 6: Supervision
    supervisor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    supervisor_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    supervision_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Item 7: Requirements for State-Registered Advisers
    arbitration_awards: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    self_regulatory_actions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    bankruptcy_disclosures: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Relationships
    advisor: Mapped["User"] = relationship("User", foreign_keys=[advisor_id])
    firm: Mapped["Firm"] = relationship("Firm")


class FormCRSData(Base, TimestampMixin):
    """Structured data for Form CRS (Client Relationship Summary)."""

    __tablename__ = "form_crs_data"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    firm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("firms.id"), nullable=False, unique=True, index=True
    )

    # Introduction
    firm_name: Mapped[str] = mapped_column(String(255), nullable=False)
    crd_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sec_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_broker_dealer: Mapped[bool] = mapped_column(Boolean, default=False)
    is_investment_adviser: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships and Services
    services_offered: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # [{service, description, limitations}]
    account_minimums: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # {minimum_aum, minimum_fee}
    investment_authority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # discretionary, non-discretionary, both
    account_monitoring: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Fees, Costs, Conflicts, Standard of Conduct
    fee_structure: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # [{fee_type, description, typical_range}]
    other_fees: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    fee_impact_example: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Standard of Conduct
    standard_of_conduct: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conflicts_of_interest: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Disciplinary History
    has_disciplinary_history: Mapped[bool] = mapped_column(Boolean, default=False)
    disciplinary_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Additional Information
    additional_info_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    conversation_starters: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # Questions for clients to ask

    # Relationships
    firm: Mapped["Firm"] = relationship("Firm")


class DocumentDelivery(Base, TimestampMixin):
    """Track e-delivery of compliance documents to clients."""

    __tablename__ = "document_deliveries"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("compliance_documents.id"), nullable=False, index=True
    )
    version_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("compliance_document_versions.id"), nullable=False
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    # Delivery details
    delivery_method: Mapped[str] = mapped_column(String(50), nullable=False)
    # email, portal, mail
    delivery_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus), default=DeliveryStatus.PENDING
    )

    # Tracking timestamps
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # E-signature / Acknowledgment
    acknowledgment_required: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledgment_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acknowledgment_ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    acknowledgment_user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Retry tracking
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    document: Mapped["ComplianceDocument"] = relationship(
        "ComplianceDocument", back_populates="deliveries"
    )
    version: Mapped["ComplianceDocumentVersion"] = relationship("ComplianceDocumentVersion")
    client: Mapped["Client"] = relationship("Client")


class DocumentTemplate(Base, TimestampMixin):
    """Reusable templates for compliance documents."""

    __tablename__ = "document_templates"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Template content
    template_html: Mapped[str] = mapped_column(Text, nullable=False)
    template_css: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    variable_schema: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # JSON schema for template variables

    # AI generation prompts
    section_prompts: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # {section_id: prompt_template}

    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
