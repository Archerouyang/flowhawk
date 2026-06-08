"""Tests for SignalClassifier with injected price data source."""

from datetime import date, timedelta

import polars as pl
import pytest

from src.screening.price_sources import FixedPriceSource
from src.screening.signal_classifier import (
    DetectedSignal,
    SignalClassifier,
    SignalType,
    SymbolMeta,
)


class TestSignalClassifierPriceSource:
    """Price data source injection tests."""

    def _make_anomaly_df(self, symbols: list[str]) -> pl.DataFrame:
        """Build a minimal anomaly DataFrame for testing."""
        records = []
        today = date.today()
        for sym in symbols:
            # Far-dated call to trigger smart_money detector
            records.append(
                {
                    "symbol": sym,
                    "option_type": "C",
                    "strike": 150.0,
                    "expiration": today + timedelta(days=180),
                    "last_price": 145.0,
                    "volume": 5000,
                    "open_interest": 10000,
                    "voi_ratio": 5.0,
                    "delta": 0.5,
                    "gamma": 0.01,
                    "theta": -0.1,
                    "vega": 0.5,
                    "implied_volatility": 0.3,
                    "anomaly_score": 0.8,
                }
            )
            # Add a put to make cp_ratio calculable
            records.append(
                {
                    "symbol": sym,
                    "option_type": "P",
                    "strike": 140.0,
                    "expiration": today + timedelta(days=180),
                    "last_price": 145.0,
                    "volume": 100,
                    "open_interest": 1000,
                    "voi_ratio": 0.5,
                    "delta": -0.3,
                    "gamma": 0.01,
                    "theta": -0.05,
                    "vega": 0.3,
                    "implied_volatility": 0.35,
                    "anomaly_score": 0.3,
                }
            )
        return pl.DataFrame(records)

    def _make_meta(self, symbols: list[str]) -> dict[str, SymbolMeta]:
        return {
            sym: SymbolMeta(
                symbol=sym,
                market_cap=100.0,
                sector="Technology",
                is_etf=False,
                avg_volume_30d=5e6,
            )
            for sym in symbols
        }

    def test_classifier_with_fixed_price_source(self):
        """Injecting FixedPriceSource yields deterministic price_change."""
        symbols = ["AAPL"]
        df = self._make_anomaly_df(symbols)
        meta = self._make_meta(symbols)
        price_source = FixedPriceSource({"AAPL": -0.03})

        classifier = SignalClassifier(
            history_symbols=set(),
            price_source=price_source,
        )
        signals = classifier.classify(df, meta)

        # With price_change=-0.03 (<0), smart_money confidence should be boosted
        assert len(signals) >= 1
        smart = [s for s in signals if s.signal_type == SignalType.SMART_MONEY]
        assert len(smart) == 1
        # Confidence boost: base 0.6 + 0.15 (price_change < 0) + others
        assert smart[0].confidence >= 0.75
        assert "-3.0%" in smart[0].narrative or "-0.03" in smart[0].narrative

    def test_classifier_without_price_source_fails(self):
        """Constructing without price_source should raise a clear error."""
        with pytest.raises(TypeError):
            SignalClassifier(history_symbols=set())
