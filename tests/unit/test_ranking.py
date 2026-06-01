"""Unit tests for ranking generator."""

from datetime import date

import pytest

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.factors import compute_all_factors
from src.ranking import generate_daily_rankings
from src.scoring import compute_anomaly_scores


class TestRankingGenerator:
    """Test anomaly ranking generation."""

    @pytest.fixture
    def rankings(self):
        symbols = ["AAPL", "MSFT", "NVDA", "SPCE", "ONDS", "SMH", "XLF"]
        snapshot = generate_options_snapshot(symbols, date(2026, 6, 1))
        meta = generate_symbol_meta(symbols)
        factor_map = compute_all_factors(snapshot, meta)
        scores = compute_anomaly_scores(factor_map)
        return generate_daily_rankings(scores, meta, factor_map)

    def test_returns_three_categories(self, rankings):
        assert set(rankings.keys()) == {"big_cap", "small_cap", "etf"}

    def test_each_category_has_entries(self, rankings):
        for cat, entries in rankings.items():
            assert len(entries) > 0, f"{cat} should have entries"

    def test_top_30_limit(self, rankings):
        for entries in rankings.values():
            assert len(entries) <= 30

    def test_ranking_is_sorted_descending(self, rankings):
        for entries in rankings.values():
            scores = [e.anomaly_score for e in entries]
            assert scores == sorted(scores, reverse=True)

    def test_entries_have_narrative(self, rankings):
        for entries in rankings.values():
            for e in entries:
                assert e.narrative
                assert e.symbol
                assert e.anomaly_score >= 0
