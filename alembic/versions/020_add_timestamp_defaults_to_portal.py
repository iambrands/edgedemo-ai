"""Add server DEFAULT NOW() to portal table timestamp columns

Revision ID: 020
Revises: 019
Create Date: 2026-08-17

Migration 017 created client_portal_users (and related portal tables)
without server-side DEFAULT now() on created_at / updated_at.
The ORM model uses server_default=func.now() which expects the DB to
supply the value on INSERT. Without the column default, every INSERT
that omits those columns raises a NOT NULL violation.

This migration adds DEFAULT now() to all affected portal tables.
"""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None

PORTAL_TABLES = [
    "client_portal_users",
    "portal_narratives",
    "behavioral_nudges",
    "nudge_interactions",
    "client_goals",
    "portal_documents",
    "firm_white_labels",
    "advisor_connection_requests",
    "meetings",
]

# Query to check whether a table+column already has a server default.
_HAS_DEFAULT_SQL = """
    SELECT column_default IS NOT NULL
    FROM information_schema.columns
    WHERE table_name = :tbl AND column_name = :col
      AND table_schema = 'public'
"""


def _set_default_if_missing(conn, table: str, col: str) -> None:
    row = conn.execute(
        sa.text(_HAS_DEFAULT_SQL),
        {"tbl": table, "col": col},
    ).fetchone()
    if row is None:
        return  # column doesn't exist in this schema
    has_default = row[0]
    if not has_default:
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN {col} SET DEFAULT now()")
        )


def upgrade() -> None:
    conn = op.get_bind()
    for table in PORTAL_TABLES:
        _set_default_if_missing(conn, table, "created_at")
        _set_default_if_missing(conn, table, "updated_at")


def downgrade() -> None:
    conn = op.get_bind()
    for table in PORTAL_TABLES:
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN created_at DROP DEFAULT")
        )
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN updated_at DROP DEFAULT")
        )
