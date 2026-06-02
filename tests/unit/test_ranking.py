"""Unit tests for contract-level ranking generator."""

from datetime import date

import pytest

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.ranking import generate_contract_rankings


class TestContractRankingGenerator:
    """Test contract-level ranking generation."""

    @pytest.fixture
    def rankings(self):
        symbols = ["AAPL", "MSFT", "NVDA", "SPCE", "ONDS", "SMH", "XLF"]
        snapshot = generate_options_snapshot(
            symbols, date(2026, 6, 1), num_contracts_per_symbol=30
        )
        meta = generate_symbol_meta(symbols)
        return generate_contract_rankings(snapshot, meta)

    def test_returns_four_categories(self, rankings):
        assert set(rankings.keys()) == {"dragon_tiger", "individual", "etf", "premium"}

    def test_dragon_tiger_has_up_to_25(self, rankings):
        assert len(rankings["dragon_tiger"]) <= 25
        assert len(rankings["dragon_tiger"]) > 0

    def test_each_entry_is_contract_level(self, rankings):
        for cat, entries in rankings.items():
            for e in entries:
                assert e.contract_code
                assert e.strike > 0
                assert e.option_type in ("C", "P")
                assert e.volume >= 0
                assert e.last_price >= 0
                assert e.high >= e.low

    def test_individual_only_stocks(self, rankings):
        for e in rankings["individual"]:
            assert not e.is_etf

    def test_etf_only_etfs(self, rankings):
        for e in rankings["etf"]:
            assert e.is_etf

    def test_ranking_is_sorted_by_volume_desc(self, rankings):
        for cat in ["dragon_tiger", "individual", "etf"]:
            entries = rankings[cat]
            volumes = [e.volume for e in entries]
            assert volumes == sorted(volumes, reverse=True)

    def test_premium_is_sorted_by_premium_desc(self, rankings):
        entries = rankings["premium"]
        premiums = [e.premium for e in entries]
        assert premiums == sorted(premiums, reverse=True)

    def test_entries_have_greeks(self, rankings):
        for cat, entries in rankings.items():
            for e in entries:
                assert e.delta is not None
                assert e.gamma is not None
                assert e.theta is not None
                assert e.vega is not None

    def test_contract_code_format(self, rankings):
        for cat, entries in rankings.items():
            for e in entries:
                # e.g. AAPL260618C185
                assert e.underlying in e.contract_code
                assert e.option_type in e.contract_code
