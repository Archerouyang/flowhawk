"""Tests for SignalBuilder — domain logic extracted from signals route."""

from datetime import date

import polars as pl
import pytest

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.screening.options_anomaly import OptionsAnomalyScreener
from src.screening.price_sources import FixedPriceSource
from src.screening.signal_builder import SignalBuilder
from src.screening.signal_classifier import SignalClassifier


class TestSignalBuilderMatchesRoute:
    """SignalBuilder output must match the legacy route logic."""

    def test_builder_output_matches_route_fields(self):
        """SignalBuilder produces the same signal structure as the route."""
        symbols = ["AAPL", "TSLA"]
        snapshot = generate_options_snapshot(symbols, date.today(), num_contracts_per_symbol=30)
        anomaly_df = OptionsAnomalyScreener().screen(snapshot)
        meta_map = generate_symbol_meta(symbols)

        # Use FixedPriceSource for determinism
        price_source = FixedPriceSource({"AAPL": -0.03, "TSLA": 0.05})
        classifier = SignalClassifier(
            price_source=price_source,
            history_symbols=set(),
        )
        detected_signals = classifier.classify(anomaly_df, meta_map)
        sym_stats = classifier._aggregate_symbol_stats(anomaly_df)

        # Build lookup: symbol -> highest-volume anomaly row (same as route)
        anomaly_by_sym: dict[str, dict] = {}
        for row in anomaly_df.to_dicts():
            sym = row["symbol"]
            if sym not in anomaly_by_sym or row["volume"] > anomaly_by_sym[sym]["volume"]:
                anomaly_by_sym[sym] = row

        builder = SignalBuilder()
        built = builder.build(
            detected_signals=detected_signals,
            anomaly_by_sym=anomaly_by_sym,
            meta_map=meta_map,
            sym_stats=sym_stats,
            lb_data={},
        )

        assert isinstance(built, list)
        for sig in built:
            assert "symbol" in sig
            assert "option_type" in sig
            assert "strike" in sig
            assert "expiration" in sig
            assert "last_price" in sig
            assert "delta" in sig
            assert "gamma" in sig
            assert "theta" in sig
            assert "vega" in sig
            assert "implied_volatility" in sig
            assert "voi_ratio" in sig
            assert "leaps_score" in sig
            assert "theta_price_ratio" in sig
            assert "dte" in sig
            assert "signal_type" in sig
            assert "composite_score" in sig
            assert "tier" in sig
            assert "narrative" in sig
            assert "tags" in sig
            assert "asset_type" in sig
            assert "cap_type" in sig
            assert "sector" in sig
            assert "call_volume" in sig
            assert "put_volume" in sig
            assert "stock_change_pct" in sig
            assert "stock_price" in sig

    def test_builder_tier_computation(self):
        """Tier mapping matches route logic."""
        builder = SignalBuilder()
        assert builder._compute_tier(90) == "🔴 conviction"
        assert builder._compute_tier(85) == "🔴 conviction"
        assert builder._compute_tier(84) == "🟠 strong"
        assert builder._compute_tier(70) == "🟠 strong"
        assert builder._compute_tier(69) == "🟡 monitor"
        assert builder._compute_tier(55) == "🟡 monitor"
        assert builder._compute_tier(54) == "⚪ noise"
        assert builder._compute_tier(0) == "⚪ noise"

    def test_builder_cap_type(self):
        """Cap type mapping matches route logic."""
        builder = SignalBuilder()
        assert builder._cap_type_from_market_cap(50.0) == "LARGE"
        assert builder._cap_type_from_market_cap(100.0) == "LARGE"
        assert builder._cap_type_from_market_cap(49.9) == "GROWTH"
        assert builder._cap_type_from_market_cap(1.0) == "GROWTH"

    def test_builder_tags_smart_money(self):
        """Tags for smart_money signal match route logic."""
        from src.screening.signal_classifier import DetectedSignal, SignalType

        builder = SignalBuilder()
        detected = DetectedSignal(
            symbol="AAPL",
            signal_type=SignalType.SMART_MONEY,
            contract_desc="260618.C.150",
            dte=180,
            strike_distance_pct=0.03,
            cp_ratio=6.0,
            leap_ratio=12.0,
            narrative="test",
            confidence=0.8,
        )
        stats = {"leap_ratio": 12.0, "price_change_day": -0.02}
        tags = builder._build_tags(detected, stats)
        assert "LEAPS call rate > 10x" in tags
        assert "Down day + call build" in tags

    def test_builder_tags_first_timer(self):
        """Tags for first_timer signal match route logic."""
        from src.screening.signal_classifier import DetectedSignal, SignalType

        builder = SignalBuilder()
        detected = DetectedSignal(
            symbol="SPCE",
            signal_type=SignalType.FIRST_TIMER,
            contract_desc="260618.C.5",
            dte=180,
            strike_distance_pct=0.1,
            cp_ratio=25.0,
            leap_ratio=25.0,
            narrative="test",
            confidence=0.8,
        )
        stats = {"leap_ratio": 25.0, "price_change_day": 0.0}
        tags = builder._build_tags(detected, stats)
        assert "First appearance" in tags
        assert "LEAPS call rate > 20x" in tags
        assert "Small cap" in tags
