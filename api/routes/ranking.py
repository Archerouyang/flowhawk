"""Ranking API routes."""

from datetime import date
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.factors import compute_all_factors
from src.ranking import generate_daily_rankings
from src.scoring import compute_anomaly_scores

router = APIRouter()


class RankingRequest(BaseModel):
    """Ranking request parameters."""

    category: Literal["all", "big_cap", "small_cap", "etf"] = "all"
    date: str | None = None


class FactorItem(BaseModel):
    """Top factor driving the score."""

    factor: str
    value: float
    contribution: float


class RankingEntry(BaseModel):
    """Single ranking entry."""

    rank: int
    symbol: str
    category: str
    anomaly_score: float
    top_factors: list[FactorItem]
    contract: dict
    greeks: dict
    narrative: str


class RankingResponse(BaseModel):
    """Ranking response."""

    date: str
    category: str
    total: int
    rankings: list[RankingEntry]


class DashboardStats(BaseModel):
    """Dashboard aggregate stats."""

    date: str
    total_symbols: int
    big_cap_count: int
    small_cap_count: int
    etf_count: int
    avg_score_big_cap: float
    avg_score_small_cap: float
    avg_score_etf: float
    top_big_cap: RankingEntry | None
    top_small_cap: RankingEntry | None
    top_etf: RankingEntry | None


@router.post("/ranking", response_model=RankingResponse)
async def get_ranking(request: RankingRequest) -> RankingResponse:
    """Get anomaly ranking for a category."""
    snapshot_date = date.fromisoformat(request.date) if request.date else date.today()

    # Generate mock snapshot
    symbols = [
        "AAPL",
        "MSFT",
        "GOOGL",
        "META",
        "NVDA",
        "TSLA",
        "AMD",
        "AVGO",
        "AMZN",
        "SPCE",
        "ONDS",
        "PLTR",
        "SOFI",
        "MSTR",
        "RIOT",
        "SPY",
        "QQQ",
        "SMH",
        "XLF",
        "XLE",
    ]
    snapshot = generate_options_snapshot(symbols, snapshot_date)
    meta_map = generate_symbol_meta(symbols)

    # Compute factors → scores → rankings
    factor_map = compute_all_factors(snapshot, meta_map)
    scores = compute_anomaly_scores(factor_map)
    rankings = generate_daily_rankings(scores, meta_map, factor_map)

    # Filter by category
    cat = request.category
    if cat == "all":
        # Return big_cap as default
        entries = rankings.get("big_cap", [])
        cat = "big_cap"
    else:
        entries = rankings.get(cat, [])

    return RankingResponse(
        date=snapshot_date.isoformat(),
        category=cat,
        total=len(entries),
        rankings=_convert_entries(entries),
    )


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard() -> DashboardStats:
    """Get dashboard aggregate statistics."""
    snapshot_date = date.today()

    symbols = [
        "AAPL",
        "MSFT",
        "GOOGL",
        "META",
        "NVDA",
        "TSLA",
        "AMD",
        "AVGO",
        "AMZN",
        "SPCE",
        "ONDS",
        "PLTR",
        "SOFI",
        "MSTR",
        "RIOT",
        "SPY",
        "QQQ",
        "SMH",
        "XLF",
        "XLE",
    ]
    snapshot = generate_options_snapshot(symbols, snapshot_date)
    meta_map = generate_symbol_meta(symbols)

    factor_map = compute_all_factors(snapshot, meta_map)
    scores = compute_anomaly_scores(factor_map)
    rankings = generate_daily_rankings(scores, meta_map, factor_map)

    # Compute stats per category
    def _avg_score(entries: list) -> float:
        if not entries:
            return 0.0
        return sum(e.anomaly_score for e in entries) / len(entries)

    def _top(entries: list):
        return _convert_entry(entries[0]) if entries else None

    big_cap = rankings.get("big_cap", [])
    small_cap = rankings.get("small_cap", [])
    etf = rankings.get("etf", [])

    return DashboardStats(
        date=snapshot_date.isoformat(),
        total_symbols=len(symbols),
        big_cap_count=len(big_cap),
        small_cap_count=len(small_cap),
        etf_count=len(etf),
        avg_score_big_cap=round(_avg_score(big_cap), 1),
        avg_score_small_cap=round(_avg_score(small_cap), 1),
        avg_score_etf=round(_avg_score(etf), 1),
        top_big_cap=_top(big_cap),
        top_small_cap=_top(small_cap),
        top_etf=_top(etf),
    )


def _convert_entries(entries: list) -> list[RankingEntry]:
    """Convert RankingEntry dataclasses to Pydantic models."""
    return [e for e in (_convert_entry(x) for x in entries) if e is not None]


def _convert_entry(e) -> RankingEntry | None:
    """Convert single RankingEntry."""
    if e is None:
        return None
    return RankingEntry(
        rank=e.rank,
        symbol=e.symbol,
        category=e.category,
        anomaly_score=e.anomaly_score,
        top_factors=[
            FactorItem(
                factor=f["factor"], value=f["value"], contribution=f["contribution"]
            )
            for f in e.top_factors
        ],
        contract=e.contract,
        greeks=e.greeks,
        narrative=e.narrative,
    )
