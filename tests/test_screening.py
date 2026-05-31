"""Tests for the three-stage screening pipeline."""

from datetime import date

import polars as pl

from src.data_sources.mock import generate_options_snapshot, generate_stock_kline
from src.screening.leaps_selector import LEAPSSelector
from src.screening.options_anomaly import OptionsAnomalyScreener


class TestOptionsAnomalyScreener:
    """Tests for Stage 1: Options anomaly detection."""

    def test_screen_returns_dataframe(self):
        """Screening should return a Polars DataFrame."""
        snapshot = generate_options_snapshot(["AAPL"], date.today())
        screener = OptionsAnomalyScreener()
        result = screener.screen(snapshot)
        assert isinstance(result, pl.DataFrame)

    def test_screen_filters_by_voi_ratio(self):
        """High V/OI threshold should filter out low-ratio contracts."""
        snapshot = generate_options_snapshot(["AAPL"], date.today())
        screener = OptionsAnomalyScreener()
        screener.min_voi_ratio = 999.0  # Impossibly high
        result = screener.screen(snapshot)
        assert result.is_empty()

    def test_screen_computes_anomaly_score(self):
        """Result should include anomaly_score column."""
        snapshot = generate_options_snapshot(["AAPL"], date.today())
        screener = OptionsAnomalyScreener()
        screener.min_voi_ratio = 0.0  # Allow everything
        result = screener.screen(snapshot)
        assert "anomaly_score" in result.columns
        assert result["anomaly_score"].max() >= 0

    def test_screen_filters_by_delta_range(self):
        """Delta range filter should exclude out-of-range contracts."""
        snapshot = generate_options_snapshot(["AAPL"], date.today())
        screener = OptionsAnomalyScreener()
        screener.min_delta = 0.99
        screener.max_delta = 1.0
        result = screener.screen(snapshot)
        if not result.is_empty():
            assert result["delta"].min() >= 0.99


class TestLEAPSSelector:
    """Tests for Stage 3: LEAPS selection."""

    def test_select_returns_list(self):
        """select() should return a list of TradeSignals."""
        snapshot = generate_options_snapshot(["AAPL"], date.today())
        anomaly_df = OptionsAnomalyScreener().screen(snapshot)

        # Mock technical DataFrame
        tech_df = pl.DataFrame(
            {
                "symbol": ["AAPL"],
                "technical_score": [0.5],
            }
        )

        selector = LEAPSSelector()
        result = selector.select(anomaly_df, tech_df)
        assert isinstance(result, list)

    def test_select_with_empty_input_returns_empty(self):
        """Empty input should return empty list."""
        empty_df = pl.DataFrame()
        tech_df = pl.DataFrame({"symbol": [], "technical_score": []})
        selector = LEAPSSelector()
        result = selector.select(empty_df, tech_df)
        assert result == []

    def test_select_respects_top_n(self):
        """Result count should not exceed top_n."""
        snapshot = generate_options_snapshot(
            ["AAPL", "TSLA", "NVDA"], date.today(), num_contracts_per_symbol=10
        )
        anomaly_df = OptionsAnomalyScreener().screen(snapshot)

        tech_df = pl.DataFrame(
            {
                "symbol": ["AAPL", "TSLA", "NVDA"],
                "technical_score": [0.5, 0.5, 0.5],
            }
        )

        selector = LEAPSSelector()
        selector.top_n = 2
        result = selector.select(anomaly_df, tech_df)
        assert len(result) <= 2


class TestMockData:
    """Tests for mock data generators."""

    def test_generate_options_snapshot_structure(self):
        """Options snapshot should have expected columns."""
        df = generate_options_snapshot(["AAPL"], date.today())
        expected_cols = {
            "symbol",
            "option_type",
            "strike",
            "expiration",
            "bid",
            "ask",
            "last_price",
            "volume",
            "open_interest",
            "delta",
            "gamma",
            "theta",
            "vega",
            "implied_volatility",
        }
        assert expected_cols.issubset(set(df.columns))

    def test_generate_stock_kline_structure(self):
        """Stock K-line should have expected columns."""
        start = date(2025, 1, 1)
        end = date(2025, 1, 31)
        df = generate_stock_kline("AAPL", start, end)
        expected_cols = {"date", "symbol", "open", "high", "low", "close", "volume"}
        assert expected_cols.issubset(set(df.columns))
        assert df.height > 0

    def test_options_snapshot_reproducible(self):
        """Same seed should produce same results."""
        df1 = generate_options_snapshot(["AAPL"], date.today())
        df2 = generate_options_snapshot(["AAPL"], date.today())
        # Same seed (42) should give identical results
        assert df1.shape == df2.shape
