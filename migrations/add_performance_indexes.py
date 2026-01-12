"""Add performance indexes for critical queries

This migration adds database indexes to improve query performance.
Run this with: flask db upgrade
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = '3a2807af4be6'  # Update to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    """Add performance indexes"""
    # Positions table indexes
    op.create_index(
        'idx_positions_user_status',
        'positions',
        ['user_id', 'status'],
        unique=False
    )
    op.create_index(
        'idx_positions_status_updated',
        'positions',
        ['status', 'last_updated'],
        unique=False,
        postgresql_ops={'last_updated': 'DESC'}
    )
    
    # Trades table indexes
    op.create_index(
        'idx_trades_user_timestamp',
        'trades',
        ['user_id', 'executed_at'],
        unique=False,
        postgresql_ops={'executed_at': 'DESC'}
    )
    op.create_index(
        'idx_trades_position_id',
        'trades',
        ['position_id'],
        unique=False
    )
    
    # Watchlist table indexes
    op.create_index(
        'idx_watchlist_user_symbol',
        'watchlist',
        ['user_id', 'symbol'],
        unique=False
    )
    
    # Automations table indexes
    op.create_index(
        'idx_automations_user_enabled',
        'automations',
        ['user_id', 'is_enabled'],
        unique=False
    )
    
    # Alerts table indexes
    op.create_index(
        'idx_alerts_user_read',
        'alerts',
        ['user_id', 'is_read', 'created_at'],
        unique=False,
        postgresql_ops={'created_at': 'DESC'}
    )


def downgrade():
    """Remove performance indexes"""
    op.drop_index('idx_positions_user_status', table_name='positions')
    op.drop_index('idx_positions_status_updated', table_name='positions')
    op.drop_index('idx_trades_user_timestamp', table_name='trades')
    op.drop_index('idx_trades_position_id', table_name='trades')
    op.drop_index('idx_watchlist_user_symbol', table_name='watchlist')
    op.drop_index('idx_automations_user_enabled', table_name='automations')
    op.drop_index('idx_alerts_user_read', table_name='alerts')

