"""
VidyaSetu ERP — Test Fixtures (conftest.py)
============================================
Shared fixtures for all tests:
  - In-memory SQLite test database
  - FastAPI TestClient with override DB
  - Pre-seeded admin user
"""
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.base import Base
from app.database.session import get_db
from app.core.security import hash_password, create_access_token
from app.modules.auth.models import User, Role, UserRole

# ── In-Memory SQLite (fast, no external DB needed) ────────────
SQLITE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables before the test session."""
    import app.modules.auth.models
    import app.modules.device_security.models
    import app.modules.leave.models
    import app.modules.lesson_plan.models
    import app.modules.student.models
    import app.modules.teacher.models
    import app.modules.timetable.models
    import app.modules.inventory.models
    import app.modules.library.models
    import app.modules.finance.models
    import app.modules.exam.models
    import app.modules.attendance.models
    import app.modules.communication.models
    import app.modules.transport.models
    import app.modules.video.models
    import app.modules.settings.models
    import app.shared.audit
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Fresh DB session per test function with clean rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(autouse=True)
def override_get_db_dep(db: Session):
    """Ensure get_db is automatically overridden for all tests."""
    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client(db: Session) -> TestClient:
    """FastAPI TestClient with DB override."""
    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token():
    """Seed admin user and return valid JWT access token."""
    db = TestingSessionLocal()
    try:
        role = db.query(Role).filter_by(code="super_admin").first()
        if not role:
            role = Role(name="Super Administrator", code="super_admin", is_system=True)
            db.add(role)
            db.flush()

        user = db.query(User).filter_by(username="admin").first()
        if not user:
            user = User(
                username="admin",
                full_name="System Administrator",
                email="admin@school.example.com",
                password_hash=hash_password("admin123"),
                is_active=True,
                is_locked=False,
            )
            db.add(user)
            db.flush()
            user_role = UserRole(user_id=user.id, role_id=role.id, is_active=True)
            db.add(user_role)
            db.commit()

        token, _, _ = create_access_token(
            user_id=user.id,
            role_codes=["super_admin"],
            permissions=["*"],
            full_name=user.full_name,
        )
        return token
    finally:
        db.close()


@pytest.fixture
def auth_headers(admin_token):
    """HTTP headers with JWT Bearer token."""
    return {"Authorization": f"Bearer {admin_token}"}
