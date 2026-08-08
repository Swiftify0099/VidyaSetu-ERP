"""Keep the legacy permission name column compatible with the current model."""
from alembic import op
import sqlalchemy as sa


revision = "a004_permission_compatibility"
down_revision = "a003_reconcile_auth_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE permissions SET name = COALESCE(name, code) "
            "WHERE name IS NULL"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE permissions ALTER COLUMN name SET DEFAULT ''"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE permissions ALTER COLUMN name DROP DEFAULT"))