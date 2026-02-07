"""Merge heads + convert monetary Float columns to Numeric(14,4)

Merges three migration heads:
  - add_beta_codes
  - add_performance_indexes
  - add_timezone_to_users

Then converts 40 monetary Float columns to Numeric(14,4) across 11 tables.
Only monetary columns (prices, balances, P/L, costs) are converted.
Non-monetary Floats (Greeks, percentages, IV, ratios) are left as Float.

Revision ID: float_to_numeric_001
Revises: add_beta_codes, add_performance_indexes, add_timezone_to_users
Create Date: 2026-02-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = 'float_to_numeric_001'
down_revision = ('add_beta_codes', 'add_performance_indexes', 'add_timezone_to_users')
branch_labels = None
depends_on = None


def _table_exists(inspector, name):
    return name in inspector.get_table_names()


def _col_exists(inspector, table, col):
    return col in [c['name'] for c in inspector.get_columns(table)]


MONETARY_COLUMNS = [
    # users
    ('users', 'paper_balance'),

    # positions
    ('positions', 'entry_price'),
    ('positions', 'current_price'),
    ('positions', 'strike_price'),
    ('positions', 'unrealized_pnl'),
    ('positions', 'realized_pnl'),
    ('positions', 'exit_price'),

    # trades
    ('trades', 'price'),
    ('trades', 'strike_price'),
    ('trades', 'realized_pnl'),
    ('trades', 'commission'),

    # spreads
    ('spreads', 'long_strike'),
    ('spreads', 'long_premium'),
    ('spreads', 'short_strike'),
    ('spreads', 'short_premium'),
    ('spreads', 'net_debit'),
    ('spreads', 'max_profit'),
    ('spreads', 'max_loss'),
    ('spreads', 'breakeven'),
    ('spreads', 'strike_width'),
    ('spreads', 'current_value'),
    ('spreads', 'unrealized_pnl'),
    ('spreads', 'realized_pnl'),

    # alerts
    ('alerts', 'strike_price'),

    # automations
    ('automations', 'max_premium'),

    # earnings_calendar
    ('earnings_calendar', 'estimated_eps'),
    ('earnings_calendar', 'actual_eps'),
    ('earnings_calendar', 'estimated_revenue'),
    ('earnings_calendar', 'actual_revenue'),

    # iv_history
    ('iv_history', 'stock_price'),

    # stocks
    ('stocks', 'current_price'),

    # strategy_legs
    ('strategy_legs', 'strike_price'),
    ('strategy_legs', 'entry_price'),

    # risk_limits
    ('risk_limits', 'max_position_size_dollars'),
    ('risk_limits', 'max_daily_loss_dollars'),
]


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name
    inspector = inspect(conn)

    for table, col in MONETARY_COLUMNS:
        if not _table_exists(inspector, table):
            continue
        if not _col_exists(inspector, table, col):
            continue

        if dialect == 'postgresql':
            op.execute(
                f'ALTER TABLE {table} '
                f'ALTER COLUMN {col} TYPE NUMERIC(14,4) '
                f'USING {col}::NUMERIC(14,4)'
            )
        else:
            with op.batch_alter_table(table) as batch_op:
                batch_op.alter_column(col, type_=sa.Numeric(14, 4), existing_type=sa.Float())


def downgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name
    inspector = inspect(conn)

    for table, col in MONETARY_COLUMNS:
        if not _table_exists(inspector, table):
            continue
        if not _col_exists(inspector, table, col):
            continue

        if dialect == 'postgresql':
            op.execute(
                f'ALTER TABLE {table} '
                f'ALTER COLUMN {col} TYPE DOUBLE PRECISION '
                f'USING {col}::DOUBLE PRECISION'
            )
        else:
            with op.batch_alter_table(table) as batch_op:
                batch_op.alter_column(col, type_=sa.Float(), existing_type=sa.Numeric(14, 4))
