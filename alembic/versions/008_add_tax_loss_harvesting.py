"""Add tax-loss harvesting tables

Revision ID: 008
Revises: 007
Create Date: 2026-02-05

Tables: security_relationships, harvest_tax_lots, harvest_opportunities,
        wash_sale_transactions, harvesting_settings
Enums:  harveststatus, washsalestatus, securityrelationtype, taxlotstatus
Seed:   Common ETF relationships for wash sale detection
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create enum types
    # ------------------------------------------------------------------
    op.execute(
        "CREATE TYPE harveststatus AS ENUM ("
        "'identified','recommended','approved','executing',"
        "'executed','expired','rejected','wash_sale_risk')"
    )
    op.execute(
        "CREATE TYPE washsalestatus AS ENUM ("
        "'clear','in_window','violated','adjusted')"
    )
    op.execute(
        "CREATE TYPE securityrelationtype AS ENUM ("
        "'substantially_identical','same_sector_etf','correlated','replacement_candidate')"
    )
    op.execute(
        "CREATE TYPE taxlotstatus AS ENUM ("
        "'open','partially_closed','closed','wash_sale_adjusted')"
    )

    # ------------------------------------------------------------------
    # 2. security_relationships
    # ------------------------------------------------------------------
    op.create_table(
        "security_relationships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("symbol_a", sa.String(20), nullable=False),
        sa.Column("symbol_b", sa.String(20), nullable=False),
        sa.Column("cusip_a", sa.String(9), nullable=True),
        sa.Column("cusip_b", sa.String(9), nullable=True),
        sa.Column(
            "relation_type",
            sa.Enum(
                "substantially_identical",
                "same_sector_etf",
                "correlated",
                "replacement_candidate",
                name="securityrelationtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("confidence_score", sa.Numeric(5, 4), server_default="0.95"),
        sa.Column("correlation_coefficient", sa.Numeric(5, 4), nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("source", sa.String(50), server_default="system"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column(
            "expires_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "symbol_a",
            "symbol_b",
            "relation_type",
            name="uq_security_relationship",
        ),
    )
    op.create_index(
        "ix_security_relationships_symbol_a",
        "security_relationships",
        ["symbol_a"],
    )
    op.create_index(
        "ix_security_relationships_symbol_b",
        "security_relationships",
        ["symbol_b"],
    )

    # ------------------------------------------------------------------
    # 3. harvest_tax_lots
    # ------------------------------------------------------------------
    op.create_table(
        "harvest_tax_lots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "position_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aggregated_positions.id"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("custodian_accounts.id"),
            nullable=False,
        ),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("cusip", sa.String(9), nullable=True),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("remaining_quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("cost_basis_per_share", sa.Numeric(18, 6), nullable=False),
        sa.Column("total_cost_basis", sa.Numeric(18, 2), nullable=False),
        sa.Column("adjusted_cost_basis", sa.Numeric(18, 2), nullable=True),
        sa.Column("acquisition_date", sa.Date, nullable=False),
        sa.Column(
            "acquisition_transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aggregated_transactions.id"),
            nullable=True,
        ),
        sa.Column("is_long_term", sa.Boolean, server_default="false"),
        sa.Column("holding_days", sa.Integer, server_default="0"),
        sa.Column("long_term_date", sa.Date, nullable=True),
        sa.Column("current_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("current_value", sa.Numeric(18, 2), nullable=True),
        sa.Column("unrealized_gain_loss", sa.Numeric(18, 2), nullable=True),
        sa.Column(
            "unrealized_gain_loss_pct", sa.Numeric(10, 4), nullable=True
        ),
        sa.Column(
            "status",
            sa.Enum(
                "open",
                "partially_closed",
                "closed",
                "wash_sale_adjusted",
                name="taxlotstatus",
                create_type=False,
            ),
            server_default="open",
        ),
        sa.Column("wash_sale_adjustment", sa.Numeric(18, 2), nullable=True),
        sa.Column("wash_sale_disallowed", sa.Numeric(18, 2), nullable=True),
        sa.Column(
            "wash_sale_source_lot_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("external_lot_id", sa.String(100), nullable=True),
        sa.Column(
            "custodian_metadata",
            postgresql.JSONB,
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_harvest_tax_lots_position", "harvest_tax_lots", ["position_id"]
    )
    op.create_index(
        "ix_harvest_tax_lots_symbol", "harvest_tax_lots", ["symbol"]
    )
    op.create_index(
        "ix_harvest_tax_lots_acquisition_date",
        "harvest_tax_lots",
        ["acquisition_date"],
    )
    op.create_index(
        "ix_harvest_tax_lots_status", "harvest_tax_lots", ["status"]
    )

    # ------------------------------------------------------------------
    # 4. harvest_opportunities
    # ------------------------------------------------------------------
    op.create_table(
        "harvest_opportunities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=True,
        ),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("households.id"),
            nullable=True,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("custodian_accounts.id"),
            nullable=False,
        ),
        sa.Column(
            "position_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aggregated_positions.id"),
            nullable=False,
        ),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("cusip", sa.String(9), nullable=True),
        sa.Column("security_name", sa.String(255), nullable=False),
        sa.Column("quantity_to_harvest", sa.Numeric(18, 6), nullable=False),
        sa.Column("current_price", sa.Numeric(18, 6), nullable=False),
        sa.Column("cost_basis", sa.Numeric(18, 2), nullable=False),
        sa.Column("market_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("unrealized_loss", sa.Numeric(18, 2), nullable=False),
        sa.Column(
            "estimated_tax_savings", sa.Numeric(18, 2), nullable=False
        ),
        sa.Column(
            "tax_rate_used", sa.Numeric(5, 4), server_default="0.35"
        ),
        sa.Column("short_term_loss", sa.Numeric(18, 2), server_default="0"),
        sa.Column("long_term_loss", sa.Numeric(18, 2), server_default="0"),
        sa.Column(
            "tax_lot_ids",
            postgresql.ARRAY(sa.String),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "identified",
                "recommended",
                "approved",
                "executing",
                "executed",
                "expired",
                "rejected",
                "wash_sale_risk",
                name="harveststatus",
                create_type=False,
            ),
            server_default="identified",
        ),
        sa.Column(
            "wash_sale_status",
            sa.Enum(
                "clear",
                "in_window",
                "violated",
                "adjusted",
                name="washsalestatus",
                create_type=False,
            ),
            server_default="clear",
        ),
        sa.Column(
            "wash_sale_risk_amount", sa.Numeric(18, 2), nullable=True
        ),
        sa.Column(
            "wash_sale_blocking_transactions",
            postgresql.JSONB,
            nullable=True,
        ),
        sa.Column("wash_sale_window_start", sa.Date, nullable=True),
        sa.Column("wash_sale_window_end", sa.Date, nullable=True),
        sa.Column(
            "replacement_recommendations", postgresql.JSONB, nullable=True
        ),
        sa.Column("replacement_symbol", sa.String(20), nullable=True),
        sa.Column("replacement_cusip", sa.String(9), nullable=True),
        sa.Column(
            "identified_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "recommended_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "approved_by", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "sell_transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aggregated_transactions.id"),
            nullable=True,
        ),
        sa.Column(
            "buy_transaction_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "actual_loss_realized", sa.Numeric(18, 2), nullable=True
        ),
        sa.Column("advisor_notes", sa.Text, nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("ai_analysis", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_harvest_opportunities_advisor",
        "harvest_opportunities",
        ["advisor_id"],
    )
    op.create_index(
        "ix_harvest_opportunities_client",
        "harvest_opportunities",
        ["client_id"],
    )
    op.create_index(
        "ix_harvest_opportunities_status",
        "harvest_opportunities",
        ["status"],
    )
    op.create_index(
        "ix_harvest_opportunities_symbol",
        "harvest_opportunities",
        ["symbol"],
    )
    op.create_index(
        "ix_harvest_opportunities_identified_at",
        "harvest_opportunities",
        ["identified_at"],
    )

    # ------------------------------------------------------------------
    # 5. wash_sale_transactions
    # ------------------------------------------------------------------
    op.create_table(
        "wash_sale_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "harvest_opportunity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("harvest_opportunities.id"),
            nullable=True,
        ),
        sa.Column(
            "sell_transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aggregated_transactions.id"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("custodian_accounts.id"),
            nullable=False,
        ),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("cusip", sa.String(9), nullable=True),
        sa.Column("sale_date", sa.Date, nullable=False),
        sa.Column("quantity_sold", sa.Numeric(18, 6), nullable=False),
        sa.Column("loss_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("window_start", sa.Date, nullable=False),
        sa.Column("window_end", sa.Date, nullable=False),
        sa.Column(
            "watch_symbols",
            postgresql.ARRAY(sa.String),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "watch_cusips",
            postgresql.ARRAY(sa.String),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "clear",
                "in_window",
                "violated",
                "adjusted",
                name="washsalestatus",
                create_type=False,
            ),
            server_default="in_window",
        ),
        sa.Column(
            "violating_transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("aggregated_transactions.id"),
            nullable=True,
        ),
        sa.Column("violation_date", sa.Date, nullable=True),
        sa.Column("disallowed_loss", sa.Numeric(18, 2), nullable=True),
        sa.Column(
            "adjustment_applied", sa.Boolean, server_default="false"
        ),
        sa.Column(
            "adjusted_lot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("harvest_tax_lots.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_wash_sale_transactions_symbol",
        "wash_sale_transactions",
        ["symbol"],
    )
    op.create_index(
        "ix_wash_sale_transactions_window",
        "wash_sale_transactions",
        ["window_start", "window_end"],
    )
    op.create_index(
        "ix_wash_sale_transactions_account",
        "wash_sale_transactions",
        ["account_id"],
    )

    # ------------------------------------------------------------------
    # 6. harvesting_settings
    # ------------------------------------------------------------------
    op.create_table(
        "harvesting_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("advisors.id"),
            nullable=False,
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=True,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("custodian_accounts.id"),
            nullable=True,
        ),
        sa.Column(
            "min_loss_amount", sa.Numeric(18, 2), server_default="100"
        ),
        sa.Column(
            "min_loss_percentage", sa.Numeric(5, 4), server_default="0.05"
        ),
        sa.Column(
            "min_tax_savings", sa.Numeric(18, 2), server_default="50"
        ),
        sa.Column(
            "short_term_tax_rate", sa.Numeric(5, 4), server_default="0.37"
        ),
        sa.Column(
            "long_term_tax_rate", sa.Numeric(5, 4), server_default="0.20"
        ),
        sa.Column("auto_identify", sa.Boolean, server_default="true"),
        sa.Column("auto_recommend", sa.Boolean, server_default="false"),
        sa.Column("require_approval", sa.Boolean, server_default="true"),
        sa.Column(
            "excluded_symbols",
            postgresql.ARRAY(sa.String),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "excluded_account_types",
            postgresql.ARRAY(sa.String),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "prefer_etf_replacements", sa.Boolean, server_default="true"
        ),
        sa.Column(
            "min_replacement_correlation",
            sa.Numeric(5, 4),
            server_default="0.90",
        ),
        sa.Column(
            "notify_on_opportunity", sa.Boolean, server_default="true"
        ),
        sa.Column(
            "notify_on_wash_sale_risk", sa.Boolean, server_default="true"
        ),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "advisor_id",
            "client_id",
            "account_id",
            name="uq_harvesting_settings",
        ),
    )

    # ------------------------------------------------------------------
    # 7. Seed common security relationships
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO security_relationships
            (id, symbol_a, symbol_b, relation_type, confidence_score, reason, source, created_at, updated_at)
        VALUES
        -- S&P 500 ETFs (substantially identical)
        (gen_random_uuid(), 'SPY', 'IVV', 'substantially_identical', 0.9900, 'Both track S&P 500', 'system', now(), now()),
        (gen_random_uuid(), 'SPY', 'VOO', 'substantially_identical', 0.9900, 'Both track S&P 500', 'system', now(), now()),
        (gen_random_uuid(), 'IVV', 'VOO', 'substantially_identical', 0.9900, 'Both track S&P 500', 'system', now(), now()),
        -- Total Market ETFs
        (gen_random_uuid(), 'VTI', 'ITOT', 'substantially_identical', 0.9800, 'Both track total US market', 'system', now(), now()),
        (gen_random_uuid(), 'VTI', 'SPTM', 'substantially_identical', 0.9800, 'Both track total US market', 'system', now(), now()),
        -- International ETFs
        (gen_random_uuid(), 'VXUS', 'IXUS', 'substantially_identical', 0.9700, 'Both track ex-US markets', 'system', now(), now()),
        -- Bond ETFs
        (gen_random_uuid(), 'BND', 'AGG', 'substantially_identical', 0.9800, 'Both track US aggregate bond', 'system', now(), now()),
        -- Replacement candidates (same sector, different enough)
        (gen_random_uuid(), 'SPY', 'VTI', 'replacement_candidate', 0.9500, 'High correlation, different index', 'system', now(), now()),
        (gen_random_uuid(), 'QQQ', 'VGT', 'replacement_candidate', 0.9200, 'Tech exposure, different composition', 'system', now(), now())
    """)


def downgrade() -> None:
    op.drop_table("harvesting_settings")
    op.drop_table("wash_sale_transactions")
    op.drop_table("harvest_opportunities")
    op.drop_table("harvest_tax_lots")
    op.drop_table("security_relationships")

    op.execute("DROP TYPE IF EXISTS taxlotstatus")
    op.execute("DROP TYPE IF EXISTS securityrelationtype")
    op.execute("DROP TYPE IF EXISTS washsalestatus")
    op.execute("DROP TYPE IF EXISTS harveststatus")
