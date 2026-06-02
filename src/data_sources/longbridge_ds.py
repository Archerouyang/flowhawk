"""Longbridge CLI data source for real-time option data."""

import json
import subprocess
from dataclasses import dataclass
from typing import Optional


@dataclass
class OptionVolume:
    """Option volume breakdown."""

    symbol: str
    call_volume: int
    put_volume: int

    @property
    def total_volume(self) -> int:
        return self.call_volume + self.put_volume

    @property
    def call_put_ratio(self) -> float:
        return self.call_volume / max(self.put_volume, 1)


@dataclass
class StockQuote:
    """Stock quote snapshot."""

    symbol: str
    price: float
    change_pct: float
    volume: int


class LongbridgeDataSource:
    """Fetch option and equity data via Longbridge CLI."""

    def _run(self, *args: str) -> dict:
        """Execute longbridge CLI and return parsed JSON."""
        cmd = ["longbridge", *args, "--format", "json"]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if result.returncode != 0:
            return {}
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return {}

    def get_option_volume(self, symbol: str) -> Optional[OptionVolume]:
        """Fetch option volume for a symbol."""
        data = self._run("option", "volume", symbol)
        if not data:
            return None
        return OptionVolume(
            symbol=symbol.replace(".US", ""),
            call_volume=int(data.get("c", 0)),
            put_volume=int(data.get("p", 0)),
        )

    def get_quote(self, symbol: str) -> Optional[StockQuote]:
        """Fetch stock quote."""
        data = self._run("quote", symbol)
        if not data or not isinstance(data, list):
            return None
        q = data[0]
        return StockQuote(
            symbol=symbol.replace(".US", ""),
            price=float(q.get("last", 0) or 0),
            change_pct=float(q.get("change_percentage", 0) or 0),
            volume=int(q.get("volume", 0) or 0),
        )

    def get_option_chain(self, symbol: str) -> list[str]:
        """Fetch available option expiry dates."""
        data = self._run("option", "chain", symbol)
        return data if isinstance(data, list) else []

    def get_option_strikes(self, symbol: str, expiry: str) -> list[dict]:
        """Fetch strikes for a given expiry."""
        data = self._run("option", "chain", symbol, "--date", expiry)
        if not data or not isinstance(data, list):
            return []
        return [
            {
                "strike": item.get("strike", 0),
                "call_symbol": item.get("call", ""),
                "put_symbol": item.get("put", ""),
            }
            for item in data
        ]
