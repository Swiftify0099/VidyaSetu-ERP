"""Add model columns that were introduced after the original Docker schema.

The project has a long-lived Docker database with an older migration snapshot,
while the application models have since gained fields across most modules.
This migration adds missing columns as nullable compatibility columns so
existing rows remain valid and current application writes can proceed.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "a006_reconcile_model_columns"
down_revision = "a005_permission_name_nullable"
branch_labels = None
depends_on = None


def _import_models() -> None:
    modules = (
        "auth.models",
        "settings.models",
        "student.models",
        "teacher.models",
        "office.models",
        "finance.models",
        "library.models",
        "exam.models",
        "attendance.models",
        "timetable.models",
        "communication.models",
        "inventory.models",
        "analytics.models",
        "qr.models",
        "ai.models",
        "leave.models",
        "lesson_plan.models",
        "transport.models",
        "behaviour.models",
    )
    for module in modules:
        __import__(f"app.modules.{module}")
    import app.shared.audit  # noqa: F401


def upgrade() -> None:
    _import_models()
    from app.database.base import Base

    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    for table_name, model_table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            continue
        existing_columns = {
            column["name"] for column in inspector.get_columns(table_name)
        }

        for model_column in model_table.columns:
            if model_column.name in existing_columns:
                continue
            # Nullable is deliberate: old rows cannot satisfy newly introduced
            # required application fields. Current create paths provide values.
            op.add_column(
                table_name,
                sa.Column(
                    model_column.name,
                    model_column.type,
                    nullable=True,
                ),
            )

        # Current BaseModel rows use UUID identity. Backfill old rows and make
        # the column required where the model defines it.
        if "uuid" in model_table.columns:
            current_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            } | {column.name for column in model_table.columns}
            if "uuid" in current_columns:
                op.execute(
                    sa.text(
                        f"UPDATE {table_name} SET uuid = md5(random()::text || "
                        "clock_timestamp()::text) WHERE uuid IS NULL"
                    )
                )
                op.execute(
                    sa.text(
                        f"ALTER TABLE {table_name} ALTER COLUMN uuid SET NOT NULL"
                    )
                )
                op.execute(
                    sa.text(
                        f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{table_name}_uuid "
                        f"ON {table_name} (uuid)"
                    )
                )


def downgrade() -> None:
    # Compatibility columns are intentionally retained on downgrade so this
    # migration cannot remove data or break a previously seeded installation.
    pass