"""add portfolio and IPS tables

Revision ID: 004
Revises: 003
Create Date: 2026-02-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "risk_questionnaires",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("q1_investment_experience", sa.Integer(), nullable=False),
        sa.Column("q2_risk_comfort", sa.Integer(), nullable=False),
        sa.Column("q3_loss_reaction", sa.Integer(), nullable=False),
        sa.Column("q4_income_stability", sa.Integer(), nullable=False),
        sa.Column("q5_emergency_fund", sa.Integer(), nullable=False),
        sa.Column("q6_investment_goal", sa.Integer(), nullable=False),
        sa.Column("q7_time_horizon_years", sa.Integer(), nullable=False),
        sa.Column("q8_withdrawal_needs", sa.Integer(), nullable=False),
        sa.Column("q9_portfolio_volatility", sa.Integer(), nullable=False),
        sa.Column("q10_financial_knowledge", sa.Integer(), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=True),
        sa.Column("risk_tolerance", sa.String(50), nullable=True),
        sa.Column("recommended_equity_pct", sa.Integer(), nullable=True),
        sa.Column("annual_income", sa.Numeric(15, 2), nullable=True),
        sa.Column("liquid_net_worth", sa.Numeric(15, 2), nullable=True),
        sa.Column("total_net_worth", sa.Numeric(15, 2), nullable=True),
        sa.Column("investment_objective", sa.String(50), nullable=True),
        sa.Column("time_horizon", sa.String(20), nullable=True),
        sa.Column("special_considerations", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_risk_questionnaires_client_id", "risk_questionnaires", ["client_id"])

    op.create_table(
        "model_portfolios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("risk_level", sa.String(50), nullable=False),
        sa.Column("is_preset", sa.Boolean(), default=False, nullable=False),
        sa.Column("questionnaire_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_advisor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("equity_allocation", sa.Numeric(5, 2), nullable=False),
        sa.Column("fixed_income_allocation", sa.Numeric(5, 2), nullable=False),
        sa.Column("alternatives_allocation", sa.Numeric(5, 2), default=0),
        sa.Column("cash_allocation", sa.Numeric(5, 2), default=0),
        sa.Column("large_cap_pct", sa.Numeric(5, 2), default=0),
        sa.Column("mid_cap_pct", sa.Numeric(5, 2), default=0),
        sa.Column("small_cap_pct", sa.Numeric(5, 2), default=0),
        sa.Column("international_developed_pct", sa.Numeric(5, 2), default=0),
        sa.Column("emerging_markets_pct", sa.Numeric(5, 2), default=0),
        sa.Column("govt_bonds_pct", sa.Numeric(5, 2), default=0),
        sa.Column("corp_bonds_pct", sa.Numeric(5, 2), default=0),
        sa.Column("tips_pct", sa.Numeric(5, 2), default=0),
        sa.Column("high_yield_pct", sa.Numeric(5, 2), default=0),
        sa.Column("intl_bonds_pct", sa.Numeric(5, 2), default=0),
        sa.Column("rebalancing_frequency", sa.String(20), default="quarterly"),
        sa.Column("tax_efficiency_optimized", sa.Boolean(), default=True),
        sa.Column("esg_compliant", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), default=False, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["questionnaire_id"], ["risk_questionnaires.id"]),
        sa.ForeignKeyConstraint(["created_by_advisor_id"], ["advisors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "model_portfolio_holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("symbol", sa.String(10), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("asset_class", sa.String(50), nullable=False),
        sa.Column("sub_class", sa.String(50), nullable=True),
        sa.Column("target_weight", sa.Numeric(5, 2), nullable=False),
        sa.Column("min_weight", sa.Numeric(5, 2), nullable=True),
        sa.Column("max_weight", sa.Numeric(5, 2), nullable=True),
        sa.Column("expense_ratio", sa.Numeric(6, 4), nullable=True),
        sa.Column("dividend_yield", sa.Numeric(5, 2), nullable=True),
        sa.Column("aum_billions", sa.Numeric(10, 2), nullable=True),
        sa.Column("avg_daily_volume", sa.Integer(), nullable=True),
        sa.Column("selection_rationale", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["portfolio_id"], ["model_portfolios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "investment_policy_statements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("questionnaire_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column("client_profile_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("investment_objectives_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("risk_tolerance_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("time_horizon_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("asset_allocation_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("investment_guidelines_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("rebalancing_policy_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("monitoring_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("fiduciary_acknowledgment_section", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("version", sa.Integer(), default=1),
        sa.Column("status", sa.String(20), default="draft"),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("review_date", sa.Date(), nullable=True),
        sa.Column("client_signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("advisor_signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("advisor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("pdf_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"]),
        sa.ForeignKeyConstraint(["questionnaire_id"], ["risk_questionnaires.id"]),
        sa.ForeignKeyConstraint(["portfolio_id"], ["model_portfolios.id"]),
        sa.ForeignKeyConstraint(["advisor_id"], ["advisors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_investment_policy_statements_client_id", "investment_policy_statements", ["client_id"])


def downgrade() -> None:
    op.drop_table("investment_policy_statements")
    op.drop_table("model_portfolio_holdings")
    op.drop_table("model_portfolios")
    op.drop_table("risk_questionnaires")
