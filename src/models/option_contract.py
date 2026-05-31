"""Option contract data model."""
from dataclasses import dataclass
from datetime import date


@dataclass(slots=True)
class OptionContract:
    """Single option contract snapshot."""

    symbol: str
    option_type: str  # "C" or "P"
    strike: float
    expiration: date
    bid: float
    ask: float
    last_price: float
    volume: int
    open_interest: int
    delta: float
    gamma: float
    theta: float
    vega: float
    implied_volatility: float
    underlying_price: float
    snapshot_date: date

    @property
    def mid(self) -> float:
        return (self.bid + self.ask) / 2

    @property
    def premium(self) -> float:
        """Total premium traded today (approx)."""
        return self.last_price * self.volume * 100

    @property
    def bid_ask_spread(self) -> float:
        if self.ask <= 0:
            return 0.0
        return (self.ask - self.bid) / self.ask

    @property
    def dte(self) -> int:
        from datetime import datetime
        return max(0, (self.expiration - self.snapshot_date).days)

    @property
    def voi_ratio(self) -> float:
        if self.open_interest <= 0:
            return float("inf") if self.volume > 0 else 0.0
        return self.volume / self.open_interest
