"""
VidyaSetu ERP — Alembic Migration Environment
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.database.session import _DB_URL
from app.database.base import Base

# Import all models to register them with Base.metadata
import app.modules.auth.models
import app.modules.settings.models
import app.modules.student.models
import app.modules.teacher.models
import app.modules.office.models
import app.modules.finance.models
import app.modules.library.models
import app.modules.exam.models
import app.modules.attendance.models
import app.modules.timetable.models
import app.modules.communication.models
import app.modules.inventory.models
import app.modules.qr.models
import app.modules.ai.models
import app.shared.audit

# Alembic Config
config = context.config
config.set_main_option("sqlalchemy.url", _DB_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
