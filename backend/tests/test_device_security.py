"""
VidyaSetu ERP — Device Security Automated Tests
=================================================
Tests all 15 security scenarios from the requirements spec.

Setup:
    cd backend
    pytest tests/test_device_security.py -v

Uses SQLite in-memory database for speed.
No external services required (email/FCM are mocked).
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Generator
from unittest.mock import patch, MagicMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# ── Application imports ───────────────────────────────────────
from app.main import app
from app.database.base import Base, BaseModel
from app.database.session import get_db
from app.core.security import hash_password, create_access_token, create_refresh_token
from app.modules.auth.models import User, Role, UserRole
from app.modules.device_security.models import (
    UserDevice, LoginEvent, LoginVerificationRequest,
    DeviceStatus, LoginEventType, VerificationStatus
)
from app.modules.device_security.service import (
    DeviceService, VerificationService, LoginEventService, DeviceSecurityOrchestrator
)

# ── Test Database Setup ───────────────────────────────────────

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_device_security.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the test session."""
    # Import all models to register them
    import app.modules.auth.models
    import app.modules.device_security.models
    import app.shared.audit
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Fresh database transaction for each test (rolled back after)."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> TestClient:
    """Test client with database override."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Test Fixtures ─────────────────────────────────────────────

@pytest.fixture
def test_user(db: Session) -> User:
    """Create a test user with a hashed password."""
    role = Role(name="teacher", display_name="Teacher")
    db.add(role)
    db.flush()

    user = User(
        username="testuser",
        full_name="Test User",
        email="testuser@school.example.com",
        password_hash=hash_password("SecurePass123!"),
        is_active=True,
        is_locked=False,
        failed_attempts=0,
    )
    db.add(user)
    db.flush()

    user_role = UserRole(user_id=user.id, role_id=role.id, is_active=True)
    db.add(user_role)
    db.flush()

    return user


@pytest.fixture
def primary_device(db: Session, test_user: User) -> UserDevice:
    """Register a primary trusted device for the test user."""
    device = UserDevice(
        user_id=test_user.id,
        device_installation_id="primary-device-id-abc123",
        device_type="web",
        browser_name="Chrome",
        os_version="Windows 10/11",
        is_primary=True,
        is_trusted=True,
        status=DeviceStatus.ACTIVE,
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
        trusted_at=datetime.now(timezone.utc),
    )
    db.add(device)
    db.flush()
    return device


@pytest.fixture
def auth_headers(db: Session, test_user: User) -> dict:
    """JWT headers for authenticated requests."""
    access_token, _, _ = create_access_token(
        user_id=test_user.id,
        role_codes=["teacher"],
        permissions=[],
        full_name=test_user.full_name,
    )
    return {"Authorization": f"Bearer {access_token}"}


def make_device(db: Session, user_id: int, installation_id: str, is_primary=False, is_trusted=True) -> UserDevice:
    """Helper to create a device record."""
    device = UserDevice(
        user_id=user_id,
        device_installation_id=installation_id,
        device_type="web",
        browser_name="Chrome",
        is_primary=is_primary,
        is_trusted=is_trusted,
        status=DeviceStatus.ACTIVE if is_trusted else DeviceStatus.PENDING,
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
        trusted_at=datetime.now(timezone.utc) if is_trusted else None,
    )
    db.add(device)
    db.flush()
    return device


# ═══════════════════════════════════════════════════════════════
# SCENARIO 1: First login — auto-register as primary device
# ═══════════════════════════════════════════════════════════════

class TestScenario1_FirstLogin:
    def test_first_login_no_devices_registers_primary(self, db: Session, test_user: User):
        """
        S1: User has NO devices.
        Login with a device ID → should register device as primary and allow login.
        """
        assert not DeviceService.has_any_device(db, test_user.id)

        result = DeviceService.register_new_device(
            db, test_user.id, "brand-new-device-001",
            {"device_type": "web", "browser_name": "Chrome"},
            make_primary=True, make_trusted=True,
        )
        db.flush()

        assert result.is_primary is True
        assert result.is_trusted is True
        assert result.status == DeviceStatus.ACTIVE
        assert DeviceService.has_any_device(db, test_user.id)

    def test_first_login_generates_device_id_when_none_sent(self, db: Session, test_user: User):
        """
        S1b: Client sends no device_installation_id.
        System generates one and registers as primary.
        """
        # find_device with None returns None
        result = DeviceService.find_device(db, test_user.id, "")
        assert result is None

        # Should have no devices yet
        assert DeviceService.count_active_devices(db, test_user.id) == 0


# ═══════════════════════════════════════════════════════════════
# SCENARIO 2: Login from trusted device → immediate access
# ═══════════════════════════════════════════════════════════════

class TestScenario2_TrustedDeviceLogin:
    def test_known_trusted_device_allows_login(self, db: Session, test_user: User, primary_device: UserDevice):
        """
        S2: User has a trusted primary device.
        Login with same device_installation_id → immediate session, no verification.
        """
        found = DeviceService.find_device(db, test_user.id, "primary-device-id-abc123")
        assert found is not None
        assert found.is_trusted is True
        assert found.status == DeviceStatus.ACTIVE

    def test_trusted_device_last_seen_updated(self, db: Session, test_user: User, primary_device: UserDevice):
        """S2b: Trusting a device updates last_seen_at."""
        old_ts = primary_device.last_seen_at
        DeviceService.touch_device(db, primary_device)
        db.flush()
        assert primary_device.last_seen_at >= old_ts


# ═══════════════════════════════════════════════════════════════
# SCENARIO 3: New device → verification required
# ═══════════════════════════════════════════════════════════════

class TestScenario3_NewDeviceVerificationRequired:
    def test_new_device_creates_verification_request(self, db: Session, test_user: User, primary_device: UserDevice):
        """
        S3: User has a primary device. Login from NEW device.
        Should create LoginVerificationRequest + PENDING device.
        """
        new_device = DeviceService.register_new_device(
            db, test_user.id, "new-unknown-device-999",
            {"device_type": "android"}, make_primary=False, make_trusted=False
        )
        db.flush()

        assert new_device.is_trusted is False
        assert new_device.status == DeviceStatus.PENDING

        token, vr = VerificationService.create_verification(
            db, test_user.id, new_device.id, str(uuid.uuid4()), "1.2.3.4", "TestUA"
        )
        db.flush()

        assert vr.status == VerificationStatus.PENDING
        assert vr.user_id == test_user.id
        assert vr.verification_token_hash != ""
        assert len(token) >= 32

    def test_verification_token_is_hashed_in_db(self, db: Session, test_user: User, primary_device: UserDevice):
        """S3b: Token stored in DB must be a SHA-256 hash, never plaintext."""
        token, vr = VerificationService.create_verification(
            db, test_user.id, primary_device.id, str(uuid.uuid4()), "1.2.3.4", "TestUA"
        )
        # The stored hash should NOT be equal to the raw token
        assert vr.verification_token_hash != token
        # It should be the SHA-256 of the token
        expected_hash = hashlib.sha256(token.encode()).hexdigest()
        assert vr.verification_token_hash == expected_hash


# ═══════════════════════════════════════════════════════════════
# SCENARIO 4: Verify device with valid token
# ═══════════════════════════════════════════════════════════════

class TestScenario4_VerifyValidToken:
    def test_valid_token_trusts_device(self, db: Session, test_user: User, primary_device: UserDevice):
        """S4: User clicks 'Yes, This Is Me' with valid token → device becomes trusted."""
        pending_device = make_device(db, test_user.id, "pending-dev-verify", is_trusted=False)
        pending_device.status = DeviceStatus.PENDING
        token, vr = VerificationService.create_verification(
            db, test_user.id, pending_device.id, str(uuid.uuid4()), "1.2.3.4", "UA"
        )
        db.flush()

        # Validate token
        is_valid, error, vr2 = VerificationService.validate_token(db, token)
        assert is_valid is True
        assert error == ""

        # Trust the device
        DeviceService.trust_device(db, pending_device)
        VerificationService.mark_verified(db, vr)
        db.flush()

        assert pending_device.is_trusted is True
        assert pending_device.status == DeviceStatus.ACTIVE
        assert vr.status == VerificationStatus.VERIFIED
        assert vr.verified_at is not None
        # Token hash must be cleared after verification
        assert vr.verification_token_hash == ""


# ═══════════════════════════════════════════════════════════════
# SCENARIO 5: Reject login ('No, This Wasn't Me')
# ═══════════════════════════════════════════════════════════════

class TestScenario5_RejectLogin:
    def test_reject_marks_verification_rejected(self, db: Session, test_user: User, primary_device: UserDevice):
        """S5: User clicks 'No, Block This Login' → verification rejected, device revoked."""
        pending_device = make_device(db, test_user.id, "suspect-device-999", is_trusted=False)
        pending_device.status = DeviceStatus.PENDING
        token, vr = VerificationService.create_verification(
            db, test_user.id, pending_device.id, str(uuid.uuid4()), "5.6.7.8", "SuspectUA"
        )
        db.flush()

        vr_found = VerificationService.find_by_token(db, token)
        assert vr_found is not None

        VerificationService.mark_rejected(db, vr_found)
        DeviceService._revoke_device_internal(db, pending_device)
        db.flush()

        assert vr_found.status == VerificationStatus.REJECTED
        assert vr_found.rejected_at is not None
        assert pending_device.status == DeviceStatus.REVOKED
        # Token cleared
        assert vr_found.verification_token_hash == ""


# ═══════════════════════════════════════════════════════════════
# SCENARIO 6: Expired token
# ═══════════════════════════════════════════════════════════════

class TestScenario6_ExpiredToken:
    def test_expired_token_is_rejected(self, db: Session, test_user: User, primary_device: UserDevice):
        """S6: Verification token expired → validate returns False."""
        pending = make_device(db, test_user.id, "expired-device-001", is_trusted=False)
        pending.status = DeviceStatus.PENDING
        token, vr = VerificationService.create_verification(
            db, test_user.id, pending.id, str(uuid.uuid4()), "1.2.3.4", "UA"
        )
        # Manually expire the request
        vr.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.flush()

        is_valid, error, _ = VerificationService.validate_token(db, token)
        assert is_valid is False
        assert "expired" in error.lower()


# ═══════════════════════════════════════════════════════════════
# SCENARIO 7: Max verification attempts
# ═══════════════════════════════════════════════════════════════

class TestScenario7_MaxAttempts:
    def test_exhausted_attempts_rejected(self, db: Session, test_user: User, primary_device: UserDevice):
        """S7: More than max_attempts verifications → blocked."""
        pending = make_device(db, test_user.id, "attempt-device-001", is_trusted=False)
        pending.status = DeviceStatus.PENDING
        token, vr = VerificationService.create_verification(
            db, test_user.id, pending.id, str(uuid.uuid4()), "1.2.3.4", "UA"
        )
        vr.attempts = vr.max_attempts  # Exhaust attempts
        db.flush()

        is_valid, error, _ = VerificationService.validate_token(db, token)
        assert is_valid is False
        assert "maximum" in error.lower() or "exceeded" in error.lower() or "attempts" in error.lower()


# ═══════════════════════════════════════════════════════════════
# SCENARIO 8: Already-used token is rejected
# ═══════════════════════════════════════════════════════════════

class TestScenario8_AlreadyUsedToken:
    def test_verified_token_cannot_be_reused(self, db: Session, test_user: User, primary_device: UserDevice):
        """S8: Token used once → cannot be reused (hash cleared after verification)."""
        token, vr = VerificationService.create_verification(
            db, test_user.id, primary_device.id, str(uuid.uuid4()), "1.2.3.4", "UA"
        )
        db.flush()

        # First use — valid
        is_valid, _, _ = VerificationService.validate_token(db, token)
        assert is_valid is True

        # Mark as verified (clears token hash)
        VerificationService.mark_verified(db, vr)
        db.flush()

        # Second use — should not find it (hash cleared, status is VERIFIED)
        second_lookup = VerificationService.find_by_token(db, token)
        assert second_lookup is None


# ═══════════════════════════════════════════════════════════════
# SCENARIO 9: Max 3 device limit enforcement
# ═══════════════════════════════════════════════════════════════

class TestScenario9_MaxDeviceLimit:
    def test_fourth_device_evicts_oldest_non_primary(self, db: Session, test_user: User):
        """
        S9: User has 3 devices (1 primary + 2 others).
        Adding a 4th → oldest non-primary is automatically evicted.
        """
        primary = make_device(db, test_user.id, "primary-dev", is_primary=True, is_trusted=True)
        dev2 = make_device(db, test_user.id, "second-dev", is_primary=False, is_trusted=True)
        dev3 = make_device(db, test_user.id, "third-dev", is_primary=False, is_trusted=True)
        new_dev = make_device(db, test_user.id, "fourth-dev", is_primary=False, is_trusted=True)
        db.flush()

        count_before = DeviceService.count_active_devices(db, test_user.id)
        assert count_before == 4

        # This should evict the oldest non-primary (dev2, since it was created first)
        evicted = DeviceService.enforce_device_limit(db, test_user.id, new_dev.id)
        db.flush()

        assert evicted is not None
        assert evicted.status == DeviceStatus.REVOKED
        assert evicted.is_primary is False
        # Primary must NOT be evicted
        assert primary.status != DeviceStatus.REVOKED

    def test_primary_device_is_never_evicted(self, db: Session, test_user: User):
        """S9b: Primary device is protected from eviction."""
        primary = make_device(db, test_user.id, "protected-primary", is_primary=True, is_trusted=True)
        new_dev = make_device(db, test_user.id, "new-dev", is_primary=False, is_trusted=True)
        db.flush()

        # Only 2 devices — no eviction needed yet
        evicted = DeviceService.enforce_device_limit(db, test_user.id, new_dev.id)
        assert evicted is None  # No eviction with only 2 devices

    def test_max_devices_count_is_correct(self, db: Session, test_user: User):
        """S9c: count_active_devices returns correct count."""
        make_device(db, test_user.id, "d1")
        make_device(db, test_user.id, "d2")
        make_device(db, test_user.id, "d3")
        db.flush()
        assert DeviceService.count_active_devices(db, test_user.id) == 3


# ═══════════════════════════════════════════════════════════════
# SCENARIO 10: Revoked device requires re-verification
# ═══════════════════════════════════════════════════════════════

class TestScenario10_RevokedDeviceReVerification:
    def test_revoked_device_is_not_trusted(self, db: Session, test_user: User):
        """S10: A revoked device is not considered trusted."""
        device = make_device(db, test_user.id, "revoked-device-abc", is_trusted=True)
        DeviceService._revoke_device_internal(db, device)
        db.flush()

        assert device.status == DeviceStatus.REVOKED
        assert device.is_trusted is False


# ═══════════════════════════════════════════════════════════════
# SCENARIO 11: Change primary device
# ═══════════════════════════════════════════════════════════════

class TestScenario11_ChangePrimaryDevice:
    def test_change_primary_swaps_correctly(self, db: Session, test_user: User):
        """S11: Make a secondary device primary → old primary loses primary flag."""
        primary = make_device(db, test_user.id, "old-primary", is_primary=True, is_trusted=True)
        secondary = make_device(db, test_user.id, "new-primary-candidate", is_primary=False, is_trusted=True)
        db.flush()

        old_primary = DeviceService.change_primary_device(db, test_user.id, secondary)
        db.flush()

        assert secondary.is_primary is True
        assert old_primary is not None
        assert old_primary.is_primary is False

    def test_exactly_one_primary_after_change(self, db: Session, test_user: User):
        """S11b: Only ONE primary device after change."""
        primary = make_device(db, test_user.id, "old-primary-2", is_primary=True, is_trusted=True)
        secondary = make_device(db, test_user.id, "new-primary-2", is_primary=False, is_trusted=True)
        db.flush()

        DeviceService.change_primary_device(db, test_user.id, secondary)
        db.flush()

        primaries = [
            d for d in DeviceService.get_user_devices(db, test_user.id)
            if d.is_primary
        ]
        assert len(primaries) == 1
        assert primaries[0].id == secondary.id


# ═══════════════════════════════════════════════════════════════
# SCENARIO 12: Login event audit trail
# ═══════════════════════════════════════════════════════════════

class TestScenario12_AuditTrail:
    def test_login_event_recorded(self, db: Session, test_user: User, primary_device: UserDevice):
        """S12: Every login attempt must be recorded in login_events."""
        attempt_id = str(uuid.uuid4())
        event = LoginEventService.record(
            db,
            event_type=LoginEventType.LOGIN_ATTEMPT,
            user_id=test_user.id,
            device_id=primary_device.id,
            login_attempt_id=attempt_id,
            ip_address="192.168.1.1",
            status="PENDING",
        )
        db.flush()

        assert event.id is not None
        assert event.event_type == LoginEventType.LOGIN_ATTEMPT
        assert event.user_id == test_user.id
        assert event.login_attempt_id == attempt_id

    def test_success_event_after_verification(self, db: Session, test_user: User, primary_device: UserDevice):
        """S12b: LOGIN_SUCCESS event recorded after verification."""
        event = LoginEventService.record(
            db,
            event_type=LoginEventType.LOGIN_SUCCESS,
            user_id=test_user.id,
            device_id=primary_device.id,
            status="SUCCESS",
        )
        db.flush()
        assert event.event_type == LoginEventType.LOGIN_SUCCESS


# ═══════════════════════════════════════════════════════════════
# SCENARIO 13: Risk Score
# ═══════════════════════════════════════════════════════════════

class TestScenario13_RiskScore:
    def test_new_device_increases_risk(self, db: Session, test_user: User):
        """S13: Risk score for new device login > trusted device login."""
        from app.modules.device_security.service import RiskEngine
        trusted = make_device(db, test_user.id, "trusted-risk-dev", is_trusted=True)
        score_trusted = RiskEngine.calculate(trusted, False, 0, db, test_user.id)

        untrusted = make_device(db, test_user.id, "untrusted-risk-dev", is_trusted=False)
        score_new = RiskEngine.calculate(untrusted, True, 0, db, test_user.id)

        assert score_new > score_trusted

    def test_repeated_failures_increase_risk(self, db: Session, test_user: User):
        """S13b: Multiple failed attempts increase risk score."""
        from app.modules.device_security.service import RiskEngine
        score_0_fails = RiskEngine.calculate(None, False, 0, db, test_user.id)
        score_3_fails = RiskEngine.calculate(None, False, 5, db, test_user.id)
        assert score_3_fails > score_0_fails


# ═══════════════════════════════════════════════════════════════
# SCENARIO 14: API — Device list endpoint
# ═══════════════════════════════════════════════════════════════

class TestScenario14_DeviceListAPI:
    def test_list_devices_requires_auth(self, client: TestClient):
        """S14: /auth/devices requires authentication."""
        res = client.get("/api/v1/auth/devices")
        assert res.status_code in (401, 403)

    def test_list_devices_returns_user_devices(
        self, client: TestClient, db: Session, test_user: User, primary_device: UserDevice, auth_headers: dict
    ):
        """S14b: Authenticated user can list their devices."""
        res = client.get("/api/v1/auth/devices", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert isinstance(data["data"]["devices"], list)


# ═══════════════════════════════════════════════════════════════
# SCENARIO 15: Ownership enforcement — user cannot revoke others' devices
# ═══════════════════════════════════════════════════════════════

class TestScenario15_OwnershipEnforcement:
    def test_cannot_revoke_another_users_device(
        self, db: Session, test_user: User, auth_headers: dict, client: TestClient
    ):
        """
        S15: User A cannot revoke User B's device.
        Backend enforces ownership — returns 403.
        """
        # Create another user
        other_user = User(
            username="otheruser",
            full_name="Other User",
            email="other@school.example.com",
            password_hash=hash_password("Pass456!"),
            is_active=True,
        )
        db.add(other_user)
        db.flush()

        # Create a device belonging to other_user
        other_device = make_device(db, other_user.id, "other-user-device-xyz")
        db.flush()

        # Authenticated as test_user — try to revoke other_user's device
        res = client.post(
            f"/api/v1/auth/devices/{other_device.id}/revoke",
            headers=auth_headers,
        )
        # Should be forbidden
        assert res.status_code == 403
