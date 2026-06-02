"""Integration tests for contract-level ranking API."""

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestContractRankingAPI:
    """Test /ranking and /dashboard endpoints."""

    def test_get_ranking_returns_contracts(self, client):
        response = client.post("/api/v1/ranking", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "dragon_tiger"
        assert "rankings" in data
        assert isinstance(data["rankings"], list)
        if data["rankings"]:
            entry = data["rankings"][0]
            assert "contract_code" in entry
            assert "underlying" in entry
            assert "price" in entry
            assert "volume" in entry
            assert "greeks" in entry

    def test_ranking_entries_have_contract_fields(self, client):
        response = client.post("/api/v1/ranking", json={})
        data = response.json()
        if data["rankings"]:
            entry = data["rankings"][0]
            assert "rank" in entry
            assert "contract_code" in entry
            assert "strike" in entry
            assert "option_type" in entry
            assert "price" in entry
            assert "volume" in entry
            assert "oi" in entry
            assert "iv" in entry
            assert "greeks" in entry
            assert "narrative" in entry

    def test_dashboard_returns_stats(self, client):
        response = client.get("/api/v1/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_contracts" in data
        assert "total_volume" in data
        assert "total_premium" in data
        assert "call_put_ratio" in data
        assert "dragon_tiger" in data
        assert "individual" in data
        assert "etf" in data
        assert "premium" in data

    def test_dashboard_lists_have_contract_fields(self, client):
        response = client.get("/api/v1/dashboard")
        data = response.json()
        for key in ["dragon_tiger", "individual", "etf", "premium"]:
            if data[key]:
                entry = data[key][0]
                assert "contract_code" in entry
                assert "leap_cp_ratio" in entry
