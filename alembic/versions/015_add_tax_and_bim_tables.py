"""Add tax_profiles and bim_scores tables

Revision ID: 015
Revises: 014
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tax_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=False,
        ),
        sa.Column("tax_year", sa.Integer(), nullable=False),
        sa.Column("filing_status", sa.String(16), nullable=False),
        sa.Column("agi", sa.Numeric(14, 2), nullable=True),
        sa.Column("taxable_income", sa.Numeric(14, 2), nullable=True),
        sa.Column("effective_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("marginal_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("capital_gains", postgresql.JSONB, nullable=True),
        sa.Column("raw_data", postgresql.JSONB, nullable=True),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("client_id", "tax_year", name="uq_tax_profile_client_year"),
    )

    op.create_table(
        "bim_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=False,
        ),
        sa.Column("score_type", sa.String(64), nullable=False),
        sa.Column("score", sa.Numeric(5, 4), nullable=False),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column(
            "computed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("bim_scores")
    op.drop_table("tax_profiles")
