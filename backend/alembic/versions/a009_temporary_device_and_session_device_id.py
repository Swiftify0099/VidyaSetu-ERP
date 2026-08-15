"""
VidyaSetu ERP — Temporary Device & Session Device ID Migration
==============================================================
Phase: Temporary Device Login & Real-Time Approval (a009)

Adds:
  - user_devices.is_temporary (BOOLEAN, default false)
  - user_devices.temporary_started_at (TIMESTAMPTZ, nullable)
  - user_devices.temporary_expires_at (TIMESTAMPTZ, nullable)
  - user_devices.revoke_reason (VARCHAR(255), nullable)
  - user_sessions.device_id (BIGINT FK to user_devices.id ON DELETE SET NULL)

Run: python -m alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a009_temporary_device_and_session_device_id'
down_revision = 'a008_device_security_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. user_devices columns ───────────────────────────────
    op.add_column(
        'user_devices',
        sa.Column('is_temporary', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'user_devices',
        sa.Column('temporary_started_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'user_devices',
        sa.Column('temporary_expires_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'user_devices',
        sa.Column('revoke_reason', sa.String(255), nullable=True)
    )
    op.create_index(
        'ix_user_devices_temporary_expires',
        'user_devices',
        ['temporary_expires_at']
    )

    # ── 2. user_sessions device_id column ─────────────────────
    op.add_column(
        'user_sessions',
        sa.Column('device_id', sa.BigInteger(), sa.ForeignKey('user_devices.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index(
        'ix_user_sessions_device_id',
        'user_sessions',
        ['device_id']
    )


def downgrade() -> None:
    op.drop_index('ix_user_sessions_device_id', table_name='user_sessions')
    op.drop_column('user_sessions', 'device_id')
    op.drop_index('ix_user_devices_temporary_expires', table_name='user_devices')
    op.drop_column('user_devices', 'revoke_reason')
    op.drop_column('user_devices', 'temporary_expires_at')
    op.drop_column('user_devices', 'temporary_started_at')
    op.drop_column('user_devices', 'is_temporary')
