"""Add management fields to accounts

Revision ID: 016
Revises: 015
Create Date: 2026-08-17
"""

from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("management_mode", sa.String(length=30), nullable=True))
    op.add_column("accounts", sa.Column("source", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("accounts", "source")
    op.drop_column("accounts", "management_mode")
