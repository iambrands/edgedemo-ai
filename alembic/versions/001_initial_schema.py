"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-02-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "firms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firm_name", sa.String(255), nullable=False),
        sa.Column("crd_number", sa.String(20), nullable=True),
        sa.Column("sec_registration", sa.String(50), nullable=True),
        sa.Column("aum", sa.Integer(), nullable=True),
        sa.Column("advisor_count", sa.Integer(), nullable=True),
        sa.Column("plan", sa.String(20), nullable=True),
        sa.Column("max_households", sa.Integer(), nullable=True),
        sa.Column("max_advisors", sa.Integer(), nullable=True),
        sa.Column("branding", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("custom_domain", sa.String(255), nullable=True),
        sa.Column("concentration_thresholds", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("approved_products", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "advisors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("crd_number", sa.String(20), nullable=True),
        sa.Column("licenses", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["firm_id"], ["firms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_advisors_firm_id", "advisors", ["firm_id"])

    op.create_table(
        "households",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("primary_contact_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("risk_tolerance", sa.String(50), nullable=True),
        sa.Column("tax_filing_status", sa.String(50), nullable=True),
        sa.Column("combined_aum", sa.Numeric(15, 2), nullable=True),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("advisor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["advisor_id"], ["advisors.id"]),
        sa.ForeignKeyConstraint(["firm_id"], ["firms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_households_firm_id", "households", ["firm_id"])
    op.create_index("ix_households_name", "households", ["name"])

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("ssn_encrypted", sa.String(512), nullable=True),
        sa.Column("risk_tolerance", sa.String(50), nullable=True),
        sa.Column("investment_objective", sa.String(50), nullable=True),
        sa.Column("investment_timeline", sa.String(50), nullable=True),
        sa.Column("annual_income_range", sa.String(50), nullable=True),
        sa.Column("net_worth_range", sa.String(50), nullable=True),
        sa.Column("liquid_net_worth", sa.String(50), nullable=True),
        sa.Column("annual_expenses", sa.String(50), nullable=True),
        sa.Column("investment_experience", sa.String(50), nullable=True),
        sa.Column("tax_filing_status", sa.String(50), nullable=True),
        sa.Column("tax_bracket", sa.String(20), nullable=True),
        sa.Column("state_of_residence", sa.String(2), nullable=True),
        sa.Column("password_hash", sa.String(256), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("advisor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("firm_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["advisor_id"], ["advisors.id"]),
        sa.ForeignKeyConstraint(["firm_id"], ["firms.id"]),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_clients_email", "clients", ["email"])
    op.create_index("ix_clients_household_id", "clients", ["household_id"])

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("account_number_masked", sa.String(20), nullable=True),
        sa.Column("account_number_hash", sa.String(256), nullable=True),
        sa.Column("custodian", sa.String(100), nullable=False),
        sa.Column("clearing_firm", sa.String(100), nullable=True),
        sa.Column("account_type", sa.String(50), nullable=False),
        sa.Column("tax_type", sa.String(20), nullable=False),
        sa.Column("investment_objective", sa.String(50), nullable=True),
        sa.Column("risk_tolerance", sa.String(50), nullable=True),
        sa.Column("margin_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_statement_date", sa.Date(), nullable=True),
        sa.Column("last_statement_value", sa.Numeric(15, 2), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accounts_custodian", "accounts", ["custodian"])
    op.create_index("ix_accounts_household_id", "accounts", ["household_id"])

    op.create_table(
        "positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("cost_basis_date", sa.Date(), nullable=True),
        sa.Column("ticker", sa.String(20), nullable=True),
        sa.Column("cusip", sa.String(9), nullable=True),
        sa.Column("security_name", sa.String(255), nullable=False),
        sa.Column("security_type", sa.String(30), nullable=False),
        sa.Column("quantity", sa.Numeric(15, 6), nullable=False),
        sa.Column("quantity_loaned", sa.Numeric(15, 6), nullable=False, server_default="0"),
        sa.Column("cost_basis", sa.Numeric(15, 2), nullable=True),
        sa.Column("unit_cost", sa.Numeric(15, 6), nullable=True),
        sa.Column("market_price", sa.Numeric(15, 6), nullable=False),
        sa.Column("market_value", sa.Numeric(15, 2), nullable=False),
        sa.Column("unrealized_gain_loss", sa.Numeric(15, 2), nullable=True),
        sa.Column("unrealized_gl_type", sa.String(20), nullable=True),
        sa.Column("asset_class", sa.String(50), nullable=True),
        sa.Column("sector", sa.String(50), nullable=True),
        sa.Column("sub_asset_class", sa.String(50), nullable=True),
        sa.Column("sub_adviser", sa.String(100), nullable=True),
        sa.Column("dividend_yield", sa.Numeric(6, 4), nullable=True),
        sa.Column("estimated_annual_income", sa.Numeric(12, 2), nullable=True),
        sa.Column("share_class", sa.String(10), nullable=True),
        sa.Column("expense_ratio", sa.Numeric(8, 6), nullable=True),
        sa.Column("front_load", sa.Numeric(8, 6), nullable=True),
        sa.Column("m_and_e_fee", sa.Numeric(8, 6), nullable=True),
        sa.Column("target_allocation_pct", sa.Numeric(8, 6), nullable=True),
        sa.Column("actual_allocation_pct", sa.Numeric(8, 6), nullable=True),
        sa.Column("fund_name", sa.String(255), nullable=True),
        sa.Column("dividend_reinvest", sa.Boolean(), nullable=True),
        sa.Column("cap_gains_reinvest", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "ticker", "cost_basis_date", name="uq_position_account_symbol_cost_basis"),
    )
    op.create_index("ix_positions_account_id", "positions", ["account_id"])
    op.create_index("ix_positions_ticker", "positions", ["ticker"])

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=True),
        sa.Column("settlement_date", sa.Date(), nullable=True),
        sa.Column("transaction_type", sa.String(30), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("ticker", sa.String(20), nullable=True),
        sa.Column("quantity", sa.Numeric(15, 6), nullable=True),
        sa.Column("price", sa.Numeric(15, 6), nullable=True),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("tax_lot_id", sa.String(50), nullable=True),
        sa.Column("linked_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])

    op.create_table(
        "statements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("upload_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("custodian_detected", sa.String(100), nullable=True),
        sa.Column("parser_used", sa.String(100), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("parsed_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("parsing_status", sa.String(30), nullable=False),
        sa.Column("statement_date", sa.Date(), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("beginning_value", sa.Numeric(15, 2), nullable=True),
        sa.Column("ending_value", sa.Numeric(15, 2), nullable=True),
        sa.Column("file_hash", sa.String(256), nullable=True),
        sa.Column("parser_version", sa.String(20), nullable=True),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_statements_custodian_detected", "statements", ["custodian_detected"])

    op.create_table(
        "fee_structures",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("fee_type", sa.String(30), nullable=False),
        sa.Column("fee_rate", sa.Numeric(8, 6), nullable=True),
        sa.Column("fee_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("flat_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("fee_schedule", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("surrender_schedule", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("applies_to", sa.String(30), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fee_structures_account_id", "fee_structures", ["account_id"])

    op.create_table(
        "compliance_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recommendation_id", sa.String(100), nullable=True),
        sa.Column("rule_checked", sa.String(50), nullable=False),
        sa.Column("result", sa.String(20), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("advisor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("prompt_version", sa.String(30), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_compliance_logs_client_id", "compliance_logs", ["client_id"])
    op.create_index("ix_compliance_logs_recommendation_id", "compliance_logs", ["recommendation_id"])
    op.create_index("ix_compliance_logs_rule_checked", "compliance_logs", ["rule_checked"])

    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_compliance_log_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'ComplianceLog records are immutable';
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER compliance_log_no_update
            BEFORE UPDATE OR DELETE ON compliance_logs
            FOR EACH ROW EXECUTE PROCEDURE prevent_compliance_log_modification();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS compliance_log_no_update ON compliance_logs")
    op.execute("DROP FUNCTION IF EXISTS prevent_compliance_log_modification()")
    op.drop_table("compliance_logs")
    op.drop_table("fee_structures")
    op.drop_table("statements")
    op.drop_table("transactions")
    op.drop_table("positions")
    op.drop_table("accounts")
    op.drop_table("clients")
    op.drop_table("households")
    op.drop_table("advisors")
    op.drop_table("firms")
