"""Add Spread model and rate limiting fields

Revision ID: add_spread_and_rate_limit
Revises: 3a2807af4be6
Create Date: 2026-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'add_spread_and_rate_limit'
down_revision = '213574eb3fd0'  # Follows add_quantity_to_automations migration
branch_labels = None
depends_on = None

def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def table_exists(table_name):
    """Check if a table exists."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()

def upgrade():
    # Add rate limiting fields to users table (only if they don't exist)
    if not column_exists('users', 'daily_ai_analyses'):
        op.add_column('users', sa.Column('daily_ai_analyses', sa.Integer(), server_default='0', nullable=False))
    if not column_exists('users', 'last_analysis_reset'):
        op.add_column('users', sa.Column('last_analysis_reset', sa.Date(), server_default=sa.func.current_date(), nullable=False))
    
    # Create spreads table (only if it doesn't exist)
    if not table_exists('spreads'):
        op.create_table('spreads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=10), nullable=False),
        sa.Column('spread_type', sa.String(length=20), nullable=False),
        sa.Column('expiration', sa.Date(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('long_strike', sa.Float(), nullable=False),
        sa.Column('long_premium', sa.Float(), nullable=False),
        sa.Column('long_option_symbol', sa.String(length=50)),
        sa.Column('short_strike', sa.Float(), nullable=False),
        sa.Column('short_premium', sa.Float(), nullable=False),
        sa.Column('short_option_symbol', sa.String(length=50)),
        sa.Column('net_debit', sa.Float(), nullable=False),
        sa.Column('max_profit', sa.Float(), nullable=False),
        sa.Column('max_loss', sa.Float(), nullable=False),
        sa.Column('breakeven', sa.Float(), nullable=False),
        sa.Column('strike_width', sa.Float(), nullable=False),
        sa.Column('current_value', sa.Float(), server_default='0.0'),
        sa.Column('unrealized_pnl', sa.Float(), server_default='0.0'),
        sa.Column('unrealized_pnl_percent', sa.Float(), server_default='0.0'),
        sa.Column('realized_pnl', sa.Float()),
        sa.Column('status', sa.String(length=20), server_default='open', nullable=False),
        sa.Column('account_type', sa.String(length=10), server_default='paper', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('closed_at', sa.DateTime()),
        sa.Column('last_updated', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
        
        # Add indices for performance
        op.create_index('ix_spreads_user_id', 'spreads', ['user_id'])
        op.create_index('ix_spreads_symbol', 'spreads', ['symbol'])
        op.create_index('ix_spreads_status', 'spreads', ['status'])
        op.create_index('ix_spreads_expiration', 'spreads', ['expiration'])
        op.create_index('ix_spreads_created_at', 'spreads', ['created_at'])

def downgrade():
    if table_exists('spreads'):
        op.drop_index('ix_spreads_created_at', table_name='spreads')
        op.drop_index('ix_spreads_expiration', table_name='spreads')
        op.drop_index('ix_spreads_status', table_name='spreads')
        op.drop_index('ix_spreads_symbol', table_name='spreads')
        op.drop_index('ix_spreads_user_id', table_name='spreads')
        op.drop_table('spreads')
    
    if column_exists('users', 'last_analysis_reset'):
        op.drop_column('users', 'last_analysis_reset')
    if column_exists('users', 'daily_ai_analyses'):
        op.drop_column('users', 'daily_ai_analyses')

