"""Add advisor billing fields to advisor_connection_requests

Revision ID: 022
Revises: 021
Create Date: 2026-08-18
"""
from alembic import op
import sqlalchemy as sa

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "advisor_connection_requests",
        sa.Column("aum_at_match", sa.Numeric(precision=18, scale=2), nullable=True),
    )
    op.add_column(
        "advisor_connection_requests",
        sa.Column("platform_fee_bps", sa.Integer(), nullable=True),
    )
    op.add_column(
        "advisor_connection_requests",
        sa.Column("platform_fee_amount", sa.Numeric(precision=18, scale=2), nullable=True),
    )
    op.add_column(
        "advisor_connection_requests",
        sa.Column("platform_fee_logged_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("advisor_connection_requests", "platform_fee_logged_at")
    op.drop_column("advisor_connection_requests", "platform_fee_amount")
    op.drop_column("advisor_connection_requests", "platform_fee_bps")
    op.drop_column("advisor_connection_requests", "aum_at_match")
