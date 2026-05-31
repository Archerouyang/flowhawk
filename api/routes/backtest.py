"""Backtest API routes."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class BacktestRequest(BaseModel):
    """Backtest request parameters."""
    strategy: str = "V/OI Breakout"
    start_date: str = "2025-06-01"
    end_date: str = "2025-05-31"
    initial_capital: float = 100_000
    max_positions: int = 3


class BacktestMetrics(BaseModel):
    """Backtest performance metrics."""
    total_return_pct: float
    max_drawdown_pct: float
    sharpe_ratio: float
    win_rate_pct: float
    trades: int


class BacktestResponse(BaseModel):
    """Backtest response."""
    metrics: BacktestMetrics
    equity_curve: list[dict]


@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """Run strategy backtest."""
    # Placeholder - to be implemented with real backtest engine
    return BacktestResponse(
        metrics=BacktestMetrics(
            total_return_pct=12.4,
            max_drawdown_pct=-8.2,
            sharpe_ratio=1.34,
            win_rate_pct=58.3,
            trades=47,
        ),
        equity_curve=[
            {"date": "2025-06-01", "equity": 100_000},
            {"date": "2025-06-15", "equity": 103_200},
            {"date": "2025-07-01", "equity": 101_800},
            {"date": "2025-07-15", "equity": 106_500},
            {"date": "2025-08-01", "equity": 108_900},
            {"date": "2025-08-15", "equity": 105_400},
            {"date": "2025-09-01", "equity": 112_400},
        ],
    )
