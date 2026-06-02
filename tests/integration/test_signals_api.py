"""Integration tests for trade signals API."""

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestSignalsAPI:
    """Test /signals endpoint."""

    def test_generate_signals_returns_classified_fields(self, client):
        response = client.post(
            "/api/v1/signals",
            json={"symbols": ["AAPL", "TSLA", "NVDA"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "signals" in data
        assert isinstance(data["signals"], list)

        if data["signals"]:
            sig = data["signals"][0]
            # Basic contract fields
            assert "symbol" in sig
            assert "option_type" in sig
            assert "strike" in sig
            assert "expiration" in sig
            assert "delta" in sig
            assert "gamma" in sig
            assert "theta" in sig
            assert "vega" in sig
            # Classification fields (frontend contract)
            assert "signal_type" in sig
            assert "composite_score" in sig
            assert "tier" in sig
            assert "narrative" in sig
            assert "tags" in sig
            assert isinstance(sig["tags"], list)
            # Meta fields
            assert "asset_type" in sig
            assert "cap_type" in sig
            assert "sector" in sig

    def test_signals_default_symbols(self, client):
        response = client.post("/api/v1/signals", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["count"] >= 0
        assert isinstance(data["signals"], list)

    def test_signals_tier_values(self, client):
        response = client.post(
            "/api/v1/signals",
            json={"symbols": ["AAPL", "TSLA", "SPY", "QQQ"]},
        )
        data = response.json()
        valid_tiers = {"🔴 conviction", "🟠 strong", "🟡 monitor", "⚪ noise"}
        for sig in data["signals"]:
            assert sig["tier"] in valid_tiers

    def test_signals_signal_type_values(self, client):
        response = client.post(
            "/api/v1/signals",
            json={"symbols": ["AAPL", "TSLA", "SPY", "QQQ", "SPCE", "ONDS"]},
        )
        data = response.json()
        valid_types = {
            "smart_money",
            "first_timer",
            "index_hedge",
            "gamma_squeeze",
            "sector_rotation",
        }
        for sig in data["signals"]:
            assert sig["signal_type"] in valid_types
