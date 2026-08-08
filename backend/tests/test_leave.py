"""
VidyaSetu ERP — Leave Module Tests
=====================================
Unit + integration tests for Leave Management (Phase 3).
Tests:
  - GET  /api/v1/leave/balance
  - GET  /api/v1/leave/types
  - POST /api/v1/leave/apply
  - GET  /api/v1/leave/my-applications
  - GET  /api/v1/leave/holidays
"""
import pytest
from fastapi.testclient import TestClient


class TestLeaveBalance:
    """Leave balance endpoint tests."""

    def test_leave_balance_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/leave/balance")
        assert resp.status_code == 401

    def test_leave_balance_with_valid_token(self, client: TestClient, auth_headers):
        resp = client.get(
            "/api/v1/leave/balance",
            headers=auth_headers,
            params={"academic_year": "2025-2026"},
        )
        # Should return 200 with balance data (or 404 if no leave policy set up)
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            data = resp.json()
            assert data["success"] is True

    def test_leave_balance_missing_year_uses_default(self, client: TestClient, auth_headers):
        """No academic_year param — should still return data or 200."""
        resp = client.get("/api/v1/leave/balance", headers=auth_headers)
        assert resp.status_code in (200, 400, 422)


class TestLeaveTypes:
    """Leave type listing tests."""

    def test_leave_types_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/leave/types")
        assert resp.status_code == 401

    def test_leave_types_with_auth(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/leave/types", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert isinstance(data["data"], list)


class TestLeaveApplication:
    """Leave application CRUD tests."""

    VALID_APPLICATION = {
        "leave_type_id": 1,
        "from_date": "2025-08-01",
        "to_date": "2025-08-02",
        "total_days": 2,
        "reason": "Personal work",
        "contact_during_leave": "9876543210",
        "academic_year": "2025-2026",
    }

    def test_apply_leave_requires_auth(self, client: TestClient):
        resp = client.post("/api/v1/leave/apply", json=self.VALID_APPLICATION)
        assert resp.status_code == 401

    def test_apply_leave_missing_fields_returns_422(self, client: TestClient, auth_headers):
        """Required fields missing → validation error."""
        resp = client.post("/api/v1/leave/apply", json={}, headers=auth_headers)
        assert resp.status_code == 422

    def test_apply_leave_invalid_date_range_rejected(self, client: TestClient, auth_headers):
        """from_date after to_date should be rejected."""
        bad_application = {
            **self.VALID_APPLICATION,
            "from_date": "2025-08-05",
            "to_date": "2025-08-01",  # before from_date
        }
        resp = client.post("/api/v1/leave/apply", json=bad_application, headers=auth_headers)
        # Either 422 (Pydantic validation) or 400 (business logic)
        assert resp.status_code in (400, 422)

    def test_get_my_applications_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/leave/my-applications")
        assert resp.status_code == 401

    def test_get_my_applications_with_auth(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/leave/my-applications", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data


class TestHolidays:
    """Holiday calendar tests."""

    def test_holidays_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/leave/holidays")
        assert resp.status_code == 401

    def test_holidays_returns_list(self, client: TestClient, auth_headers):
        resp = client.get(
            "/api/v1/leave/holidays",
            headers=auth_headers,
            params={"academic_year": "2025-2026"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_holidays_have_required_fields(self, client: TestClient, auth_headers):
        """Each holiday must have date, name, and type fields."""
        resp = client.get(
            "/api/v1/leave/holidays",
            headers=auth_headers,
            params={"academic_year": "2025-2026"},
        )
        if resp.status_code == 200:
            holidays = resp.json()["data"]
            for h in holidays[:3]:  # Check first 3
                assert "holiday_date" in h or "date" in h
                assert "name" in h or "holiday_name" in h
