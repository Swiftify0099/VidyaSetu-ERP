"""Allow current permission model to use code without legacy name values."""
from alembic import op
import sqlalchemy as sa


revision = "a005_permission_name_nullable"
down_revision = "a004_permission_compatibility"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("ALTER TABLE permissions ALTER COLUMN name DROP DEFAULT")
    )
    op.execute(
        sa.text("ALTER TABLE permissions ALTER COLUMN name DROP NOT NULL")
    )


def downgrade() -> None:
    # Existing NULL values cannot safely be restored to a required legacy
    # value without inventing names, so leave the column nullable.
    pass