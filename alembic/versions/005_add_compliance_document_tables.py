"""add compliance document tables

Revision ID: 005
Revises: 004
Create Date: 2026-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    document_type_enum = postgresql.ENUM(
        'adv_part_2a', 'adv_part_2b', 'form_crs', 'privacy_policy', 'advisory_agreement',
        name='documenttype',
        create_type=False
    )
    document_type_enum.create(op.get_bind(), checkfirst=True)

    document_status_enum = postgresql.ENUM(
        'draft', 'pending_review', 'approved', 'published', 'archived',
        name='documentstatus',
        create_type=False
    )
    document_status_enum.create(op.get_bind(), checkfirst=True)

    delivery_status_enum = postgresql.ENUM(
        'pending', 'sent', 'delivered', 'opened', 'acknowledged', 'failed',
        name='deliverystatus',
        create_type=False
    )
    delivery_status_enum.create(op.get_bind(), checkfirst=True)

    # Create compliance_documents table
    op.create_table(
        "compliance_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_type", sa.Enum(
            'adv_part_2a', 'adv_part_2b', 'form_crs', 'privacy_policy', 'advisory_agreement',
            name='documenttype'
        ), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.Enum(
            'draft', 'pending_review', 'approved', 'published', 'archived',
            name='documentstatus'
        ), nullable=True),
        sa.Column("effective_date", sa.DateTime(), nullable=True),
        sa.Column("expiration_date", sa.DateTime(), nullable=True),
        sa.Column("regulatory_filing_date", sa.DateTime(), nullable=True),
        sa.Column("iard_filing_number", sa.String(50), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["firm_id"], ["firms.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_compliance_documents_firm_id", "compliance_documents", ["firm_id"])

    # Create compliance_document_versions table
    op.create_table(
        "compliance_document_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("content_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("content_html", sa.Text(), nullable=True),
        sa.Column("content_pdf_path", sa.String(500), nullable=True),
        sa.Column("ai_generated", sa.Boolean(), default=False, nullable=False),
        sa.Column("ai_model", sa.String(50), nullable=True),
        sa.Column("ai_prompt_hash", sa.String(64), nullable=True),
        sa.Column("generation_inputs", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.Enum(
            'draft', 'pending_review', 'approved', 'published', 'archived',
            name='documentstatus'
        ), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("changed_sections", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["compliance_documents.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_compliance_document_versions_document_id", "compliance_document_versions", ["document_id"])

    # Add FK from compliance_documents to compliance_document_versions (deferred)
    op.create_foreign_key(
        "fk_compliance_documents_current_version",
        "compliance_documents",
        "compliance_document_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL"
    )

    # Create adv_part_2b_data table
    op.create_table(
        "adv_part_2b_data",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("advisor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("crd_number", sa.String(20), nullable=True),
        sa.Column("business_address", sa.Text(), nullable=True),
        sa.Column("business_phone", sa.String(20), nullable=True),
        sa.Column("education", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("certifications", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("employment_history", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("has_disciplinary_history", sa.Boolean(), default=False, nullable=False),
        sa.Column("disciplinary_disclosure", sa.Text(), nullable=True),
        sa.Column("other_business_activities", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("outside_business_conflicts", sa.Text(), nullable=True),
        sa.Column("additional_compensation_sources", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("economic_benefit_disclosure", sa.Text(), nullable=True),
        sa.Column("supervisor_name", sa.String(255), nullable=True),
        sa.Column("supervisor_phone", sa.String(20), nullable=True),
        sa.Column("supervision_description", sa.Text(), nullable=True),
        sa.Column("arbitration_awards", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("self_regulatory_actions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("bankruptcy_disclosures", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["advisor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["firm_id"], ["firms.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("advisor_id"),
    )
    op.create_index("ix_adv_part_2b_data_advisor_id", "adv_part_2b_data", ["advisor_id"])
    op.create_index("ix_adv_part_2b_data_firm_id", "adv_part_2b_data", ["firm_id"])

    # Create form_crs_data table
    op.create_table(
        "form_crs_data",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firm_name", sa.String(255), nullable=False),
        sa.Column("crd_number", sa.String(20), nullable=True),
        sa.Column("sec_number", sa.String(20), nullable=True),
        sa.Column("is_broker_dealer", sa.Boolean(), default=False, nullable=False),
        sa.Column("is_investment_adviser", sa.Boolean(), default=True, nullable=False),
        sa.Column("services_offered", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("account_minimums", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("investment_authority", sa.String(50), nullable=True),
        sa.Column("account_monitoring", sa.Text(), nullable=True),
        sa.Column("fee_structure", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("other_fees", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("fee_impact_example", sa.Text(), nullable=True),
        sa.Column("standard_of_conduct", sa.Text(), nullable=True),
        sa.Column("conflicts_of_interest", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("has_disciplinary_history", sa.Boolean(), default=False, nullable=False),
        sa.Column("disciplinary_link", sa.String(500), nullable=True),
        sa.Column("additional_info_link", sa.String(500), nullable=True),
        sa.Column("conversation_starters", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["firm_id"], ["firms.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("firm_id"),
    )
    op.create_index("ix_form_crs_data_firm_id", "form_crs_data", ["firm_id"])

    # Create document_deliveries table
    op.create_table(
        "document_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delivery_method", sa.String(50), nullable=False),
        sa.Column("delivery_email", sa.String(255), nullable=True),
        sa.Column("delivery_status", sa.Enum(
            'pending', 'sent', 'delivered', 'opened', 'acknowledged', 'failed',
            name='deliverystatus'
        ), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(), nullable=True),
        sa.Column("acknowledgment_required", sa.Boolean(), default=False, nullable=False),
        sa.Column("acknowledgment_text", sa.Text(), nullable=True),
        sa.Column("acknowledgment_ip", sa.String(50), nullable=True),
        sa.Column("acknowledgment_user_agent", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), default=0, nullable=False),
        sa.Column("last_retry_at", sa.DateTime(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["compliance_documents.id"]),
        sa.ForeignKeyConstraint(["version_id"], ["compliance_document_versions.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_deliveries_document_id", "document_deliveries", ["document_id"])
    op.create_index("ix_document_deliveries_client_id", "document_deliveries", ["client_id"])

    # Create document_templates table
    op.create_table(
        "document_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_type", sa.Enum(
            'adv_part_2a', 'adv_part_2b', 'form_crs', 'privacy_policy', 'advisory_agreement',
            name='documenttype'
        ), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("template_html", sa.Text(), nullable=False),
        sa.Column("template_css", sa.Text(), nullable=True),
        sa.Column("variable_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("section_prompts", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_default", sa.Boolean(), default=False, nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("document_templates")
    op.drop_table("document_deliveries")
    op.drop_table("form_crs_data")
    op.drop_table("adv_part_2b_data")
    op.drop_foreign_key("fk_compliance_documents_current_version", "compliance_documents")
    op.drop_table("compliance_document_versions")
    op.drop_table("compliance_documents")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS deliverystatus")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS documenttype")
