"""Longbridge CLI wrapper for data fetching."""
import json
import subprocess
from pathlib import Path
from typing import Optional


class LongbridgeDataSource:
    """Wraps longbridge CLI to fetch market data."""

    def __init__(self, cli_path: str = "~/.local/bin/longbridge"):
        self.cli = Path(cli_path).expanduser()

    def _run(self, *args: str) -> dict:
        cmd = [str(self.cli), *args, "--format", "json"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        return json.loads(result.stdout)

    def quote(self, symbol: str) -> dict:
        return self._run("quote", symbol)

    def kline(self, symbol: str, start: str, end: str, period: str = "day") -> list:
        """Fetch historical K-line data.

        Args:
            symbol: e.g. TSLA.US
            start: YYYY-MM-DD
            end: YYYY-MM-DD
            period: day | week | month
        """
        return self._run(
            "kline", "history", symbol,
            "--start", start, "--end", end, "--period", period
        )

    def positions(self) -> list:
        return self._run("positions")

    def portfolio(self) -> dict:
        return self._run("portfolio")

    def financial_report(self, symbol: str) -> dict:
        return self._run("financial-report", symbol)

    def news(self, symbol: str, limit: int = 10) -> list:
        # longbridge news doesn't have --limit; fetch and slice
        data = self._run("news", symbol)
        return data[:limit] if isinstance(data, list) else data
