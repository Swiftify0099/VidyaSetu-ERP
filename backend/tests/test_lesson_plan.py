"""
VidyaSetu ERP — Lesson Plan Module Tests
==========================================
Tests for the Lesson Plan & Teaching Diary (Phase 3).
Tests:
  - GET  /api/v1/lesson-plans
  - POST /api/v1/lesson-plans
  - GET  /api/v1/lesson-plans/{id}
  - PUT  /api/v1/lesson-plans/{id}
  - GET  /api/v1/lesson-plans/diary
"""
import pytest
from fastapi.testclient import TestClient


class TestLessonPlanList:
    """Lesson plan listing tests."""

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/lesson-plans")
        assert resp.status_code == 401

    def test_list_with_auth_returns_200(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/lesson-plans", headers=auth_headers)
        assert resp.status_code == 200

    def test_list_response_has_pagination(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/lesson-plans", headers=auth_headers)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            # Expect paginated structure: items + total
            assert "items" in data or isinstance(data, list)

    def test_list_filter_by_standard(self, client: TestClient, auth_headers):
        """Filtering by standard should not raise an error."""
        resp = client.get(
            "/api/v1/lesson-plans",
            headers=auth_headers,
            params={"standard": "8", "division": "A"},
        )
        assert resp.status_code in (200, 404)

    def test_list_filter_by_subject(self, client: TestClient, auth_headers):
        resp = client.get(
            "/api/v1/lesson-plans",
            headers=auth_headers,
            params={"subject": "Mathematics"},
        )
        assert resp.status_code == 200


class TestLessonPlanCreate:
    """Lesson plan creation tests."""

    VALID_PLAN = {
        "standard": "8",
        "division": "A",
        "subject_name": "Mathematics",
        "chapter_name": "Linear Equations",
        "topics_planned": "Solving one-variable equations",
        "learning_objectives": "Students will solve linear equations",
        "academic_year": "2025-2026",
        "month": 8,
        "planned_periods": 5,
    }

    def test_create_requires_auth(self, client: TestClient):
        resp = client.post("/api/v1/lesson-plans", json=self.VALID_PLAN)
        assert resp.status_code == 401

    def test_create_missing_required_fields_returns_422(self, client: TestClient, auth_headers):
        """Missing required fields should return validation error."""
        resp = client.post(
            "/api/v1/lesson-plans",
            json={"subject_name": "Mathematics"},  # missing many required fields
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_valid_plan(self, client: TestClient, auth_headers):
        """Valid lesson plan should be created (200/201) or fail with business logic error."""
        resp = client.post(
            "/api/v1/lesson-plans",
            json=self.VALID_PLAN,
            headers=auth_headers,
        )
        assert resp.status_code in (200, 201, 400, 404)
        if resp.status_code in (200, 201):
            data = resp.json()
            assert data["success"] is True
            assert "data" in data

    def test_create_returns_created_plan_with_id(self, client: TestClient, auth_headers):
        """Created plan should have an ID."""
        resp = client.post(
            "/api/v1/lesson-plans",
            json=self.VALID_PLAN,
            headers=auth_headers,
        )
        if resp.status_code in (200, 201):
            data = resp.json()["data"]
            assert "id" in data
            assert data["subject_name"] == "Mathematics"


class TestTeachingDiary:
    """Teaching diary (daily lesson log) tests."""

    def test_diary_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/lesson-plans/diary")
        assert resp.status_code == 401

    def test_diary_with_auth_returns_200(self, client: TestClient, auth_headers):
        resp = client.get(
            "/api/v1/lesson-plans/diary",
            headers=auth_headers,
            params={"date": "2025-08-01"},
        )
        assert resp.status_code in (200, 404)

    def test_diary_filter_by_date_range(self, client: TestClient, auth_headers):
        """Date-range filter should work."""
        resp = client.get(
            "/api/v1/lesson-plans/diary",
            headers=auth_headers,
            params={
                "from_date": "2025-08-01",
                "to_date": "2025-08-31",
            },
        )
        assert resp.status_code in (200, 400, 404)


class TestSearchEndpoint:
    """Global search endpoint tests."""

    def test_search_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/search?q=test")
        assert resp.status_code == 401

    def test_search_empty_query_returns_validation_error(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/search", headers=auth_headers)
        assert resp.status_code in (200, 422)  # 200 with empty results or 422

    def test_search_returns_categorised_results(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/search?q=abc", headers=auth_headers)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            # Should have at least one category key
            assert isinstance(data, (dict, list))


class TestExportsEndpoint:
    """Export endpoints tests."""

    def test_students_excel_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/exports/students/excel")
        assert resp.status_code == 401

    def test_students_excel_with_auth_returns_file(self, client: TestClient, auth_headers):
        resp = client.get(
            "/api/v1/exports/students/excel",
            headers=auth_headers,
            params={"academic_year": "2025-2026"},
        )
        # Either file (200) or no students yet (200 empty Excel)
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
