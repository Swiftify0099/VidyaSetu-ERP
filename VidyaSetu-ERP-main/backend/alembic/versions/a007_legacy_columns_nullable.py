"""Relax required columns that exist only in the legacy Docker schema.

The current ORM models replaced these fields with newer names. Keeping the
legacy columns nullable lets old data remain available without forcing every
new insert to populate obsolete values.
"""
from alembic import op
import sqlalchemy as sa


revision = "a007_legacy_columns_nullable"
down_revision = "a006_reconcile_model_columns"
branch_labels = None
depends_on = None


LEGACY_ONLY_REQUIRED_COLUMNS = {
    "class_attendance_sessions": ["session_date"],
    "exams": ["name"],
    "fee_discounts": ["amount"],
    "fee_structures": ["fee_category_id"],
    "holidays": ["holiday_date"],
    "inward_register": ["inward_number", "received_date"],
    "lib_members": ["member_number"],
    "message_templates": ["content"],
    "monthly_attendance_summary": ["standard"],
    "school_events": ["name", "event_date"],
    "stock_transactions": ["txn_type", "balance_after"],
    "student_fee_records": ["fee_category_id", "amount"],
}


def upgrade() -> None:
    for table, columns in LEGACY_ONLY_REQUIRED_COLUMNS.items():
        for column in columns:
            op.execute(
                sa.text(
                    f"ALTER TABLE {table} ALTER COLUMN {column} DROP NOT NULL"
                )
            )


def downgrade() -> None:
    # These columns may contain NULLs after new-model writes; restoring NOT
    # NULL would require inventing legacy values.
    pass