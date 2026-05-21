"""Financial Modeling Prep API adapter."""
import hashlib
import json
import os
from pathlib import Path
from typing import Optional

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()


class FMPDataSource:
    """Fetch fundamental data from FMP."""

    def __init__(self, api_key: Optional[str] = None, cache_dir: str = "./data/cache/fmp"):
        self.api_key = api_key or os.getenv("FMP_API_KEY", "")
        if not self.api_key:
            raise ValueError("FMP API key required. Set FMP_API_KEY env var or pass api_key.")
        self.base_url = "https://financialmodelingprep.com/api/v3"
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict | list:
        params = params or {}
        params["apikey"] = self.api_key

        # Stable cache key using SHA256
        cache_key = hashlib.sha256(
            json.dumps({"endpoint": endpoint, "params": params}, sort_keys=True).encode()
        ).hexdigest()[:24]
        cache_path = self.cache_dir / f"{cache_key}.json"

        if cache_path.exists():
            with open(cache_path) as f:
                return json.load(f)

        url = f"{self.base_url}/{endpoint}"
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # Atomic write to avoid corrupt cache on crash
        tmp_path = self.cache_dir / f".tmp.{cache_key}.json"
        with open(tmp_path, "w") as f:
            json.dump(data, f)
        os.replace(tmp_path, cache_path)

        return data

    def income_statement(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        data = self._get(f"income-statement/{symbol}", {"limit": limit})
        return pd.DataFrame(data)

    def balance_sheet(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        data = self._get(f"balance-sheet-statement/{symbol}", {"limit": limit})
        return pd.DataFrame(data)

    def cash_flow(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        data = self._get(f"cash-flow-statement/{symbol}", {"limit": limit})
        return pd.DataFrame(data)

    def key_metrics(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        data = self._get(f"key-metrics/{symbol}", {"limit": limit})
        return pd.DataFrame(data)

    def ratios(self, symbol: str, limit: int = 10) -> pd.DataFrame:
        data = self._get(f"ratios/{symbol}", {"limit": limit})
        return pd.DataFrame(data)

    def stock_screener(
        self,
        market_cap_more_than: Optional[float] = None,
        pe_more_than: Optional[float] = None,
        pe_less_than: Optional[float] = None,
        roe_more_than: Optional[float] = None,
        sector: Optional[str] = None,
        limit: int = 100,
    ) -> pd.DataFrame:
        """Screen stocks by fundamental metrics."""
        params = {"limit": limit}
        if market_cap_more_than:
            params["marketCapMoreThan"] = market_cap_more_than
        if pe_more_than:
            params["priceEarningsRatioMoreThan"] = pe_more_than
        if pe_less_than:
            params["priceEarningsRatioLowerThan"] = pe_less_than
        if roe_more_than:
            params["returnOnEquityMoreThan"] = roe_more_than
        if sector:
            params["sector"] = sector

        data = self._get("stock-screener", params)
        return pd.DataFrame(data)
