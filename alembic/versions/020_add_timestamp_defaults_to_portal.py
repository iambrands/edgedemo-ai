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


def upgrade() -> None:
    for table in PORTAL_TABLES:
        try:
            op.execute(
                f"ALTER TABLE {table} ALTER COLUMN created_at SET DEFAULT now()"
            )
            op.execute(
                f"ALTER TABLE {table} ALTER COLUMN updated_at SET DEFAULT now()"
            )
        except Exception as exc:
            # Table may not have both columns — skip gracefully
            print(f"  Skipping {table}: {exc}")


def downgrade() -> None:
    for table in PORTAL_TABLES:
        try:
            op.execute(
                f"ALTER TABLE {table} ALTER COLUMN created_at DROP DEFAULT"
            )
            op.execute(
                f"ALTER TABLE {table} ALTER COLUMN updated_at DROP DEFAULT"
            )
        except Exception:
            pass
