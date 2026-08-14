"""
VidyaSetu ERP — Device Security Tables Migration
==================================================
Phase: Device Security System (a008)

Creates:
  - user_devices         : Trusted device registry (max 3 per user)
  - login_events         : Full login audit trail
  - login_verification_requests : Pending new-device verifications

Run: python -m alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'a008_device_security_tables'
down_revision = 'a007_legacy_columns_nullable'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. user_devices ────────────────────────────────────────
    # Stores one record per registered device per user.
    # Maximum 3 ACTIVE/trusted per user — enforced by backend transaction.
    # Exactly one PRIMARY per user — enforced by partial unique index.
    op.create_table(
        'user_devices',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),

        # ── Ownership ────────────────────────────────────────
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),

        # ── Device Identity ──────────────────────────────────
        # High-entropy UUID generated on the client (app install / browser first visit).
        # Never an IMEI, MAC address, or other hardware identifier.
        sa.Column('device_installation_id', sa.String(255), nullable=False),

        # ── Device Metadata ──────────────────────────────────
        sa.Column('device_type', sa.String(50), nullable=True),       # web | android | ios
        sa.Column('platform', sa.String(50), nullable=True),           # web | android | ios
        sa.Column('manufacturer', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('os_version', sa.String(100), nullable=True),
        sa.Column('app_version', sa.String(50), nullable=True),
        sa.Column('browser_name', sa.String(100), nullable=True),
        sa.Column('browser_version', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('timezone', sa.String(100), nullable=True),
        sa.Column('language', sa.String(20), nullable=True),

        # ── Trust State ──────────────────────────────────────
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_trusted', sa.Boolean(), nullable=False, server_default='false'),
        # ACTIVE | REVOKED | PENDING | BLOCKED
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),

        # ── Timing ───────────────────────────────────────────
        sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trusted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),

        # ── Base Model Fields ────────────────────────────────
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
    )

    # Composite index: fast lookup by user + status
    op.create_index('ix_user_devices_user_status',
                    'user_devices', ['user_id', 'status', 'is_deleted'])

    # Index for device installation ID lookup
    op.create_index('ix_user_devices_installation_id',
                    'user_devices', ['device_installation_id'])

    # Index: user_id for fast per-user queries
    op.create_index('ix_user_devices_user_id',
                    'user_devices', ['user_id'])

    # CRITICAL: Partial unique index — only ONE primary device per user.
    # Uses PostgreSQL partial index (WHERE clause). Safe during concurrent writes.
    op.execute("""
        CREATE UNIQUE INDEX uix_user_devices_one_primary
        ON user_devices (user_id)
        WHERE is_primary = true AND is_deleted = false
    """)

    # ── 2. login_events ────────────────────────────────────────
    # Append-only audit table. Never modified after insert.
    # Normal users cannot modify — enforced at application layer.
    op.create_table(
        'login_events',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),

        # ── References ───────────────────────────────────────
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('device_id', sa.BigInteger(), sa.ForeignKey('user_devices.id', ondelete='SET NULL'), nullable=True),

        # Groups events for one login attempt (e.g., ATTEMPT → VERIFICATION_REQUESTED → SUCCESS)
        sa.Column('login_attempt_id', sa.String(36), nullable=True),

        # ── Event Classification ─────────────────────────────
        # LOGIN_ATTEMPT | LOGIN_SUCCESS | LOGIN_FAILED | NEW_DEVICE |
        # DEVICE_VERIFICATION_REQUESTED | DEVICE_VERIFICATION_SUCCESS |
        # DEVICE_VERIFICATION_FAILED | DEVICE_REVOKED | PRIMARY_DEVICE_CHANGED |
        # LOGOUT | PASSWORD_CHANGED | SUSPICIOUS_LOGIN | ACCOUNT_LOCKED
        sa.Column('event_type', sa.String(60), nullable=False),
        sa.Column('status', sa.String(20), nullable=True),  # SUCCESS | FAILED | PENDING

        # ── Request Context ──────────────────────────────────
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('platform', sa.String(50), nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),

        # ── Location (only when explicitly provided by client) ─
        sa.Column('approximate_location', sa.String(255), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('location_accuracy', sa.Float(), nullable=True),

        # ── Event Metadata ───────────────────────────────────
        sa.Column('login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verification_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verification_method', sa.String(20), nullable=True),  # email | push
        sa.Column('risk_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failure_reason', sa.String(255), nullable=True),

        # ── Base Fields ──────────────────────────────────────
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
    )

    op.create_index('ix_login_events_user_login_at', 'login_events', ['user_id', 'login_at'])
    op.create_index('ix_login_events_event_type', 'login_events', ['event_type'])
    op.create_index('ix_login_events_ip', 'login_events', ['ip_address'])
    op.create_index('ix_login_events_attempt_id', 'login_events', ['login_attempt_id'])

    # ── 3. login_verification_requests ─────────────────────────
    # One record per pending device verification.
    # UUID primary key (not BigInteger) for opaque, non-guessable IDs.
    op.create_table(
        'login_verification_requests',
        sa.Column('id', sa.String(36), primary_key=True),   # UUID as string PK

        # ── References ───────────────────────────────────────
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('device_id', sa.BigInteger(), sa.ForeignKey('user_devices.id', ondelete='SET NULL'), nullable=True),
        sa.Column('login_attempt_id', sa.String(36), nullable=True),

        # ── Verification Token ───────────────────────────────
        # SHA-256 hash of the actual token. NEVER store plaintext token in DB.
        sa.Column('verification_token_hash', sa.String(255), nullable=False),

        # ── Status ───────────────────────────────────────────
        # PENDING | VERIFIED | REJECTED | EXPIRED
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),

        # ── Rate Limiting ────────────────────────────────────
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='5'),

        # ── Timing ───────────────────────────────────────────
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),

        # ── Request Context ──────────────────────────────────
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),

        # ── Timestamps ───────────────────────────────────────
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
    )

    op.create_index('ix_lvr_token_hash', 'login_verification_requests', ['verification_token_hash'])
    op.create_index('ix_lvr_user_status', 'login_verification_requests', ['user_id', 'status'])
    op.create_index('ix_lvr_login_attempt', 'login_verification_requests', ['login_attempt_id'])


def downgrade() -> None:
    op.drop_table('login_verification_requests')
    op.drop_table('login_events')
    op.drop_table('user_devices')
