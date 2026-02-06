import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from logging.config import fileConfig

from sqlalchemy import engine_from_config

# Load .env from project root (for DATABASE_URL)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from sqlalchemy import pool

from alembic import context

# Add project root to path
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from backend.models.base import Base
from backend import models  # noqa: F401 - register all models

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_url() -> str:
    """Use DATABASE_URL from env, fallback to alembic.ini."""
    url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url", ""))
    return url.replace("+asyncpg", "") if url else ""


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url() or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = get_url()
    configuration = config.get_section(config.config_ini_section, {})
    if url:
        configuration["sqlalchemy.url"] = url
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
