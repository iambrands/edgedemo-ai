"""Add beta code tables and user.beta_code_used

Revision ID: add_beta_codes
Revises: add_user_performance
Create Date: 2026-01-27

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_beta_codes'
down_revision = 'add_user_performance'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Add beta_code_used to users
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'beta_code_used' not in columns:
        op.add_column('users', sa.Column('beta_code_used', sa.String(50), nullable=True))

    # Create beta_codes table
    if 'beta_codes' not in tables:
        op.create_table(
            'beta_codes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(50), nullable=False),
            sa.Column('description', sa.String(255), nullable=True),
            sa.Column('max_uses', sa.Integer(), server_default='100'),
            sa.Column('current_uses', sa.Integer(), server_default='0'),
            sa.Column('valid_from', sa.DateTime(), nullable=True),
            sa.Column('valid_until', sa.DateTime(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('code')
        )
        op.create_index(op.f('ix_beta_codes_code'), 'beta_codes', ['code'], unique=True)

    if 'beta_code_usage' not in tables:
        op.create_table(
            'beta_code_usage',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('beta_code_id', sa.Integer(), sa.ForeignKey('beta_codes.id'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('used_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade():
    op.drop_table('beta_code_usage')
    op.drop_index(op.f('ix_beta_codes_code'), table_name='beta_codes')
    op.drop_table('beta_codes')
    op.drop_column('users', 'beta_code_used')
