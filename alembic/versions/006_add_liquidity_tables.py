"""Add liquidity management tables

Revision ID: 006
Revises: 005
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    withdrawal_priority_enum = postgresql.ENUM(
        'low', 'normal', 'high', 'urgent',
        name='withdrawalpriority',
        create_type=False
    )
    withdrawal_priority_enum.create(op.get_bind(), checkfirst=True)

    lot_selection_method_enum = postgresql.ENUM(
        'fifo', 'lifo', 'hifo', 'lofo', 'spec_id', 'tax_opt',
        name='lotselectionmethod',
        create_type=False
    )
    lot_selection_method_enum.create(op.get_bind(), checkfirst=True)

    withdrawal_status_enum = postgresql.ENUM(
        'draft', 'pending_review', 'approved', 'executing', 'completed', 'cancelled', 'failed',
        name='withdrawalstatus',
        create_type=False
    )
    withdrawal_status_enum.create(op.get_bind(), checkfirst=True)

    cash_flow_type_enum = postgresql.ENUM(
        'income', 'expense', 'transfer', 'withdrawal', 'deposit', 'dividend', 'interest', 'tax',
        name='cashflowtype',
        create_type=False
    )
    cash_flow_type_enum.create(op.get_bind(), checkfirst=True)

    # Create liquidity_profiles table
    op.create_table(
        'liquidity_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('federal_tax_bracket', sa.Numeric(5, 4), nullable=True),
        sa.Column('state_tax_rate', sa.Numeric(5, 4), nullable=True),
        sa.Column('capital_gains_rate_short', sa.Numeric(5, 4), nullable=False, server_default='0.24'),
        sa.Column('capital_gains_rate_long', sa.Numeric(5, 4), nullable=False, server_default='0.15'),
        sa.Column('ytd_short_term_gains', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('ytd_long_term_gains', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('ytd_short_term_losses', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('ytd_long_term_losses', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('loss_carryforward', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('min_cash_reserve', sa.Numeric(15, 2), nullable=False, server_default='10000'),
        sa.Column('max_single_position_liquidation_pct', sa.Numeric(5, 4), nullable=False, server_default='0.25'),
        sa.Column('default_priority', sa.Enum('low', 'normal', 'high', 'urgent', name='withdrawalpriority'), nullable=False, server_default='normal'),
        sa.Column('default_lot_selection', sa.Enum('fifo', 'lifo', 'hifo', 'lofo', 'spec_id', 'tax_opt', name='lotselectionmethod'), nullable=False, server_default='tax_opt'),
        sa.Column('avoid_wash_sales', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('client_id')
    )
    op.create_index('ix_liquidity_profiles_client_id', 'liquidity_profiles', ['client_id'])

    # Create tax_lots table
    op.create_table(
        'tax_lots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('position_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('broker_lot_id', sa.String(100), nullable=True),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('shares', sa.Numeric(15, 6), nullable=False),
        sa.Column('cost_basis_per_share', sa.Numeric(15, 6), nullable=False),
        sa.Column('total_cost_basis', sa.Numeric(15, 2), nullable=False),
        sa.Column('acquisition_date', sa.Date(), nullable=True),
        sa.Column('acquisition_method', sa.String(50), nullable=False, server_default='purchase'),
        sa.Column('current_price', sa.Numeric(15, 6), nullable=True),
        sa.Column('current_value', sa.Numeric(15, 2), nullable=True),
        sa.Column('unrealized_gain_loss', sa.Numeric(15, 2), nullable=True),
        sa.Column('days_held', sa.Integer(), nullable=True),
        sa.Column('is_short_term', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_wash_sale_affected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('wash_sale_disallowed_amount', sa.Numeric(15, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['position_id'], ['positions.id'], ondelete='SET NULL')
    )
    op.create_index('ix_tax_lots_account_id', 'tax_lots', ['account_id'])
    op.create_index('ix_tax_lots_symbol', 'tax_lots', ['symbol'])
    op.create_index('ix_tax_lots_position_id', 'tax_lots', ['position_id'])

    # Create withdrawal_requests table
    op.create_table(
        'withdrawal_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('liquidity_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('requested_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('requested_date', sa.DateTime(), nullable=False),
        sa.Column('purpose', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('priority', sa.Enum('low', 'normal', 'high', 'urgent', name='withdrawalpriority'), nullable=False, server_default='normal'),
        sa.Column('lot_selection', sa.Enum('fifo', 'lifo', 'hifo', 'lofo', 'spec_id', 'tax_opt', name='lotselectionmethod'), nullable=False, server_default='tax_opt'),
        sa.Column('status', sa.Enum('draft', 'pending_review', 'approved', 'executing', 'completed', 'cancelled', 'failed', name='withdrawalstatus'), nullable=False, server_default='draft'),
        sa.Column('optimized_plan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('requested_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['liquidity_profile_id'], ['liquidity_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id']),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'])
    )
    op.create_index('ix_withdrawal_requests_liquidity_profile_id', 'withdrawal_requests', ['liquidity_profile_id'])
    op.create_index('ix_withdrawal_requests_client_id', 'withdrawal_requests', ['client_id'])

    # Create withdrawal_plans table
    op.create_table(
        'withdrawal_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_name', sa.String(100), nullable=False),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('is_recommended', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('ai_generated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('ai_reasoning', sa.Text(), nullable=True),
        sa.Column('ai_alternatives_considered', postgresql.JSONB(), nullable=True),
        sa.Column('estimated_tax_cost', sa.Numeric(15, 2), nullable=True),
        sa.Column('estimated_short_term_gains', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('estimated_long_term_gains', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('estimated_short_term_losses', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('estimated_long_term_losses', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['request_id'], ['withdrawal_requests.id'], ondelete='CASCADE')
    )
    op.create_index('ix_withdrawal_plans_request_id', 'withdrawal_plans', ['request_id'])

    # Create withdrawal_line_items table
    op.create_table(
        'withdrawal_line_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('position_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tax_lot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('shares_to_sell', sa.Numeric(15, 6), nullable=False),
        sa.Column('estimated_proceeds', sa.Numeric(15, 2), nullable=False),
        sa.Column('cost_basis', sa.Numeric(15, 2), nullable=True),
        sa.Column('estimated_gain_loss', sa.Numeric(15, 2), nullable=True),
        sa.Column('is_short_term', sa.Boolean(), nullable=True),
        sa.Column('sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('actual_proceeds', sa.Numeric(15, 2), nullable=True),
        sa.Column('actual_gain_loss', sa.Numeric(15, 2), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['plan_id'], ['withdrawal_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id']),
        sa.ForeignKeyConstraint(['position_id'], ['positions.id']),
        sa.ForeignKeyConstraint(['tax_lot_id'], ['tax_lots.id'])
    )
    op.create_index('ix_withdrawal_line_items_plan_id', 'withdrawal_line_items', ['plan_id'])

    # Create cash_flows table
    op.create_table(
        'cash_flows',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('liquidity_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('flow_type', sa.Enum('income', 'expense', 'transfer', 'withdrawal', 'deposit', 'dividend', 'interest', 'tax', name='cashflowtype'), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('expected_date', sa.Date(), nullable=False),
        sa.Column('actual_date', sa.Date(), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('recurrence_pattern', sa.String(50), nullable=True),
        sa.Column('is_projected', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_confirmed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['liquidity_profile_id'], ['liquidity_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'])
    )
    op.create_index('ix_cash_flows_liquidity_profile_id', 'cash_flows', ['liquidity_profile_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('cash_flows')
    op.drop_table('withdrawal_line_items')
    op.drop_table('withdrawal_plans')
    op.drop_table('withdrawal_requests')
    op.drop_table('tax_lots')
    op.drop_table('liquidity_profiles')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS cashflowtype')
    op.execute('DROP TYPE IF EXISTS withdrawalstatus')
    op.execute('DROP TYPE IF EXISTS lotselectionmethod')
    op.execute('DROP TYPE IF EXISTS withdrawalpriority')
