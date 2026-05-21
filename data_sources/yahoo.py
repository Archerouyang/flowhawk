"""Yahoo Finance data adapter."""
import yfinance as yf
import pandas as pd
from pathlib import Path
import pickle


class YahooDataSource:
    """Fetch historical price data from Yahoo Finance."""

    def __init__(self, cache_dir: str = "./data/cache/yahoo"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    _CACHE_VERSION = "v1"  # bump when serialization format changes

    def _cache_path(self, symbol: str, period: str, interval: str) -> Path:
        safe = symbol.replace('.', '_')
        return self.cache_dir / f"{safe}_{period}_{interval}_{self._CACHE_VERSION}.pkl"

    def history(
        self,
        symbol: str,
        period: str = "2y",
        interval: str = "1d",
        use_cache: bool = True,
    ) -> pd.DataFrame:
        """Fetch historical OHLCV data.

        Args:
            symbol: Yahoo ticker, e.g. TSLA, ^GSPC
            period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
            interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
        """
        cache_path = self._cache_path(symbol, period, interval)
        if use_cache and cache_path.exists():
            with open(cache_path, "rb") as f:
                return pickle.load(f)

        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        # Strip timezone if present; safe for already-naive indices
        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)

        if use_cache:
            with open(cache_path, "wb") as f:
                pickle.dump(df, f)

        return df

    def info(self, symbol: str) -> dict:
        ticker = yf.Ticker(symbol)
        return ticker.info
