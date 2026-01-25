"""Add user performance tracking tables

Revision ID: add_user_performance
Revises: 54ecd97a2a4e
Create Date: 2026-01-24 18:00:00.000000

This migration creates:
- user_performance: Individual user performance metrics
- platform_stats: Platform-wide aggregate statistics

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'add_user_performance'
down_revision = '54ecd97a2a4e'  # Latest migration in the chain
branch_labels = None
depends_on = None


def table_exists(table_name):
    """Check if a table exists."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def index_exists(index_name, table_name):
    """Check if an index exists on a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def upgrade():
    """Create user_performance and platform_stats tables"""
    
    # ============================================================
    # CREATE user_performance TABLE
    # ============================================================
    if not table_exists('user_performance'):
        print("📊 Creating user_performance table...")
        op.create_table(
            'user_performance',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            
            # Overall statistics
            sa.Column('total_trades', sa.Integer(), server_default='0'),
            sa.Column('winning_trades', sa.Integer(), server_default='0'),
            sa.Column('losing_trades', sa.Integer(), server_default='0'),
            sa.Column('total_profit_loss', sa.Numeric(12, 2), server_default='0'),
            sa.Column('total_capital_deployed', sa.Numeric(12, 2), server_default='0'),
            
            # Time-based performance
            sa.Column('mtd_pnl', sa.Numeric(12, 2), server_default='0'),
            sa.Column('ytd_pnl', sa.Numeric(12, 2), server_default='0'),
            sa.Column('all_time_high_pnl', sa.Numeric(12, 2), server_default='0'),
            
            # Performance metrics
            sa.Column('win_rate', sa.Numeric(5, 2), server_default='0'),
            sa.Column('avg_return_pct', sa.Numeric(5, 2), server_default='0'),
            sa.Column('avg_win_size', sa.Numeric(10, 2), server_default='0'),
            sa.Column('avg_loss_size', sa.Numeric(10, 2), server_default='0'),
            sa.Column('largest_win', sa.Numeric(10, 2), server_default='0'),
            sa.Column('largest_loss', sa.Numeric(10, 2), server_default='0'),
            
            # Risk metrics
            sa.Column('sharpe_ratio', sa.Numeric(5, 2)),
            sa.Column('max_drawdown', sa.Numeric(10, 2)),
            sa.Column('current_streak', sa.Integer(), server_default='0'),
            sa.Column('best_streak', sa.Integer(), server_default='0'),
            
            # Signal following statistics
            sa.Column('signals_followed', sa.Integer(), server_default='0'),
            sa.Column('signals_won', sa.Integer(), server_default='0'),
            sa.Column('signal_follow_rate', sa.Numeric(5, 2), server_default='0'),
            
            # Privacy settings
            sa.Column('public_profile', sa.Boolean(), server_default='false'),
            sa.Column('show_on_leaderboard', sa.Boolean(), server_default='false'),
            sa.Column('allow_performance_display', sa.Boolean(), server_default='true'),
            
            # Metadata
            sa.Column('first_trade_date', sa.DateTime()),
            sa.Column('last_trade_date', sa.DateTime()),
            sa.Column('account_age_days', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id', name='uq_user_performance_user_id')
        )
        
        # Create indexes for faster lookups
        op.create_index('idx_user_performance_user_id', 'user_performance', ['user_id'])
        op.create_index('idx_user_performance_leaderboard', 'user_performance', 
                       ['show_on_leaderboard', 'total_profit_loss'])
        
        print("✅ Created user_performance table with indexes")
    else:
        print("⏭️  user_performance table already exists, skipping...")
    
    # ============================================================
    # CREATE platform_stats TABLE
    # ============================================================
    if not table_exists('platform_stats'):
        print("📊 Creating platform_stats table...")
        op.create_table(
            'platform_stats',
            sa.Column('id', sa.Integer(), nullable=False),
            
            # User metrics
            sa.Column('total_users', sa.Integer(), server_default='0'),
            sa.Column('active_users_30d', sa.Integer(), server_default='0'),
            sa.Column('verified_users', sa.Integer(), server_default='0'),
            
            # Trading metrics
            sa.Column('total_trades', sa.Integer(), server_default='0'),
            sa.Column('total_profit_loss', sa.Numeric(15, 2), server_default='0'),
            sa.Column('total_capital_deployed', sa.Numeric(15, 2), server_default='0'),
            
            # Performance metrics
            sa.Column('platform_win_rate', sa.Numeric(5, 2), server_default='0'),
            sa.Column('platform_avg_return', sa.Numeric(5, 2), server_default='0'),
            sa.Column('top_10pct_avg_return', sa.Numeric(5, 2), server_default='0'),
            
            # Time-based
            sa.Column('mtd_aggregate_pnl', sa.Numeric(15, 2), server_default='0'),
            sa.Column('ytd_aggregate_pnl', sa.Numeric(15, 2), server_default='0'),
            
            # Signals
            sa.Column('total_signals_generated', sa.Integer(), server_default='0'),
            sa.Column('signals_followed', sa.Integer(), server_default='0'),
            sa.Column('signal_success_rate', sa.Numeric(5, 2), server_default='0'),
            
            # Metadata
            sa.Column('calculation_date', sa.DateTime(), server_default=sa.text('now()')),
            
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create initial platform_stats record
        op.execute("""
            INSERT INTO platform_stats (
                total_users, total_trades, total_profit_loss, 
                total_capital_deployed, calculation_date
            ) VALUES (0, 0, 0, 0, now())
        """)
        
        print("✅ Created platform_stats table with initial record")
    else:
        print("⏭️  platform_stats table already exists, skipping...")
    
    print("\n" + "=" * 50)
    print("✅ User performance migration completed!")
    print("=" * 50)


def downgrade():
    """Drop user_performance and platform_stats tables"""
    
    if table_exists('platform_stats'):
        op.drop_table('platform_stats')
        print("✅ Dropped platform_stats table")
    
    if table_exists('user_performance'):
        # Drop indexes first
        if index_exists('idx_user_performance_leaderboard', 'user_performance'):
            op.drop_index('idx_user_performance_leaderboard', table_name='user_performance')
        if index_exists('idx_user_performance_user_id', 'user_performance'):
            op.drop_index('idx_user_performance_user_id', table_name='user_performance')
        
        op.drop_table('user_performance')
        print("✅ Dropped user_performance table")
    
    print("⚠️ User performance tables removed")
