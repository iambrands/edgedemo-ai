"""Prospect pipeline enhancements (IMM-04)

Revision ID: 012
Revises: 011
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum values to prospectstatus
    # PostgreSQL requires ALTER TYPE ... ADD VALUE (cannot be in a transaction block)
    op.execute("ALTER TYPE prospectstatus ADD VALUE IF NOT EXISTS 'agreement_signed'")
    op.execute("ALTER TYPE prospectstatus ADD VALUE IF NOT EXISTS 'onboarding'")
    op.execute("ALTER TYPE prospectstatus ADD VALUE IF NOT EXISTS 'active_client'")

    # Add new columns to prospects table
    op.add_column(
        "prospects",
        sa.Column("risk_profile_completed", sa.Boolean(), server_default="false", nullable=True),
    )
    op.add_column(
        "prospects",
        sa.Column("signed_agreement_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "prospects",
        sa.Column("custodian_account_id", sa.String(64), nullable=True),
    )
    op.add_column(
        "prospects",
        sa.Column("first_funding_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "prospects",
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create prospect_communications table
    op.create_table(
        "prospect_communications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "prospect_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("prospects.id"),
            nullable=False,
        ),
        sa.Column("comm_type", sa.String(32), nullable=False),
        sa.Column("template_name", sa.String(64), nullable=True),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_prospect_comms_prospect", "prospect_communications", ["prospect_id"]
    )
    op.create_index(
        "ix_prospect_comms_sent", "prospect_communications", ["sent_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_prospect_comms_sent")
    op.drop_index("ix_prospect_comms_prospect")
    op.drop_table("prospect_communications")
    op.drop_column("prospects", "last_activity_at")
    op.drop_column("prospects", "first_funding_date")
    op.drop_column("prospects", "custodian_account_id")
    op.drop_column("prospects", "signed_agreement_url")
    op.drop_column("prospects", "risk_profile_completed")
