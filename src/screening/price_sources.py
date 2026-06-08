"""Price data source adapters for SignalClassifier."""

from __future__ import annotations

from src.screening.signal_classifier import PriceDataSource


class FixedPriceSource:
    """Test-only price source returning pre-configured fixed values."""

    def __init__(self, changes: dict[str, float]) -> None:
        self._changes = changes

    def get_change(self, symbol: str) -> float:
        return self._changes.get(symbol, 0.0)


class YfinancePriceSource:
    """Production price source backed by yfinance.

    # TODO(debt): yfinance is not a real-time data source and introduces
    #   network latency per symbol. Replace with a streaming or batched
    #   quote provider (Theta Data, Polygon, Longbridge REST) once
    #   credentials and rate limits are confirmed. — 2026-06-08
    """

    def __init__(self) -> None:
        # Lazy import to avoid heavy dependency at module load time
        self._yf = None

    def get_change(self, symbol: str) -> float:
        """Fetch daily price change from yfinance.

        Falls back to 0.0 if the ticker is unavailable.
        """
        if self._yf is None:
            import yfinance as yf  # type: ignore[import-untyped]

            self._yf = yf

        ticker = self._yf.Ticker(symbol)
        hist = ticker.history(period="2d")
        if hist is None or len(hist) < 2:
            return 0.0
        prev_close = float(hist["Close"].iloc[-2])
        last_close = float(hist["Close"].iloc[-1])
        if prev_close == 0:
            return 0.0
        return (last_close - prev_close) / prev_close
