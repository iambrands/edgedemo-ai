"""Add alternative asset tracking tables

Revision ID: 011
Revises: 010
Create Date: 2025-02-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Create ENUM types
    # ------------------------------------------------------------------
    op.execute(
        """CREATE TYPE alternativeassettype AS ENUM (
            'private_equity', 'venture_capital', 'hedge_fund', 'real_estate',
            'private_debt', 'commodities', 'collectibles', 'infrastructure',
            'natural_resources', 'cryptocurrency', 'other'
        )"""
    )
    op.execute(
        """CREATE TYPE investmentstatus AS ENUM (
            'committed', 'active', 'harvesting', 'fully_realized',
            'written_off', 'pending'
        )"""
    )
    op.execute(
        """CREATE TYPE transactiontype AS ENUM (
            'capital_call', 'distribution', 'return_of_capital',
            'management_fee', 'carried_interest', 'recallable_distribution',
            'transfer_in', 'transfer_out', 'adjustment',
            'income', 'expense', 'valuation_adjustment'
        )"""
    )
    op.execute(
        """CREATE TYPE valuationsource AS ENUM (
            'fund_statement', 'gp_report', 'third_party', 'appraisal',
            'internal', 'market_data', 'internal_estimate',
            'market_comparable', 'cost_basis'
        )"""
    )
    op.execute(
        """CREATE TYPE alt_documenttype AS ENUM (
            'k1', 'fund_statement', 'capital_call_notice',
            'distribution_notice', 'subscription_agreement', 'side_letter',
            'ppm', 'lpa', 'annual_report', 'quarterly_report',
            'tax_estimate', 'appraisal', 'insurance',
            'financial_statement', 'other'
        )"""
    )

    # ------------------------------------------------------------------
    # alternative_investments
    # ------------------------------------------------------------------
    op.create_table(
        "alternative_investments",
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
            nullable=False,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("custodian_accounts.id"),
            nullable=True,
        ),
        # Identity
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "asset_type",
            sa.Enum(
                "private_equity",
                "venture_capital",
                "hedge_fund",
                "real_estate",
                "private_debt",
                "commodities",
                "collectibles",
                "infrastructure",
                "natural_resources",
                "cryptocurrency",
                "other",
                name="alternativeassettype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "committed",
                "active",
                "harvesting",
                "fully_realized",
                "written_off",
                "pending",
                name="investmentstatus",
                create_type=False,
            ),
            server_default="committed",
        ),
        # Fund details
        sa.Column("fund_name", sa.String(255)),
        sa.Column("sponsor_name", sa.String(255)),
        sa.Column("fund_manager", sa.String(255)),
        sa.Column("vintage_year", sa.Integer),
        sa.Column("investment_date", sa.Date),
        sa.Column("maturity_date", sa.Date),
        # Strategy
        sa.Column("investment_strategy", sa.String(255)),
        sa.Column("geography", sa.String(100)),
        sa.Column("sector_focus", sa.String(255)),
        # Capital
        sa.Column("total_commitment", sa.Numeric(18, 2), nullable=False),
        sa.Column("called_capital", sa.Numeric(18, 2), server_default="0"),
        sa.Column("uncalled_capital", sa.Numeric(18, 2), server_default="0"),
        sa.Column(
            "distributions_received", sa.Numeric(18, 2), server_default="0"
        ),
        sa.Column(
            "recallable_distributions", sa.Numeric(18, 2), server_default="0"
        ),
        # Valuation
        sa.Column("current_nav", sa.Numeric(18, 2), server_default="0"),
        sa.Column("nav_date", sa.Date),
        # Cost basis
        sa.Column("cost_basis", sa.Numeric(18, 2), server_default="0"),
        sa.Column(
            "adjusted_cost_basis", sa.Numeric(18, 2), server_default="0"
        ),
        # Performance
        sa.Column("irr", sa.Numeric(10, 4)),
        sa.Column("tvpi", sa.Numeric(10, 4)),
        sa.Column("dpi", sa.Numeric(10, 4)),
        sa.Column("rvpi", sa.Numeric(10, 4)),
        sa.Column("moic", sa.Numeric(10, 4)),
        # Fees
        sa.Column("management_fee_rate", sa.Numeric(6, 4)),
        sa.Column("carried_interest_rate", sa.Numeric(6, 4)),
        sa.Column("preferred_return", sa.Numeric(6, 4)),
        # Tax
        sa.Column("tax_entity_type", sa.String(50)),
        sa.Column("ein", sa.String(20)),
        sa.Column("fiscal_year_end", sa.String(10)),
        # Real estate
        sa.Column("property_address", sa.Text),
        sa.Column("property_type", sa.String(100)),
        sa.Column("square_footage", sa.Integer),
        # Collectibles
        sa.Column("item_description", sa.Text),
        sa.Column("provenance", sa.Text),
        sa.Column("storage_location", sa.String(255)),
        sa.Column("insurance_policy", sa.String(100)),
        sa.Column("insurance_value", sa.Numeric(18, 2)),
        # Metadata
        sa.Column("notes", sa.Text),
        sa.Column("tags", postgresql.ARRAY(sa.String)),
        sa.Column("custom_fields", postgresql.JSONB),
        sa.Column("subscription_doc_url", sa.String(500)),
        # Timestamps
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
        "ix_altinv_advisor", "alternative_investments", ["advisor_id"]
    )
    op.create_index(
        "ix_altinv_client", "alternative_investments", ["client_id"]
    )
    op.create_index(
        "ix_altinv_type", "alternative_investments", ["asset_type"]
    )
    op.create_index(
        "ix_altinv_status", "alternative_investments", ["status"]
    )

    # ------------------------------------------------------------------
    # capital_calls (must be before alternative_transactions due to FK)
    # ------------------------------------------------------------------
    op.create_table(
        "capital_calls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "investment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("alternative_investments.id"),
            nullable=False,
        ),
        sa.Column("call_number", sa.Integer),
        sa.Column("notice_date", sa.Date, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        # Amounts
        sa.Column("call_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("management_fee_portion", sa.Numeric(18, 2)),
        sa.Column("investment_portion", sa.Numeric(18, 2)),
        sa.Column("other_expenses", sa.Numeric(18, 2)),
        # Cumulative
        sa.Column("cumulative_called", sa.Numeric(18, 2)),
        sa.Column("remaining_commitment", sa.Numeric(18, 2)),
        sa.Column("percentage_called", sa.Numeric(8, 4)),
        # Status
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("paid_date", sa.Date),
        sa.Column("paid_amount", sa.Numeric(18, 2)),
        # Wire info (JSON for structured bank details)
        sa.Column("wire_instructions", postgresql.JSONB),
        # Document
        sa.Column("notice_url", sa.String(500)),
        sa.Column("notes", sa.Text),
        # Timestamps
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
        "ix_capcall_investment", "capital_calls", ["investment_id"]
    )
    op.create_index("ix_capcall_status", "capital_calls", ["status"])
    op.create_index("ix_capcall_due", "capital_calls", ["due_date"])

    # ------------------------------------------------------------------
    # alternative_transactions
    # ------------------------------------------------------------------
    op.create_table(
        "alternative_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "investment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("alternative_investments.id"),
            nullable=False,
        ),
        sa.Column(
            "transaction_type",
            sa.Enum(
                "capital_call",
                "distribution",
                "return_of_capital",
                "management_fee",
                "carried_interest",
                "recallable_distribution",
                "transfer_in",
                "transfer_out",
                "adjustment",
                "income",
                "expense",
                "valuation_adjustment",
                name="transactiontype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("transaction_date", sa.Date, nullable=False),
        sa.Column("settlement_date", sa.Date),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        # FK to capital call
        sa.Column(
            "capital_call_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("capital_calls.id"),
        ),
        # Tax breakdowns
        sa.Column("return_of_capital", sa.Numeric(18, 2)),
        sa.Column("capital_gains_short", sa.Numeric(18, 2)),
        sa.Column("capital_gains_long", sa.Numeric(18, 2)),
        sa.Column("ordinary_income", sa.Numeric(18, 2)),
        sa.Column("qualified_dividends", sa.Numeric(18, 2)),
        # Reference
        sa.Column("reference_number", sa.String(100)),
        sa.Column("status", sa.String(50), server_default="completed"),
        sa.Column("notes", sa.Text),
        # Timestamps
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
        "ix_alttxn_investment", "alternative_transactions", ["investment_id"]
    )
    op.create_index(
        "ix_alttxn_type", "alternative_transactions", ["transaction_type"]
    )
    op.create_index(
        "ix_alttxn_date", "alternative_transactions", ["transaction_date"]
    )

    # ------------------------------------------------------------------
    # alternative_valuations
    # ------------------------------------------------------------------
    op.create_table(
        "alternative_valuations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "investment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("alternative_investments.id"),
            nullable=False,
        ),
        sa.Column("valuation_date", sa.Date, nullable=False),
        sa.Column("nav", sa.Numeric(18, 2), nullable=False),
        sa.Column(
            "source",
            sa.Enum(
                "fund_statement",
                "gp_report",
                "third_party",
                "appraisal",
                "internal",
                "market_data",
                "internal_estimate",
                "market_comparable",
                "cost_basis",
                name="valuationsource",
                create_type=False,
            ),
            server_default="fund_statement",
        ),
        sa.Column("source_document", sa.String(255)),
        # Return metrics
        sa.Column("period_return", sa.Numeric(10, 4)),
        sa.Column("ytd_return", sa.Numeric(10, 4)),
        # Breakdown
        sa.Column("unrealized_gain", sa.Numeric(18, 2)),
        sa.Column("realized_gain", sa.Numeric(18, 2)),
        # Performance snapshot
        sa.Column("irr", sa.Numeric(10, 4)),
        sa.Column("tvpi", sa.Numeric(10, 4)),
        sa.Column("dpi", sa.Numeric(10, 4)),
        sa.Column("notes", sa.Text),
        # Timestamps
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
            "investment_id", "valuation_date", name="uq_alt_valuation_date"
        ),
    )
    op.create_index(
        "ix_altval_investment", "alternative_valuations", ["investment_id"]
    )
    op.create_index(
        "ix_altval_date", "alternative_valuations", ["valuation_date"]
    )

    # ------------------------------------------------------------------
    # alternative_documents
    # ------------------------------------------------------------------
    op.create_table(
        "alternative_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "investment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("alternative_investments.id"),
            nullable=False,
        ),
        sa.Column(
            "document_type",
            sa.Enum(
                "k1",
                "fund_statement",
                "capital_call_notice",
                "distribution_notice",
                "subscription_agreement",
                "side_letter",
                "ppm",
                "lpa",
                "annual_report",
                "quarterly_report",
                "tax_estimate",
                "appraisal",
                "insurance",
                "financial_statement",
                "other",
                name="alt_documenttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        # Dates
        sa.Column("document_date", sa.Date),
        sa.Column("tax_year", sa.Integer),
        sa.Column("period_start", sa.Date),
        sa.Column("period_end", sa.Date),
        # File
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer),
        sa.Column("file_type", sa.String(50)),
        # K-1 fields
        sa.Column("k1_box_1", sa.Numeric(18, 2)),
        sa.Column("k1_box_2", sa.Numeric(18, 2)),
        sa.Column("k1_box_3", sa.Numeric(18, 2)),
        sa.Column("k1_box_4a", sa.Numeric(18, 2)),
        sa.Column("k1_box_5", sa.Numeric(18, 2)),
        sa.Column("k1_box_6a", sa.Numeric(18, 2)),
        sa.Column("k1_box_6b", sa.Numeric(18, 2)),
        sa.Column("k1_box_8", sa.Numeric(18, 2)),
        sa.Column("k1_box_9a", sa.Numeric(18, 2)),
        sa.Column("k1_box_11", sa.Numeric(18, 2)),
        sa.Column("k1_box_13", postgresql.JSONB),
        sa.Column("k1_box_19", sa.Numeric(18, 2)),
        sa.Column("k1_box_20", postgresql.JSONB),
        # Processing
        sa.Column("is_processed", sa.Boolean, server_default="false"),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("notes", sa.Text),
        # Timestamps
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
        "ix_altdoc_investment", "alternative_documents", ["investment_id"]
    )
    op.create_index(
        "ix_altdoc_type", "alternative_documents", ["document_type"]
    )
    op.create_index(
        "ix_altdoc_taxyear", "alternative_documents", ["tax_year"]
    )

    # ------------------------------------------------------------------
    # alternative_asset_summaries
    # ------------------------------------------------------------------
    op.create_table(
        "alternative_asset_summaries",
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
            nullable=False,
        ),
        sa.Column("as_of_date", sa.Date, nullable=False),
        # Totals
        sa.Column("total_investments", sa.Integer, server_default="0"),
        sa.Column("total_commitment", sa.Numeric(18, 2), server_default="0"),
        sa.Column("total_called", sa.Numeric(18, 2), server_default="0"),
        sa.Column("total_uncalled", sa.Numeric(18, 2), server_default="0"),
        sa.Column("total_nav", sa.Numeric(18, 2), server_default="0"),
        sa.Column(
            "total_distributions", sa.Numeric(18, 2), server_default="0"
        ),
        # By type
        sa.Column("nav_by_type", postgresql.JSONB),
        sa.Column("commitment_by_type", postgresql.JSONB),
        # Performance
        sa.Column("overall_irr", sa.Numeric(10, 4)),
        sa.Column("overall_tvpi", sa.Numeric(10, 4)),
        # Pending
        sa.Column("pending_capital_calls", sa.Integer, server_default="0"),
        sa.Column(
            "pending_call_amount", sa.Numeric(18, 2), server_default="0"
        ),
        # Timestamps
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
            "client_id", "as_of_date", name="uq_alt_summary_client_date"
        ),
    )
    op.create_index(
        "ix_altsum_advisor", "alternative_asset_summaries", ["advisor_id"]
    )
    op.create_index(
        "ix_altsum_client", "alternative_asset_summaries", ["client_id"]
    )
    op.create_index(
        "ix_altsum_date", "alternative_asset_summaries", ["as_of_date"]
    )


def downgrade() -> None:
    # Drop tables in reverse order (respect FK dependencies)
    op.drop_table("alternative_asset_summaries")
    op.drop_table("alternative_documents")
    op.drop_table("alternative_transactions")
    op.drop_table("alternative_valuations")
    op.drop_table("capital_calls")
    op.drop_table("alternative_investments")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS alt_documenttype")
    op.execute("DROP TYPE IF EXISTS valuationsource")
    op.execute("DROP TYPE IF EXISTS transactiontype")
    op.execute("DROP TYPE IF EXISTS investmentstatus")
    op.execute("DROP TYPE IF EXISTS alternativeassettype")
