"""Theta Data API adapter for options data."""
import hashlib
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import polars as pl
import requests

from src.config import get_config


class ThetaDataSource:
    """Wraps Theta Data REST API to fetch options snapshots."""

    def __init__(self):
        cfg = get_config()
        self.base_url = cfg.data_sources.get("theta_data", {}).get("base_url", "https://api.thetadata.net")
        self.cache_dir = Path(cfg.data_sources.get("theta_data", {}).get("cache_dir", "./data/cache/theta"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.user = cfg.theta_user
        self.password = cfg.theta_pass
        self._token: Optional[str] = None

    def _auth(self) -> str:
        """Obtain JWT token."""
        if self._token:
            return self._token
        resp = requests.post(
            f"{self.base_url}/v1/auth/login",
            json={"username": self.user, "password": self.password},
            timeout=30,
        )
        resp.raise_for_status()
        self._token = resp.json()["token"]
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._auth()}", "Content-Type": "application/json"}

    def _cache_path(self, key: str) -> Path:
        h = hashlib.sha256(key.encode()).hexdigest()[:16]
        return self.cache_dir / f"{h}.parquet"

    def get_options_snapshot(
        self,
        snapshot_date: Optional[date] = None,
        symbols: Optional[list[str]] = None,
        use_cache: bool = True,
    ) -> pl.DataFrame:
        """Fetch EOD options snapshot.

        Args:
            snapshot_date: Date to fetch. Defaults to last trading day.
            symbols: List of underlying symbols. If None, fetches full market.
            use_cache: Use local parquet cache.

        Returns:
            Polars DataFrame with columns:
            symbol, option_type, strike, expiration, bid, ask, last_price,
            volume, open_interest, delta, gamma, theta, vega, implied_volatility,
            underlying_price
        """
        if snapshot_date is None:
            snapshot_date = self._last_trading_day()

        cache_key = f"snapshot_{snapshot_date}_{','.join(symbols) if symbols else 'all'}"
        cache_path = self._cache_path(cache_key)

        if use_cache and cache_path.exists():
            return pl.read_parquet(cache_path)

        # Build request
        params = {"date": snapshot_date.isoformat()}
        if symbols:
            params["symbols"] = ",".join(symbols)

        resp = requests.get(
            f"{self.base_url}/v1/options/snapshot",
            headers=self._headers(),
            params=params,
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()

        if not data or "contracts" not in data:
            return pl.DataFrame()

        df = pl.DataFrame(data["contracts"])

        # Normalize column names
        rename_map = {
            "root": "symbol",
            "strike": "strike",
            "exp": "expiration",
            "right": "option_type",
            "bid": "bid",
            "ask": "ask",
            "last": "last_price",
            "volume": "volume",
            "open_interest": "open_interest",
            "delta": "delta",
            "gamma": "gamma",
            "theta": "theta",
            "vega": "vega",
            "iv": "implied_volatility",
            "underlying_price": "underlying_price",
        }
        df = df.rename({k: v for k, v in rename_map.items() if k in df.columns})

        # Add snapshot_date
        df = df.with_columns(pl.lit(snapshot_date).alias("snapshot_date"))

        # Convert date strings
        for col in ["expiration", "snapshot_date"]:
            if col in df.columns and df[col].dtype == pl.Utf8:
                df = df.with_columns(pl.col(col).str.to_date().alias(col))

        # Cast numeric
        for col in ["strike", "bid", "ask", "last_price", "delta", "gamma", "theta", "vega", "implied_volatility", "underlying_price"]:
            if col in df.columns:
                df = df.with_columns(pl.col(col).cast(pl.Float64).alias(col))

        for col in ["volume", "open_interest"]:
            if col in df.columns:
                df = df.with_columns(pl.col(col).cast(pl.Int64).alias(col))

        if use_cache:
            df.write_parquet(cache_path)

        return df

    def get_historical_iv(
        self,
        symbol: str,
        lookback_days: int = 252,
    ) -> pl.DataFrame:
        """Fetch historical IV for a symbol to compute IV rank/percentile."""
        end = date.today()
        start = end - timedelta(days=lookback_days)

        resp = requests.get(
            f"{self.base_url}/v1/options/historical/iv",
            headers=self._headers(),
            params={"symbol": symbol, "start": start.isoformat(), "end": end.isoformat()},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data or "data" not in data:
            return pl.DataFrame()
        return pl.DataFrame(data["data"])

    @staticmethod
    def _last_trading_day() -> date:
        """Return the most recent trading day."""
        today = date.today()
        # Simple: if weekend, go back to Friday
        weekday = today.weekday()
        if weekday == 5:  # Saturday
            return today - timedelta(days=1)
        if weekday == 6:  # Sunday
            return today - timedelta(days=2)
        return today


def get_theta_data() -> ThetaDataSource:
    return ThetaDataSource()
