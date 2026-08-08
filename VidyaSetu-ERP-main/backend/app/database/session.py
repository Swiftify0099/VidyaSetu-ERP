"""
VidyaSetu ERP — Database Session
===================================
SQLAlchemy engine and session factory.
"""
import re
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _sanitize_db_url(url: str) -> str:
    """
    Fix common DATABASE_URL issues so the app never crashes on bad SSL params.

    Fixes applied:
    - postgres://  → postgresql://   (SQLAlchemy requires the full scheme)
    - sslmode=req  → sslmode=require (Neon/Render sometimes truncate the value)
    - sslmode=required → sslmode=require (some providers use wrong value)
    """
    # 1. Fix scheme
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    # 2. Fix sslmode value — only normalize if it's wrong
    url = re.sub(r'sslmode=required\b', 'sslmode=require', url)
    url = re.sub(r'sslmode=req\b',      'sslmode=require', url)

    return url


_DB_URL = _sanitize_db_url(settings.DATABASE_URL)

# ── Engine ────────────────────────────────────────────────────
engine = create_engine(
    _DB_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,   # Verify connection before using from pool
    echo=settings.APP_DEBUG,  # Log SQL queries in debug mode
)

# ── Session Factory ───────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── FastAPI Dependency ────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    Automatically closes session after request completes.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
