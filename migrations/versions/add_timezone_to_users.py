"""Add timezone field to users table

Revision ID: add_timezone_to_users
Revises: 
Create Date: 2026-01-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_timezone_to_users'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add timezone column to users table with default 'America/New_York'"""
    # Check if column already exists to make migration idempotent
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'timezone' not in columns:
        op.add_column('users', sa.Column('timezone', sa.String(50), nullable=True, server_default='America/New_York'))
        
        # Update existing rows to have the default timezone
        op.execute("UPDATE users SET timezone = 'America/New_York' WHERE timezone IS NULL")


def downgrade():
    """Remove timezone column from users table"""
    op.drop_column('users', 'timezone')
