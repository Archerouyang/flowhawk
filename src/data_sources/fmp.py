"""Financial Modeling Prep API adapter for stock data and news."""

import hashlib
import json
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import polars as pl
import requests
from dotenv import load_dotenv

load_dotenv()


class FMPDataSource:
    """Fetch stock price data and news from FMP."""

    def __init__(
        self, api_key: Optional[str] = None, cache_dir: str = "./data/cache/fmp"
    ):
        self.api_key = api_key or os.getenv("FMP_API_KEY", "")
        if not self.api_key:
            raise ValueError("FMP_API_KEY env var or api_key required")
        self.base_url = "https://financialmodelingprep.com/api/v3"
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, endpoint: str, params: dict) -> Path:
        key = hashlib.sha256(
            json.dumps({"e": endpoint, "p": params}, sort_keys=True).encode()
        ).hexdigest()[:20]
        return self.cache_dir / f"{key}.json"

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict | list:
        params = dict(params or {})
        params["apikey"] = self.api_key

        cache_path = self._cache_path(endpoint, params)
        if cache_path.exists():
            with open(cache_path) as f:
                return json.load(f)

        url = f"{self.base_url}/{endpoint}"
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        with open(cache_path, "w") as f:
            json.dump(data, f)

        return data

    def get_history(
        self,
        symbol: str,
        start: Optional[date] = None,
        end: Optional[date] = None,
    ) -> pl.DataFrame:
        """Fetch daily OHLCV history."""
        if end is None:
            end = date.today()
        if start is None:
            start = end - timedelta(days=180)

        data = self._get(
            f"historical-price-full/{symbol}",
            {"from": start.isoformat(), "to": end.isoformat()},
        )

        if not isinstance(data, dict) or "historical" not in data:
            return pl.DataFrame()

        df = pl.DataFrame(data["historical"])
        df = df.rename(
            {
                "date": "date",
                "open": "open",
                "high": "high",
                "low": "low",
                "close": "close",
                "volume": "volume",
            }
        )
        df = df.with_columns(
            [
                pl.col("date").str.to_date().alias("date"),
                pl.lit(symbol).alias("symbol"),
            ]
        )
        for col in ["open", "high", "low", "close"]:
            df = df.with_columns(pl.col(col).cast(pl.Float64).alias(col))
        df = df.with_columns(pl.col("volume").cast(pl.Int64).alias("volume"))

        return df.sort("date")

    def get_news(
        self,
        symbol: str,
        limit: int = 20,
    ) -> list[dict]:
        """Fetch recent news articles for a symbol."""
        data = self._get(
            "stock_news",
            {"tickers": symbol, "limit": limit},
        )
        return data if isinstance(data, list) else []

    def get_batch_history(
        self,
        symbols: list[str],
        start: Optional[date] = None,
        end: Optional[date] = None,
    ) -> pl.DataFrame:
        """Fetch history for multiple symbols."""
        frames = []
        for sym in symbols:
            df = self.get_history(sym, start, end)
            if not df.is_empty():
                frames.append(df)
        if not frames:
            return pl.DataFrame()
        return pl.concat(frames, how="vertical_relaxed")
