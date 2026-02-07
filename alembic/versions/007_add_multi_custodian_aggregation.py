"""Add multi-custodian aggregation tables

Revision ID: 007
Revises: 006
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    custodiantype_enum = postgresql.ENUM(
        'schwab', 'fidelity', 'pershing', 'td_ameritrade',
        'interactive_brokers', 'apex', 'altruist', 'manual',
        name='custodiantype', create_type=False
    )
    custodiantype_enum.create(op.get_bind(), checkfirst=True)

    connectionstatus_enum = postgresql.ENUM(
        'pending', 'connected', 'expired', 'revoked', 'error',
        name='connectionstatus', create_type=False
    )
    connectionstatus_enum.create(op.get_bind(), checkfirst=True)

    syncstatus_enum = postgresql.ENUM(
        'idle', 'syncing', 'success', 'partial', 'failed',
        name='syncstatus', create_type=False
    )
    syncstatus_enum.create(op.get_bind(), checkfirst=True)

    custodianassetclass_enum = postgresql.ENUM(
        'equity', 'fixed_income', 'cash', 'alternatives', 'real_estate',
        'commodities', 'crypto', 'options', 'futures', 'mutual_fund', 'etf', 'other',
        name='custodianassetclass', create_type=False
    )
    custodianassetclass_enum.create(op.get_bind(), checkfirst=True)

    custodiantransactiontype_enum = postgresql.ENUM(
        'buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal',
        'transfer_in', 'transfer_out', 'fee', 'tax', 'split', 'merger',
        'spinoff', 'exercise', 'assignment', 'expiration', 'other',
        name='custodiantransactiontype', create_type=False
    )
    custodiantransactiontype_enum.create(op.get_bind(), checkfirst=True)

    custodianaccounttype_enum = postgresql.ENUM(
        'individual', 'joint', 'ira_traditional', 'ira_roth', 'ira_sep',
        'ira_simple', 'ira_inherited', 'rollover', 'trust', 'custodial',
        'corporate', 'partnership', 'pension', 'profit_sharing', 'annuity',
        'education_529', 'education_esa', 'hsa', 'other',
        name='custodianaccounttype', create_type=False
    )
    custodianaccounttype_enum.create(op.get_bind(), checkfirst=True)

    # ----------------------------------------------------------------
    # custodians
    # ----------------------------------------------------------------
    op.create_table(
        'custodians',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('custodian_type', sa.Enum(
            'schwab', 'fidelity', 'pershing', 'td_ameritrade',
            'interactive_brokers', 'apex', 'altruist', 'manual',
            name='custodiantype'), nullable=False, unique=True),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('api_base_url', sa.String(500), nullable=True),
        sa.Column('oauth_authorization_url', sa.String(500), nullable=True),
        sa.Column('oauth_token_url', sa.String(500), nullable=True),
        sa.Column('oauth_scopes', postgresql.JSONB(), nullable=True),
        sa.Column('supports_oauth', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('supports_realtime', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('supports_transactions', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('supports_cost_basis', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('rate_limit_requests', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('rate_limit_window_seconds', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('maintenance_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )

    # ----------------------------------------------------------------
    # custodian_connections
    # ----------------------------------------------------------------
    op.create_table(
        'custodian_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('advisor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('custodian_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('external_rep_id', sa.String(100), nullable=True),
        sa.Column('external_firm_id', sa.String(100), nullable=True),
        sa.Column('access_token_encrypted', sa.Text(), nullable=True),
        sa.Column('refresh_token_encrypted', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('token_scope', sa.String(500), nullable=True),
        sa.Column('api_key_encrypted', sa.Text(), nullable=True),
        sa.Column('api_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum(
            'pending', 'connected', 'expired', 'revoked', 'error',
            name='connectionstatus'), nullable=False, server_default='pending'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('last_error_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_status', sa.Enum(
            'idle', 'syncing', 'success', 'partial', 'failed',
            name='syncstatus'), nullable=True),
        sa.Column('sync_frequency_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['advisor_id'], ['advisors.id']),
        sa.ForeignKeyConstraint(['custodian_id'], ['custodians.id']),
        sa.UniqueConstraint('advisor_id', 'custodian_id', 'external_rep_id', name='uq_advisor_custodian_rep'),
    )
    op.create_index('ix_custodian_connections_status', 'custodian_connections', ['status'])

    # ----------------------------------------------------------------
    # custodian_accounts
    # ----------------------------------------------------------------
    op.create_table(
        'custodian_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('household_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('external_account_id', sa.String(100), nullable=False),
        sa.Column('external_account_number', sa.String(50), nullable=True),
        sa.Column('account_name', sa.String(255), nullable=False),
        sa.Column('account_type', sa.Enum(
            'individual', 'joint', 'ira_traditional', 'ira_roth', 'ira_sep',
            'ira_simple', 'ira_inherited', 'rollover', 'trust', 'custodial',
            'corporate', 'partnership', 'pension', 'profit_sharing', 'annuity',
            'education_529', 'education_esa', 'hsa', 'other',
            name='custodianaccounttype'), server_default='individual'),
        sa.Column('tax_status', sa.String(50), nullable=False, server_default='taxable'),
        sa.Column('primary_owner_name', sa.String(255), nullable=True),
        sa.Column('primary_owner_ssn_last4', sa.String(4), nullable=True),
        sa.Column('joint_owner_name', sa.String(255), nullable=True),
        sa.Column('market_value', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('cash_balance', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('buying_power', sa.Numeric(18, 2), nullable=True),
        sa.Column('margin_balance', sa.Numeric(18, 2), nullable=True),
        sa.Column('account_opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_managed', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('custodian_metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['connection_id'], ['custodian_connections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.ForeignKeyConstraint(['household_id'], ['households.id']),
        sa.UniqueConstraint('connection_id', 'external_account_id', name='uq_connection_account'),
    )
    op.create_index('ix_custodian_accounts_client', 'custodian_accounts', ['client_id'])
    op.create_index('ix_custodian_accounts_household', 'custodian_accounts', ['household_id'])

    # ----------------------------------------------------------------
    # aggregated_positions
    # ----------------------------------------------------------------
    op.create_table(
        'aggregated_positions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('cusip', sa.String(9), nullable=True),
        sa.Column('isin', sa.String(12), nullable=True),
        sa.Column('sedol', sa.String(7), nullable=True),
        sa.Column('security_name', sa.String(255), nullable=False),
        sa.Column('security_type', sa.String(50), nullable=True),
        sa.Column('asset_class', sa.Enum(
            'equity', 'fixed_income', 'cash', 'alternatives', 'real_estate',
            'commodities', 'crypto', 'options', 'futures', 'mutual_fund', 'etf', 'other',
            name='custodianassetclass'), server_default='other'),
        sa.Column('position_type', sa.String(20), nullable=False, server_default='long'),
        sa.Column('quantity', sa.Numeric(18, 6), nullable=False),
        sa.Column('price', sa.Numeric(18, 6), nullable=False, server_default='0'),
        sa.Column('price_as_of', sa.DateTime(timezone=True), nullable=True),
        sa.Column('market_value', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('cost_basis', sa.Numeric(18, 2), nullable=True),
        sa.Column('cost_basis_per_share', sa.Numeric(18, 6), nullable=True),
        sa.Column('unrealized_gain_loss', sa.Numeric(18, 2), nullable=True),
        sa.Column('unrealized_gain_loss_pct', sa.Numeric(10, 4), nullable=True),
        sa.Column('short_term_quantity', sa.Numeric(18, 6), nullable=True),
        sa.Column('long_term_quantity', sa.Numeric(18, 6), nullable=True),
        sa.Column('short_term_gain_loss', sa.Numeric(18, 2), nullable=True),
        sa.Column('long_term_gain_loss', sa.Numeric(18, 2), nullable=True),
        sa.Column('yield_pct', sa.Numeric(10, 4), nullable=True),
        sa.Column('annual_income', sa.Numeric(18, 2), nullable=True),
        sa.Column('external_position_id', sa.String(100), nullable=True),
        sa.Column('custodian_metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['custodian_accounts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('account_id', 'symbol', 'position_type', name='uq_account_position'),
    )
    op.create_index('ix_aggregated_positions_symbol', 'aggregated_positions', ['symbol'])
    op.create_index('ix_aggregated_positions_cusip', 'aggregated_positions', ['cusip'])
    op.create_index('ix_aggregated_positions_asset_class', 'aggregated_positions', ['asset_class'])

    # ----------------------------------------------------------------
    # aggregated_transactions
    # ----------------------------------------------------------------
    op.create_table(
        'aggregated_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('external_transaction_id', sa.String(100), nullable=False),
        sa.Column('transaction_type', sa.Enum(
            'buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal',
            'transfer_in', 'transfer_out', 'fee', 'tax', 'split', 'merger',
            'spinoff', 'exercise', 'assignment', 'expiration', 'other',
            name='custodiantransactiontype'), nullable=False),
        sa.Column('transaction_subtype', sa.String(50), nullable=True),
        sa.Column('symbol', sa.String(20), nullable=True),
        sa.Column('cusip', sa.String(9), nullable=True),
        sa.Column('security_name', sa.String(255), nullable=True),
        sa.Column('quantity', sa.Numeric(18, 6), nullable=True),
        sa.Column('price', sa.Numeric(18, 6), nullable=True),
        sa.Column('gross_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('net_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('commission', sa.Numeric(18, 2), server_default='0'),
        sa.Column('fees', sa.Numeric(18, 2), server_default='0'),
        sa.Column('trade_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('settlement_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cost_basis', sa.Numeric(18, 2), nullable=True),
        sa.Column('realized_gain_loss', sa.Numeric(18, 2), nullable=True),
        sa.Column('gain_loss_type', sa.String(20), nullable=True),
        sa.Column('wash_sale_disallowed', sa.Numeric(18, 2), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('is_pending', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('custodian_metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['custodian_accounts.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_aggregated_transactions_account', 'aggregated_transactions', ['account_id'])
    op.create_index('ix_aggregated_transactions_date', 'aggregated_transactions', ['trade_date'])
    op.create_index('ix_aggregated_transactions_symbol', 'aggregated_transactions', ['symbol'])
    op.create_index('ix_aggregated_transactions_type', 'aggregated_transactions', ['transaction_type'])

    # ----------------------------------------------------------------
    # custodian_sync_logs
    # ----------------------------------------------------------------
    op.create_table(
        'custodian_sync_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sync_type', sa.String(50), nullable=False),
        sa.Column('status', sa.Enum(
            'idle', 'syncing', 'success', 'partial', 'failed',
            name='syncstatus', create_type=False), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('accounts_synced', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('positions_synced', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('transactions_synced', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_details', postgresql.JSONB(), nullable=True),
        sa.Column('api_calls_made', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rate_limit_hits', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['connection_id'], ['custodian_connections.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_custodian_sync_logs_connection', 'custodian_sync_logs', ['connection_id'])
    op.create_index('ix_custodian_sync_logs_started_at', 'custodian_sync_logs', ['started_at'])

    # ----------------------------------------------------------------
    # Seed custodian data
    # ----------------------------------------------------------------
    op.execute("""
        INSERT INTO custodians (id, custodian_type, display_name, supports_oauth, supports_realtime, is_active, created_at, updated_at)
        VALUES
        (gen_random_uuid(), 'schwab', 'Charles Schwab', true, true, true, now(), now()),
        (gen_random_uuid(), 'fidelity', 'Fidelity Investments', true, true, true, now(), now()),
        (gen_random_uuid(), 'pershing', 'BNY Pershing', false, false, true, now(), now()),
        (gen_random_uuid(), 'td_ameritrade', 'TD Ameritrade (Legacy)', true, false, false, now(), now()),
        (gen_random_uuid(), 'interactive_brokers', 'Interactive Brokers', true, true, true, now(), now()),
        (gen_random_uuid(), 'apex', 'Apex Clearing', false, false, true, now(), now()),
        (gen_random_uuid(), 'altruist', 'Altruist', true, true, true, now(), now()),
        (gen_random_uuid(), 'manual', 'Manual Entry', false, false, true, now(), now())
    """)


def downgrade() -> None:
    op.drop_table('custodian_sync_logs')
    op.drop_table('aggregated_transactions')
    op.drop_table('aggregated_positions')
    op.drop_table('custodian_accounts')
    op.drop_table('custodian_connections')
    op.drop_table('custodians')

    op.execute('DROP TYPE IF EXISTS custodianaccounttype')
    op.execute('DROP TYPE IF EXISTS custodiantransactiontype')
    op.execute('DROP TYPE IF EXISTS custodianassetclass')
    op.execute('DROP TYPE IF EXISTS syncstatus')
    op.execute('DROP TYPE IF EXISTS connectionstatus')
    op.execute('DROP TYPE IF EXISTS custodiantype')
