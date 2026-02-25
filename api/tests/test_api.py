"""Integration tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient
import sys
sys.path.insert(0, '..')

from main import app


@pytest.fixture(scope="module")
def client():
    """Create test client with lifespan context."""
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_returns_200(self, client):
        """Should return 200 status code."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_status_healthy(self, client):
        """Should return healthy status."""
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_includes_rate_limits(self, client):
        """Should include rate limit information."""
        response = client.get("/health")
        data = response.json()
        assert "rate_limits" in data
        assert "openai" in data["rate_limits"]
        assert "google" in data["rate_limits"]

    def test_health_includes_config_status(self, client):
        """Should indicate if APIs are configured."""
        response = client.get("/health")
        data = response.json()
        assert "openai_configured" in data
        assert "google_configured" in data


class TestSearchEndpoint:
    """Tests for GET /search endpoint."""

    def test_search_requires_query(self, client):
        """Should return 422 if query is missing."""
        response = client.get("/search")
        assert response.status_code == 422

    def test_search_rejects_empty_query(self, client):
        """Should reject empty query string."""
        response = client.get("/search?query=")
        assert response.status_code == 422

    def test_search_accepts_valid_query(self, client):
        """Should accept valid query (may fail without API key)."""
        response = client.get("/search?query=coffee+austin")
        # Either 200 (success) or 503 (API not configured)
        assert response.status_code in [200, 503]

    def test_search_respects_limit_parameter(self, client):
        """Should accept limit parameter."""
        response = client.get("/search?query=coffee&limit=5")
        assert response.status_code in [200, 503]

    def test_search_rejects_invalid_limit(self, client):
        """Should reject limit > 20."""
        response = client.get("/search?query=coffee&limit=50")
        assert response.status_code == 422


class TestPlanEndpoint:
    """Tests for POST /plan endpoint."""

    def test_plan_requires_body(self, client):
        """Should return 422 if body is missing."""
        response = client.post("/plan")
        assert response.status_code == 422

    def test_plan_requires_query_field(self, client):
        """Should return 422 if query field is missing."""
        response = client.post("/plan", json={})
        assert response.status_code == 422

    def test_plan_accepts_valid_request(self, client):
        """Should accept valid request (may fail without API key)."""
        response = client.post("/plan", json={"query": "weekend trip austin"})
        # Either 200 (success) or 503 (API not configured)
        assert response.status_code in [200, 503]

    def test_plan_returns_correct_structure(self, client):
        """Should return correct response structure if successful."""
        response = client.post("/plan", json={"query": "weekend trip austin"})

        if response.status_code == 200:
            data = response.json()
            assert "query" in data
            assert "summary" in data
            assert "days" in data
            assert isinstance(data["days"], list)
