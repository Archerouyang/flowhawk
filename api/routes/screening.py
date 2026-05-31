"""Options screening API routes."""
from datetime import date
from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot
from src.screening.options_anomaly import OptionsAnomalyScreener

router = APIRouter()


class ScreenParams(BaseModel):
    """Screening request parameters."""
    symbols: list[str] = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"]
    min_voi_ratio: float = 3.0
    min_premium: float = 100_000
    min_dte: int = 180
    max_dte: int = 730
    min_delta: float = 0.5
    max_delta: float = 0.85


class ScreenResult(BaseModel):
    """Screening result item."""
    symbol: str
    option_type: str
    strike: float
    expiration: str
    last_price: float
    volume: int
    open_interest: int
    voi_ratio: float
    delta: float
    implied_volatility: float
    anomaly_score: float


class ScreenResponse(BaseModel):
    """Screening response."""
    count: int
    candidates: list[ScreenResult]


@router.post("/screen", response_model=ScreenResponse)
async def run_screen(params: ScreenParams):
    """Run options anomaly screening."""
    snapshot = generate_options_snapshot(params.symbols, date.today())
    screener = OptionsAnomalyScreener()
    screener.min_voi_ratio = params.min_voi_ratio
    screener.min_premium = params.min_premium
    screener.min_dte = params.min_dte
    screener.max_dte = params.max_dte
    screener.min_delta = params.min_delta
    screener.max_delta = params.max_delta

    results = screener.screen(snapshot)

    candidates = []
    for row in results.iter_rows(named=True):
        candidates.append(
            ScreenResult(
                symbol=row["symbol"],
                option_type=row["option_type"],
                strike=row["strike"],
                expiration=row["expiration"].isoformat(),
                last_price=row["last_price"],
                volume=row["volume"],
                open_interest=row["open_interest"],
                voi_ratio=row["voi_ratio"],
                delta=row["delta"],
                implied_volatility=row["implied_volatility"],
                anomaly_score=row["anomaly_score"],
            )
        )

    return ScreenResponse(count=len(candidates), candidates=candidates)
