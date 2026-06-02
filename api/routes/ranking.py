"""Ranking API routes — contract-level leaderboard."""

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.ranking import generate_contract_rankings

router = APIRouter()


class PriceData(BaseModel):
    last: float
    high: float
    low: float
    change_pct: float
    bid: float
    ask: float


class VolumeData(BaseModel):
    total: int
    vs_avg: float
    premium: float


class OIData(BaseModel):
    total: int
    change: int


class IVData(BaseModel):
    current: float
    change_pct: float


class GreeksData(BaseModel):
    delta: float
    gamma: float
    theta: float
    vega: float


class ContractEntry(BaseModel):
    """Single option contract in the leaderboard."""

    rank: int
    underlying: str
    is_etf: bool
    contract_code: str
    strike: float
    expiration: str
    option_type: str
    price: PriceData
    volume: VolumeData
    oi: OIData
    iv: IVData
    greeks: GreeksData
    narrative: str


class RankingResponse(BaseModel):
    """Ranking response."""

    date: str
    category: str
    total: int
    rankings: list[ContractEntry]


class DashboardStats(BaseModel):
    """Dashboard aggregate stats."""

    date: str
    total_contracts: int
    total_volume: int
    total_premium: float
    call_put_ratio: float
    top_big_mover: ContractEntry | None
    top_volume_spike: ContractEntry | None


@router.post("/ranking", response_model=RankingResponse)
async def get_ranking() -> RankingResponse:
    """Get all contract rankings (dragon-tiger + individual + etf)."""
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
    snapshot = generate_options_snapshot(
        symbols, snapshot_date, num_contracts_per_symbol=30
    )
    meta_map = generate_symbol_meta(symbols)

    rankings = generate_contract_rankings(snapshot, meta_map)

    # Return dragon-tiger as default (all contracts top 25)
    entries = rankings.get("dragon_tiger", [])

    return RankingResponse(
        date=snapshot_date.isoformat(),
        category="dragon_tiger",
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
    snapshot = generate_options_snapshot(
        symbols, snapshot_date, num_contracts_per_symbol=30
    )
    meta_map = generate_symbol_meta(symbols)

    rankings = generate_contract_rankings(snapshot, meta_map)
    all_entries = (
        rankings.get("dragon_tiger", [])
        + rankings.get("individual", [])
        + rankings.get("etf", [])
    )

    total_contracts = len(all_entries)
    total_volume = sum(e.volume for e in all_entries)
    total_premium = sum(e.premium for e in all_entries)

    # Call/Put ratio by volume
    call_vol = sum(e.volume for e in all_entries if e.option_type == "C")
    put_vol = sum(e.volume for e in all_entries if e.option_type == "P")
    cp_ratio = call_vol / put_vol if put_vol > 0 else 999.0

    # Top big mover (highest change_pct)
    top_mover = max(all_entries, key=lambda e: abs(e.change_pct), default=None)

    # Top volume spike
    top_spike = max(all_entries, key=lambda e: e.volume_vs_avg, default=None)

    return DashboardStats(
        date=snapshot_date.isoformat(),
        total_contracts=total_contracts,
        total_volume=total_volume,
        total_premium=round(total_premium, 2),
        call_put_ratio=round(cp_ratio, 2),
        top_big_mover=_convert_entry(top_mover),
        top_volume_spike=_convert_entry(top_spike),
    )


def _convert_entries(entries: list) -> list[ContractEntry]:
    """Convert internal dataclasses to Pydantic models."""
    return [_convert_entry(e) for e in entries if e is not None]  # type: ignore[misc]


def _convert_entry(e) -> ContractEntry | None:
    """Convert single ContractEntry."""
    if e is None:
        return None
    return ContractEntry(
        rank=e.rank,
        underlying=e.underlying,
        is_etf=e.is_etf,
        contract_code=e.contract_code,
        strike=e.strike,
        expiration=e.expiration,
        option_type=e.option_type,
        price=PriceData(
            last=e.last_price,
            high=e.high,
            low=e.low,
            change_pct=e.change_pct,
            bid=e.bid,
            ask=e.ask,
        ),
        volume=VolumeData(
            total=e.volume,
            vs_avg=e.volume_vs_avg,
            premium=e.premium,
        ),
        oi=OIData(
            total=e.open_interest,
            change=e.oi_change,
        ),
        iv=IVData(
            current=e.iv,
            change_pct=e.iv_change_pct,
        ),
        greeks=GreeksData(
            delta=e.delta,
            gamma=e.gamma,
            theta=e.theta,
            vega=e.vega,
        ),
        narrative=e.narrative,
    )
