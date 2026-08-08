"""Reconcile legacy auth tables with the current ORM models.

The original Docker schema predates the current auth models. This migration is
forward-only and intentionally preserves existing rows while adding the fields
needed by login, sessions, roles, permissions, and audit logging.
"""
from alembic import op
import sqlalchemy as sa


revision = "a003_reconcile_auth_schema"
down_revision = "a002_leave_lesson_plan"
branch_labels = None
depends_on = None


def _add_column(table: str, column: str, definition: str) -> None:
    op.execute(
        sa.text(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"
        )
    )


def _add_base_columns(table: str) -> None:
    _add_column(table, "uuid", "VARCHAR(36)")
    _add_column(table, "created_by", "BIGINT")
    _add_column(table, "updated_by", "BIGINT")
    _add_column(table, "deleted_at", "TIMESTAMP WITH TIME ZONE")
    op.execute(
        sa.text(
            f"UPDATE {table} SET uuid = md5(random()::text || clock_timestamp()::text) "
            "WHERE uuid IS NULL"
        )
    )
    op.execute(sa.text(f"ALTER TABLE {table} ALTER COLUMN uuid SET NOT NULL"))
    op.execute(
        sa.text(
            f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{table}_uuid ON {table} (uuid)"
        )
    )


def _add_status_columns(table: str) -> None:
    _add_column(table, "is_active", "BOOLEAN NOT NULL DEFAULT TRUE")
    _add_column(table, "is_deleted", "BOOLEAN NOT NULL DEFAULT FALSE")


def upgrade() -> None:
    # Users -----------------------------------------------------------------
    _add_base_columns("users")
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            sa.text(
                "ALTER TABLE users RENAME COLUMN hashed_password TO password_hash"
            )
        )
    _add_column("users", "password_hash", "VARCHAR(255)")
    _add_column("users", "employee_id", "VARCHAR(50)")
    _add_column("users", "gr_number", "VARCHAR(50)")
    _add_column("users", "is_locked", "BOOLEAN NOT NULL DEFAULT FALSE")
    _add_column("users", "lock_reason", "VARCHAR(500)")
    _add_column("users", "failed_attempts", "INTEGER NOT NULL DEFAULT 0")
    _add_column("users", "locked_until", "TIMESTAMP WITH TIME ZONE")
    _add_column("users", "must_change_password", "BOOLEAN NOT NULL DEFAULT FALSE")
    _add_column("users", "password_changed_at", "TIMESTAMP WITH TIME ZONE")
    _add_column("users", "last_login_ip", "VARCHAR(50)")
    _add_column("users", "preferred_language", "VARCHAR(10) NOT NULL DEFAULT 'mr'")
    _add_column("users", "preferred_theme", "VARCHAR(20) NOT NULL DEFAULT 'light'")
    _add_column("users", "fcm_token", "VARCHAR(500)")
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_employee_id ON users (employee_id) "
            "WHERE employee_id IS NOT NULL"
        )
    )
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_gr_number ON users (gr_number) "
            "WHERE gr_number IS NOT NULL"
        )
    )
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email) "
            "WHERE email IS NOT NULL"
        )
    )
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile ON users (mobile) "
            "WHERE mobile IS NOT NULL"
        )
    )

    # Roles -----------------------------------------------------------------
    _add_base_columns("roles")
    _add_column("roles", "code", "VARCHAR(50)")
    _add_column("roles", "is_system", "BOOLEAN NOT NULL DEFAULT FALSE")
    _add_column("roles", "sort_order", "INTEGER NOT NULL DEFAULT 0")
    _add_column("roles", "color", "VARCHAR(20)")
    op.execute(sa.text("UPDATE roles SET code = lower(replace(name, ' ', '_')) WHERE code IS NULL"))
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_roles_code ON roles (code)"
        )
    )

    # Permissions -----------------------------------------------------------
    _add_base_columns("permissions")
    _add_column("permissions", "code", "VARCHAR(200)")
    _add_column("permissions", "category", "VARCHAR(100)")
    op.execute(
        sa.text(
            "UPDATE permissions SET code = COALESCE(code, "
            "COALESCE(module, 'general') || '.' || COALESCE(action, name)) "
            "WHERE code IS NULL"
        )
    )
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_permissions_code ON permissions (code)"
        )
    )

    # Role/user links -------------------------------------------------------
    for table in ("role_permissions", "user_roles"):
        _add_base_columns(table)
        _add_column(table, "assigned_by", "BIGINT")
        _add_column(table, "assigned_at", "TIMESTAMP WITH TIME ZONE")
    _add_column("role_permissions", "granted_by", "BIGINT")
    _add_column("role_permissions", "granted_at", "TIMESTAMP WITH TIME ZONE")
    _add_column("user_roles", "expires_at", "TIMESTAMP WITH TIME ZONE")

    # Sessions --------------------------------------------------------------
    _add_base_columns("user_sessions")
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            sa.text(
                "ALTER TABLE user_sessions RENAME COLUMN token_hash TO token_jti"
            )
        )
    _add_column("user_sessions", "token_jti", "VARCHAR(100)")
    _add_column("user_sessions", "refresh_token_jti", "VARCHAR(100)")
    _add_column("user_sessions", "device_name", "VARCHAR(255)")
    _add_column("user_sessions", "browser", "VARCHAR(255)")
    _add_column("user_sessions", "os", "VARCHAR(100)")
    _add_column("user_sessions", "ip_address", "VARCHAR(50)")
    _add_column("user_sessions", "logged_in_at", "TIMESTAMP WITH TIME ZONE")
    _add_column("user_sessions", "last_active_at", "TIMESTAMP WITH TIME ZONE")
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_user_sessions_token_jti "
            "ON user_sessions (token_jti) WHERE token_jti IS NOT NULL"
        )
    )
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_user_sessions_refresh_token_jti "
            "ON user_sessions (refresh_token_jti) WHERE refresh_token_jti IS NOT NULL"
        )
    )

    # Login writes an audit row on both success and failure. The old audit
    # table has the core fields but not all BaseModel audit fields.
    _add_column("audit_logs", "created_by", "BIGINT")
    _add_column("audit_logs", "updated_by", "BIGINT")
    _add_column("audit_logs", "deleted_at", "TIMESTAMP WITH TIME ZONE")


def downgrade() -> None:
    # Do not remove reconciled columns: this migration preserves legacy data
    # and is intentionally not destructive.
    pass