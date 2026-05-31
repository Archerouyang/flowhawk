"""Trade signal data model."""

from dataclasses import dataclass
from datetime import date
from enum import Enum


class SignalDirection(Enum):
    LONG_CALL = "long_call"
    LONG_PUT = "long_put"


@dataclass(slots=True)
class TradeSignal:
    """Final trade recommendation."""

    date: date
    symbol: str
    direction: SignalDirection
    strike: float
    expiration: date
    entry_price: float
    delta: float
    theta: float
    stop_loss: float
    target_price: float
    confidence_score: float
    anomaly_score: float
    technical_score: float
    rationale: str
