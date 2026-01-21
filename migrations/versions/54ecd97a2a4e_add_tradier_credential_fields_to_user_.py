"""Add Tradier credential fields to User model

Revision ID: 54ecd97a2a4e
Revises: add_spread_and_rate_limit
Create Date: 2026-01-21 15:42:42.202900

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '54ecd97a2a4e'
down_revision = 'add_spread_and_rate_limit'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    # Only add Tradier credential fields - check if they exist first
    with op.batch_alter_table('users', schema=None) as batch_op:
        if not column_exists('users', 'tradier_api_key'):
            batch_op.add_column(sa.Column('tradier_api_key', sa.String(length=255), nullable=True))
        
        if not column_exists('users', 'tradier_account_id'):
            batch_op.add_column(sa.Column('tradier_account_id', sa.String(length=50), nullable=True))
        
        if not column_exists('users', 'tradier_environment'):
            batch_op.add_column(sa.Column('tradier_environment', sa.String(length=20), server_default='sandbox', nullable=True))


def downgrade():
    # Remove Tradier credential fields
    with op.batch_alter_table('users', schema=None) as batch_op:
        if column_exists('users', 'tradier_environment'):
            batch_op.drop_column('tradier_environment')
        
        if column_exists('users', 'tradier_account_id'):
            batch_op.drop_column('tradier_account_id')
        
        if column_exists('users', 'tradier_api_key'):
            batch_op.drop_column('tradier_api_key')
