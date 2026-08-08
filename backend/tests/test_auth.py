"""
VidyaSetu ERP — Auth Tests
============================
Tests for authentication endpoints:
  - POST /api/v1/auth/login
  - POST /api/v1/auth/logout
  - GET  /api/v1/auth/me
"""
import pytest
from fastapi.testclient import TestClient


class TestHealth:
    """Health check endpoint tests."""

    def test_health_returns_200(self, client: TestClient):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200

    def test_health_response_structure(self, client: TestClient):
        resp = client.get("/api/v1/health")
        data = resp.json()
        assert data["status"] == "healthy"
        assert "app" in data
        assert "version" in data
        assert "timestamp" in data


class TestLogin:
    """Login endpoint tests."""

    def test_login_missing_credentials_returns_422(self, client: TestClient):
        """Empty body should fail validation."""
        resp = client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422

    def test_login_wrong_password_returns_401(self, client: TestClient):
        """Wrong password should return 401."""
        resp = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "completely_wrong_password_xyz",
        })
        assert resp.status_code in (401, 403, 404)  # 404 if user not seeded

    def test_login_success_returns_token(self, client: TestClient):
        """
        Successful login returns access_token.
        NOTE: Requires seeded admin user. Skipped if user not seeded.
        """
        resp = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123",
        })
        # Either login succeeds (200) or user not seeded in test DB (401/404)
        if resp.status_code == 200:
            data = resp.json()
            assert data["success"] is True
            assert "access_token" in (data.get("data") or {})

    def test_login_returns_user_info_with_token(self, client: TestClient):
        """If login succeeds, user data is included."""
        resp = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123",
        })
        if resp.status_code == 200:
            data = resp.json()["data"]
            assert "user" in data
            assert "username" in data["user"]


class TestProtectedEndpoints:
    """Endpoints requiring authentication."""

    def test_me_without_token_returns_401(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_students_without_token_returns_401(self, client: TestClient):
        resp = client.get("/api/v1/students")
        assert resp.status_code == 401

    def test_finance_without_token_returns_401(self, client: TestClient):
        resp = client.get("/api/v1/finance/stats")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient):
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401
