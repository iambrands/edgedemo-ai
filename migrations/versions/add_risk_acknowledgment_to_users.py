"""Add risk acknowledgment fields to users table

Revision ID: add_risk_ack_001
Revises: float_to_numeric_001
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_risk_ack_001'
down_revision = 'float_to_numeric_001'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    """Add risk acknowledgment and terms acceptance columns to users."""
    if not column_exists('users', 'risk_acknowledged_at'):
        op.add_column('users', sa.Column('risk_acknowledged_at', sa.DateTime(), nullable=True))

    if not column_exists('users', 'risk_acknowledgment_version'):
        op.add_column('users', sa.Column('risk_acknowledgment_version', sa.String(length=10), nullable=True))

    if not column_exists('users', 'terms_accepted_at'):
        op.add_column('users', sa.Column('terms_accepted_at', sa.DateTime(), nullable=True))

    if not column_exists('users', 'terms_version'):
        op.add_column('users', sa.Column('terms_version', sa.String(length=10), nullable=True))


def downgrade():
    """Remove risk acknowledgment columns from users."""
    if column_exists('users', 'terms_version'):
        op.drop_column('users', 'terms_version')

    if column_exists('users', 'terms_accepted_at'):
        op.drop_column('users', 'terms_accepted_at')

    if column_exists('users', 'risk_acknowledgment_version'):
        op.drop_column('users', 'risk_acknowledgment_version')

    if column_exists('users', 'risk_acknowledged_at'):
        op.drop_column('users', 'risk_acknowledged_at')
