"""Add advisor_connection_requests table for B2C advisor matching

Revision ID: 018
Revises: 017
Create Date: 2026-08-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "advisor_connection_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=True,
            index=True,
        ),
        # What the user told us about themselves
        sa.Column("investable_assets_range", sa.String(50), nullable=True),
        sa.Column("primary_goal", sa.String(100), nullable=True),
        sa.Column("preferred_meeting_format", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        # Status lifecycle: pending → matched → accepted → declined → cancelled
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column(
            "matched_advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=True,
            index=True,
        ),
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decline_reason", sa.String(255), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_advisor_conn_user", "advisor_connection_requests", ["user_id"]
    )
    op.create_index(
        "ix_advisor_conn_status", "advisor_connection_requests", ["status"]
    )


def downgrade() -> None:
    op.drop_index("ix_advisor_conn_status")
    op.drop_index("ix_advisor_conn_user")
    op.drop_table("advisor_connection_requests")
