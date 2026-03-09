"""Add accounts_snapshot table

Revision ID: 013
Revises: 012
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "accounts_snapshot",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column("account_id", sa.String(64), nullable=False),
        sa.Column("holdings", postgresql.JSONB, nullable=True),
        sa.Column(
            "snapshot_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("source", sa.String(32), server_default="altruist", nullable=False),
    )
    op.create_index(
        "ix_accounts_snapshot_advisor_time",
        "accounts_snapshot",
        ["advisor_id", sa.text("snapshot_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_accounts_snapshot_advisor_time")
    op.drop_table("accounts_snapshot")
