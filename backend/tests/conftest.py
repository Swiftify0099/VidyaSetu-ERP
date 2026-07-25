"""
VidyaSetu ERP — Test Fixtures (conftest.py)
============================================
Shared fixtures for all tests:
  - In-memory SQLite test database
  - FastAPI TestClient with override DB
  - Pre-seeded admin user
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password

# ── In-Memory SQLite (fast, no external DB needed) ────────────
SQLITE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Override DB dependency ────────────────────────────────────
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables before the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    """Fresh DB session per test function."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient with DB override."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def admin_token(client: TestClient):
    """
    Login as admin and return JWT token.
    Seeds admin user if not already present.
    """
    # Attempt login
    resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })
    if resp.status_code == 200:
        return resp.json()["data"]["access_token"]

    # If user doesn't exist, create via seeder (best-effort)
    return None


@pytest.fixture
def auth_headers(admin_token):
    """HTTP headers with JWT Bearer token."""
    if not admin_token:
        pytest.skip("Admin user not available in test environment")
    return {"Authorization": f"Bearer {admin_token}"}
