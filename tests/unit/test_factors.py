"""Unit tests for factor engine."""

from datetime import date

import pytest

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.factors import compute_all_factors


class TestFactorEngine:
    """Test factor computation."""

    @pytest.fixture
    def snapshot(self):
        symbols = ["AAPL", "TSLA", "SPCE", "SMH"]
        return generate_options_snapshot(symbols, date(2026, 6, 1))

    @pytest.fixture
    def meta(self):
        return generate_symbol_meta(["AAPL", "TSLA", "SPCE", "SMH"])

    def test_compute_returns_all_symbols(self, snapshot, meta):
        result = compute_all_factors(snapshot, meta)
        assert set(result.keys()) == {"AAPL", "TSLA", "SPCE", "SMH"}

    def test_factors_include_all_categories(self, snapshot, meta):
        result = compute_all_factors(snapshot, meta)
        aapl_factors = result["AAPL"]

        # Options core
        assert "volume_cp_ratio" in aapl_factors
        assert "leap_volume_cp_ratio" in aapl_factors
        assert "delta" in aapl_factors

        # Value
        assert "pe_ttm" in aapl_factors
        assert "roe" in aapl_factors

        # Macro
        assert "vix_level" in aapl_factors

        # Fama-French
        assert "smb" in aapl_factors

        # News
        assert "news_sentiment_score" in aapl_factors

    def test_big_cap_has_different_values_than_small_cap(self, snapshot, meta):
        result = compute_all_factors(snapshot, meta)

        # AAPL is big_cap, SPCE is small_cap
        assert meta["AAPL"].category == "big_cap"
        assert meta["SPCE"].category == "small_cap"

        # Big cap should have higher ROE (more stable in our mock)
        assert result["AAPL"]["roe"] > result["SPCE"]["roe"]

    def test_cp_ratio_is_positive(self, snapshot, meta):
        result = compute_all_factors(snapshot, meta)
        for sym, factors in result.items():
            assert factors["volume_cp_ratio"] >= 0
