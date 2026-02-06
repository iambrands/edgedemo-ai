"""Convert client_goals monetary Float columns to Numeric(14,4)

The client_goals table uses Float for target_amount, current_amount,
and monthly_contribution. Float has precision issues with SQL aggregations
(SUM, AVG) that cause rounding errors in financial calculations.
All other monetary columns in the codebase already use Numeric.

Revision ID: 007
Revises: 006
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Columns to convert: (table, column)
COLUMNS = [
    ("client_goals", "target_amount"),
    ("client_goals", "current_amount"),
    ("client_goals", "monthly_contribution"),
]


def upgrade() -> None:
    """Convert Float columns to Numeric(14, 4) for financial precision."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "client_goals" not in existing_tables:
        # Table may not exist yet if portal migrations haven't run
        return

    existing_cols = [c["name"] for c in inspector.get_columns("client_goals")]

    for _table, col in COLUMNS:
        if col not in existing_cols:
            continue
        op.execute(
            f"ALTER TABLE client_goals "
            f"ALTER COLUMN {col} TYPE NUMERIC(14,4) "
            f"USING {col}::NUMERIC(14,4)"
        )


def downgrade() -> None:
    """Revert Numeric(14, 4) columns back to Float."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "client_goals" not in existing_tables:
        return

    existing_cols = [c["name"] for c in inspector.get_columns("client_goals")]

    for _table, col in COLUMNS:
        if col not in existing_cols:
            continue
        op.execute(
            f"ALTER TABLE client_goals "
            f"ALTER COLUMN {col} TYPE DOUBLE PRECISION "
            f"USING {col}::DOUBLE PRECISION"
        )
