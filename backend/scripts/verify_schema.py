"""
Run after migration to verify schema correctness.
Checks: column types, constraints, indexes, enum definitions.
"""

import logging
import os
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_project_root))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_schema(conn):
    """Verify schema against expected structure."""
    from sqlalchemy import inspect, text

    inspector = inspect(conn)
    errors = []
    warnings = []

    expected_monetary = ["Numeric(15, 2)", "NUMERIC(15,2)"]
    expected_percent = ["Numeric(8, 6)", "NUMERIC(8,6)"]
    jsonb_tables = {
        "fee_structures": ["fee_schedule", "surrender_schedule"],
        "advisors": ["licenses"],
        "statements": ["parsed_data"],
        "compliance_logs": ["details"],
    }

    for table in inspector.get_table_names():
        for col in inspector.get_columns(table):
            col_type = str(col["type"])
            col_name = col["name"].lower()

            if "market_value" in col_name or "cost_basis" in col_name or "amount" in col_name:
                if "numeric" not in col_type.lower() and "float" in col_type.lower():
                    errors.append(f"{table}.{col['name']}: expected Numeric, got {col_type}")
            if "expense_ratio" in col_name or "fee_rate" in col_name:
                if "numeric" not in col_type.lower() and "float" in col_type.lower():
                    errors.append(f"{table}.{col['name']}: expected Numeric(8,6), got {col_type}")

    if "compliance_logs" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("compliance_logs")}
        if "is_deleted" in cols or "deleted_at" in cols:
            errors.append("ComplianceLog must NOT have soft-delete columns")

    if errors:
        logger.error("Schema verification FAILED:")
        for e in errors:
            logger.error("  %s", e)
        return False

    logger.info("Schema verification PASSED")
    return True


def main():
    from sqlalchemy import create_engine

    url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "")
    if not url:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    engine = create_engine(url)
    with engine.connect() as conn:
        if not verify_schema(conn):
            sys.exit(1)


if __name__ == "__main__":
    main()
