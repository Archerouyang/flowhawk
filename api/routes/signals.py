"""Trade signals API routes."""
from datetime import date

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
async def generate_signals(request: SignalRequest):
    """Generate LEAPS trade signals through full pipeline."""
    snapshot = generate_options_snapshot(request.symbols, date.today(), num_contracts_per_symbol=30)

    anomaly_df = OptionsAnomalyScreener().screen(snapshot)
    leaps_df = LEAPSSelector().select(anomaly_df)

    signals = []
    for row in leaps_df.iter_rows(named=True):
        signals.append(
            SignalResult(
                symbol=row["symbol"],
                option_type=row["option_type"],
                strike=row["strike"],
                expiration=row["expiration"].isoformat(),
                last_price=row["last_price"],
                delta=row["delta"],
                gamma=row["gamma"],
                theta=row["theta"],
                vega=row["vega"],
                implied_volatility=row["implied_volatility"],
                voi_ratio=row["voi_ratio"],
                leaps_score=row["leaps_score"],
                theta_price_ratio=row["theta_price_ratio"],
                dte=row["dte"],
            )
        )

    return SignalResponse(count=len(signals), signals=signals)
