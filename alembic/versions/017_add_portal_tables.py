"""Add client portal tables (client_portal_users, portal_narratives, behavioral_nudges, etc.)

Revision ID: 017
Revises: 016
Create Date: 2026-08-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # client_portal_users
    op.create_table(
        "client_portal_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=False, index=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("last_login", sa.DateTime(), nullable=True),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("firms.id"), nullable=True, index=True),
        sa.Column("email_narratives", sa.Boolean(), default=True),
        sa.Column("email_nudges", sa.Boolean(), default=True),
        sa.Column("email_documents", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # portal_narratives
    op.create_table(
        "portal_narratives",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("portal_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("client_portal_users.id"), nullable=False, index=True),
        sa.Column("narrative_type", sa.String(50), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_html", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # behavioral_nudges
    nudge_type_enum = postgresql.ENUM(
        "rebalance", "tax_loss", "cash_drag", "concentration", "goal_progress",
        "market_volatility", "contribution_reminder", "rmd_reminder",
        name="nudgetype", create_type=True,
    )
    nudge_status_enum = postgresql.ENUM(
        "pending", "delivered", "viewed", "acted", "dismissed",
        name="nudgestatus", create_type=True,
    )
    op.create_table(
        "behavioral_nudges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("portal_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("client_portal_users.id"), nullable=False, index=True),
        sa.Column("nudge_type", nudge_type_enum, nullable=False),
        sa.Column("status", nudge_status_enum, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("action_label", sa.String(100), nullable=True),
        sa.Column("priority", sa.Integer(), default=5),
        sa.Column("nudge_metadata", postgresql.JSONB(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("viewed_at", sa.DateTime(), nullable=True),
        sa.Column("acted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # nudge_interactions
    op.create_table(
        "nudge_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nudge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("behavioral_nudges.id"), nullable=False, index=True),
        sa.Column("interaction_type", sa.String(50), nullable=False),
        sa.Column("interaction_metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # client_goals
    goal_type_enum = postgresql.ENUM(
        "retirement", "education", "home_purchase", "emergency_fund",
        "wealth_transfer", "custom",
        name="goaltype", create_type=True,
    )
    op.create_table(
        "client_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("portal_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("client_portal_users.id"), nullable=False, index=True),
        sa.Column("goal_type", goal_type_enum, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("target_amount", sa.Float(), nullable=False),
        sa.Column("current_amount", sa.Float(), default=0),
        sa.Column("target_date", sa.DateTime(), nullable=False),
        sa.Column("monthly_contribution", sa.Float(), nullable=True),
        sa.Column("linked_account_ids", postgresql.JSONB(), nullable=True),
        sa.Column("priority", sa.Integer(), default=5),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # portal_documents
    op.create_table(
        "portal_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("portal_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("client_portal_users.id"), nullable=False, index=True),
        sa.Column("document_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("period", sa.String(50), nullable=True),
        sa.Column("is_read", sa.Boolean(), default=False),
        sa.Column("uploaded_by", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # firm_white_labels
    op.create_table(
        "firm_white_labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("firms.id"), nullable=False, unique=True, index=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=False),
        sa.Column("secondary_color", sa.String(7), nullable=False),
        sa.Column("accent_color", sa.String(7), nullable=False),
        sa.Column("font_family", sa.String(100), nullable=False),
        sa.Column("portal_title", sa.String(255), nullable=True),
        sa.Column("custom_domain", sa.String(255), nullable=True),
        sa.Column("footer_text", sa.Text(), nullable=True),
        sa.Column("disclaimer_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("firm_white_labels")
    op.drop_table("portal_documents")
    op.drop_table("client_goals")
    op.drop_table("nudge_interactions")
    op.drop_table("behavioral_nudges")
    op.drop_table("portal_narratives")
    op.drop_table("client_portal_users")
    op.execute("DROP TYPE IF EXISTS goaltype")
    op.execute("DROP TYPE IF EXISTS nudgestatus")
    op.execute("DROP TYPE IF EXISTS nudgetype")
