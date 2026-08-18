"""Add meetings table and wire deferred FKs from 009 and 010

Revision ID: 019
Revises: 018
Create Date: 2026-08-17

Meetings were referenced by prospect_activities and conversation_analyses
(migrations 009 and 010) but the FK constraints were deferred at the time.
This migration:
  1. Creates the meetings table.
  2. Adds proper FK constraints to the two columns that were left as bare UUIDs.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # meetings                                                             #
    # ------------------------------------------------------------------ #
    op.create_table(
        "meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "meeting_type",
            sa.String(50),
            nullable=False,
            server_default="review",
        ),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("video_url", sa.String(1000), nullable=True),
        sa.Column("agenda", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("recording_url", sa.String(1000), nullable=True),
        sa.Column("transcript_url", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_meetings_advisor_id", "meetings", ["advisor_id"])
    op.create_index("ix_meetings_client_id", "meetings", ["client_id"])
    op.create_index("ix_meetings_scheduled_at", "meetings", ["scheduled_at"])

    # ------------------------------------------------------------------ #
    # Wire deferred FKs                                                    #
    # ------------------------------------------------------------------ #
    op.create_foreign_key(
        "fk_prospect_activities_meeting_id",
        "prospect_activities",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_conversation_analyses_meeting_id",
        "conversation_analyses",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_conversation_analyses_meeting_id", "conversation_analyses", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_prospect_activities_meeting_id", "prospect_activities", type_="foreignkey"
    )
    op.drop_index("ix_meetings_scheduled_at", table_name="meetings")
    op.drop_index("ix_meetings_client_id", table_name="meetings")
    op.drop_index("ix_meetings_advisor_id", table_name="meetings")
    op.drop_table("meetings")
