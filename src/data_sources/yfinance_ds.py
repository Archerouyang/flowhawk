"""Yahoo Finance adapter for stock price data."""
from datetime import date, timedelta
from pathlib import Path

import polars as pl
import yfinance as yf

from src.config import get_config


class YFinanceDataSource:
    """Fetch stock OHLCV data from Yahoo Finance."""

    def __init__(self):
        cfg = get_config()
        self.cache_dir = Path(cfg.data_sources.get("yfinance", {}).get("cache_dir", "./data/cache/yahoo"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.period = cfg.data_sources.get("yfinance", {}).get("period", "6mo")
        self.interval = cfg.data_sources.get("yfinance", {}).get("interval", "1d")

    def _cache_path(self, symbol: str, period: str, interval: str) -> Path:
        safe = symbol.replace(".", "_")
        return self.cache_dir / f"{safe}_{period}_{interval}.parquet"

    def get_history(
        self,
        symbol: str,
        period: Optional[str] = None,
        interval: Optional[str] = None,
        use_cache: bool = True,
    ) -> pl.DataFrame:
        """Fetch historical OHLCV as Polars DataFrame.

        Returns columns: date, symbol, open, high, low, close, volume
        """
        period = period or self.period
        interval = interval or self.interval
        cache_path = self._cache_path(symbol, period, interval)

        if use_cache and cache_path.exists():
            return pl.read_parquet(cache_path)

        ticker = yf.Ticker(symbol)
        df_pd = ticker.history(period=period, interval=interval)

        if df_pd.empty:
            return pl.DataFrame()

        # Reset index to get Date as column
        df_pd = df_pd.reset_index()

        # Strip timezone
        if "Date" in df_pd.columns:
            df_pd["Date"] = df_pd["Date"].dt.tz_localize(None)
        elif "Datetime" in df_pd.columns:
            df_pd["Date"] = df_pd["Datetime"].dt.tz_localize(None)
            df_pd = df_pd.drop(columns=["Datetime"])

        # Rename columns
        df_pd = df_pd.rename(
            columns={
                "Date": "date",
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume",
            }
        )
        df_pd["symbol"] = symbol

        # Select only needed columns
        cols = ["date", "symbol", "open", "high", "low", "close", "volume"]
        df_pd = df_pd[[c for c in cols if c in df_pd.columns]]

        df = pl.from_pandas(df_pd)

        # Cast types
        df = df.with_columns([
            pl.col("date").cast(pl.Date).alias("date"),
            pl.col("volume").cast(pl.Int64).alias("volume"),
        ])
        for col in ["open", "high", "low", "close"]:
            if col in df.columns:
                df = df.with_columns(pl.col(col).cast(pl.Float64).alias(col))

        if use_cache:
            df.write_parquet(cache_path)

        return df

    def get_batch_history(
        self,
        symbols: list[str],
        period: Optional[str] = None,
    ) -> pl.DataFrame:
        """Fetch history for multiple symbols, concatenated."""
        frames = []
        for sym in symbols:
            df = self.get_history(sym, period=period)
            if not df.is_empty():
                frames.append(df)
        if not frames:
            return pl.DataFrame()
        return pl.concat(frames, how="vertical_relaxed")


def get_yfinance() -> YFinanceDataSource:
    return YFinanceDataSource()
