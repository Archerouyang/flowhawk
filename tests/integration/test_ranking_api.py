"""Integration tests for ranking API."""

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestRankingAPI:
    """Test /ranking and /dashboard endpoints."""

    def test_get_ranking_returns_big_cap_default(self, client):
        response = client.post("/api/v1/ranking", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "big_cap"
        assert "rankings" in data
        assert isinstance(data["rankings"], list)

    def test_get_ranking_small_cap(self, client):
        response = client.post("/api/v1/ranking", json={"category": "small_cap"})
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "small_cap"
        assert len(data["rankings"]) <= 30

    def test_get_ranking_etf(self, client):
        response = client.post("/api/v1/ranking", json={"category": "etf"})
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "etf"

    def test_ranking_entries_have_required_fields(self, client):
        response = client.post("/api/v1/ranking", json={"category": "big_cap"})
        data = response.json()
        if data["rankings"]:
            entry = data["rankings"][0]
            assert "rank" in entry
            assert "symbol" in entry
            assert "anomaly_score" in entry
            assert "narrative" in entry
            assert "top_factors" in entry

    def test_dashboard_returns_stats(self, client):
        response = client.get("/api/v1/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_symbols" in data
        assert "big_cap_count" in data
        assert "small_cap_count" in data
        assert "etf_count" in data
        assert "avg_score_big_cap" in data

    def test_dashboard_top_entries(self, client):
        response = client.get("/api/v1/dashboard")
        data = response.json()
        assert "top_big_cap" in data
        assert "top_small_cap" in data
        assert "top_etf" in data
