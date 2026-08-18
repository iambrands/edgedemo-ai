"""Add plaid_items table for B2C account aggregation

Revision ID: 021
Revises: 020
Create Date: 2026-08-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plaid_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("plaid_item_id", sa.String(255), nullable=False, unique=True),
        sa.Column("access_token_enc", sa.Text(), nullable=False),
        sa.Column("institution_id", sa.String(100), nullable=True),
        sa.Column("institution_name", sa.String(255), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(100), nullable=True),
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
    op.create_index("ix_plaid_items_user_id", "plaid_items", ["user_id"])
    op.create_index("ix_plaid_items_plaid_item_id", "plaid_items", ["plaid_item_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_plaid_items_plaid_item_id")
    op.drop_index("ix_plaid_items_user_id")
    op.drop_table("plaid_items")
