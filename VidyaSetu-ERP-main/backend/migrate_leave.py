"""
Leave table migration — adds multi-stage approval columns.
Run: python migrate_leave.py
"""
from app.database.session import engine
from sqlalchemy import text, inspect

insp = inspect(engine)
cols = [c["name"] for c in insp.get_columns("leave_applications")]
print("Existing columns:", cols)

new_cols = [
    ("approval_stage",        "VARCHAR(30)"),
    ("current_approver_role", "VARCHAR(30)"),
    ("ct_action",             "VARCHAR(20)"),
    ("ct_approver_id",        "BIGINT"),
    ("ct_actioned_on",        "DATE"),
    ("ct_remarks",            "VARCHAR(500)"),
    ("vp_action",             "VARCHAR(20)"),
    ("vp_approver_id",        "BIGINT"),
    ("vp_actioned_on",        "DATE"),
    ("vp_remarks",            "VARCHAR(500)"),
]

with engine.begin() as conn:
    for col, dtype in new_cols:
        if col not in cols:
            conn.execute(text(f"ALTER TABLE leave_applications ADD COLUMN {col} {dtype}"))
            # Set default for approval_stage
            if col == "approval_stage":
                conn.execute(text("UPDATE leave_applications SET approval_stage = 'class_teacher' WHERE approval_stage IS NULL"))
            print(f"  Added: {col}")
        else:
            print(f"  Exists: {col}")

print("Migration complete.")
