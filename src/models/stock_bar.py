"""Stock OHLCV bar data model."""

from dataclasses import dataclass
from datetime import date


@dataclass(slots=True)
class StockBar:
    """Single stock price bar."""

    date: date
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: int
