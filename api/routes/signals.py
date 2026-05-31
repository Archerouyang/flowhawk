"""Trade signals API routes."""

from datetime import date

import polars as pl
from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot
from src.screening.options_anomaly import OptionsAnomalyScreener
from src.screening.leaps_selector import LEAPSSelector

router = APIRouter()


class SignalRequest(BaseModel):
    """Signal generation request."""

    symbols: list[str] = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"]


class SignalResult(BaseModel):
    """Trade signal result."""

    symbol: str
    option_type: str
    strike: float
    expiration: str
    last_price: float
    delta: float
    gamma: float
    theta: float
    vega: float
    implied_volatility: float
    voi_ratio: float
    leaps_score: float
    theta_price_ratio: float
    dte: int


class SignalResponse(BaseModel):
    """Signal generation response."""

    count: int
    signals: list[SignalResult]


@router.post("/signals", response_model=SignalResponse)
async def generate_signals(request: SignalRequest) -> SignalResponse:
    """Generate LEAPS trade signals through full pipeline."""
    snapshot = generate_options_snapshot(
        request.symbols, date.today(), num_contracts_per_symbol=30
    )

    anomaly_df = OptionsAnomalyScreener().screen(snapshot)

    # Stage 2: Technical filter placeholder
    # TODO: integrate real stock technical data from FMP
    tech_df = pl.DataFrame(
        {
            "symbol": request.symbols,
            "technical_score": [0.5] * len(request.symbols),
        }
    )

    trade_signals = LEAPSSelector().select(anomaly_df, tech_df)

    signals = []
    for ts in trade_signals:
        dte_val = (
            (ts.expiration - date.today()).days
            if isinstance(ts.expiration, date)
            else 180
        )
        signals.append(
            SignalResult(
                symbol=ts.symbol,
                option_type="C" if ts.direction.value == "long_call" else "P",
                strike=ts.strike,
                expiration=ts.expiration.isoformat()
                if isinstance(ts.expiration, date)
                else str(ts.expiration),
                last_price=ts.entry_price,
                delta=ts.delta,
                gamma=0.0,  # TODO: add to TradeSignal model
                theta=ts.theta,
                vega=0.0,  # TODO: add to TradeSignal model
                implied_volatility=0.3,  # TODO: add to TradeSignal model
                voi_ratio=ts.anomaly_score * 5,  # approx
                leaps_score=ts.confidence_score,
                theta_price_ratio=abs(ts.theta) / (ts.entry_price or 1e-9),
                dte=dte_val,
            )
        )

    return SignalResponse(count=len(signals), signals=signals)
