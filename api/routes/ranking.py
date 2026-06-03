"""Ranking API routes — contract-level leaderboard."""

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.ranking import generate_contract_rankings
from src.storage.db import (
    get_ranking_by_date,
    save_ranking_snapshot,
    get_available_ranking_dates,
)

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
    leap_cp_ratio: float
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
    dragon_tiger: list[ContractEntry]
    individual: list[ContractEntry]
    etf: list[ContractEntry]
    premium: list[ContractEntry]


class RankingRequest(BaseModel):
    """Ranking request."""

    category: str = "dragon_tiger"


@router.post("/ranking", response_model=RankingResponse)
async def get_ranking(request: RankingRequest) -> RankingResponse:
    """Get contract rankings for a specific category."""
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

    entries = rankings.get(request.category, rankings.get("dragon_tiger", []))

    return RankingResponse(
        date=snapshot_date.isoformat(),
        category=request.category if request.category in rankings else "dragon_tiger",
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

    return DashboardStats(
        date=snapshot_date.isoformat(),
        total_contracts=total_contracts,
        total_volume=total_volume,
        total_premium=round(total_premium, 2),
        call_put_ratio=round(cp_ratio, 2),
        dragon_tiger=_convert_entries(rankings.get("dragon_tiger", [])),
        individual=_convert_entries(rankings.get("individual", [])),
        etf=_convert_entries(rankings.get("etf", [])),
        premium=_convert_entries(rankings.get("premium", [])),
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
        leap_cp_ratio=e.leap_cp_ratio,
        narrative=e.narrative,
    )


def _entry_to_dict(e: ContractEntry) -> dict:
    """Convert Pydantic ContractEntry to flat dict for DB storage."""
    return {
        "rank": e.rank,
        "contract_code": e.contract_code,
        "underlying": e.underlying,
        "option_type": e.option_type,
        "strike": e.strike,
        "expiration": e.expiration,
        "last_price": e.price.last,
        "change_pct": e.price.change_pct,
        "volume": e.volume.total,
        "vs_avg": e.volume.vs_avg,
        "premium": e.volume.premium,
        "oi_total": e.oi.total,
        "oi_change": e.oi.change,
        "iv": e.iv.current,
        "iv_change_pct": e.iv.change_pct,
        "delta": e.greeks.delta,
        "gamma": e.greeks.gamma,
        "theta": e.greeks.theta,
        "vega": e.greeks.vega,
        "leap_cp_ratio": e.leap_cp_ratio,
        "narrative": e.narrative,
        "is_etf": e.is_etf,
    }


class HistoryRequest(BaseModel):
    """Request to fetch historical rankings."""

    category: str = "dragon_tiger"


class HistoryDateResponse(BaseModel):
    """Response for available ranking dates."""

    dates: list[str]


@router.get("/rankings/history", response_model=HistoryDateResponse)
async def get_ranking_dates() -> HistoryDateResponse:
    """Get all available ranking snapshot dates."""
    dates = get_available_ranking_dates()
    return HistoryDateResponse(dates=dates)


@router.get("/rankings/history/{snapshot_date}", response_model=RankingResponse)
async def get_historical_ranking(
    snapshot_date: str, category: str = "dragon_tiger"
) -> RankingResponse:
    """Get ranking snapshot for a specific date."""
    rows = get_ranking_by_date(snapshot_date, category)
    if not rows:
        # Fallback to today's live data if no history found
        return await get_ranking(RankingRequest(category=category))

    entries = [_row_to_entry(r) for r in rows]
    return RankingResponse(
        date=snapshot_date,
        category=category,
        total=len(entries),
        rankings=entries,
    )


@router.post("/rankings/snapshot")
async def create_snapshot() -> dict:
    """Manually trigger a snapshot save for today. Returns saved categories."""
    snapshot_date = date.today().isoformat()
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
        symbols, date.today(), num_contracts_per_symbol=30
    )
    meta_map = generate_symbol_meta(symbols)
    rankings = generate_contract_rankings(snapshot, meta_map)

    saved = []
    for cat, entries in rankings.items():
        pydantic_entries = _convert_entries(entries)
        dict_entries = [_entry_to_dict(e) for e in pydantic_entries]
        save_ranking_snapshot(snapshot_date, cat, dict_entries)
        saved.append(cat)

    return {"date": snapshot_date, "saved_categories": saved}


def _row_to_entry(row: dict) -> ContractEntry:
    """Convert DB row to ContractEntry Pydantic model."""
    return ContractEntry(
        rank=row["rank"],
        underlying=row["underlying"],
        is_etf=bool(row["is_etf"]),
        contract_code=row["contract_code"],
        strike=row["strike"],
        expiration=row["expiration"],
        option_type=row["option_type"],
        price=PriceData(
            last=row["last_price"],
            high=row["last_price"],  # Not stored separately
            low=row["last_price"],
            change_pct=row["change_pct"],
            bid=row["last_price"] * 0.99,
            ask=row["last_price"] * 1.01,
        ),
        volume=VolumeData(
            total=row["volume"],
            vs_avg=row["vs_avg"],
            premium=row["premium"],
        ),
        oi=OIData(
            total=row["oi_total"],
            change=row["oi_change"],
        ),
        iv=IVData(
            current=row["iv"],
            change_pct=row["iv_change_pct"],
        ),
        greeks=GreeksData(
            delta=row["delta"],
            gamma=row["gamma"],
            theta=row["theta"],
            vega=row["vega"],
        ),
        leap_cp_ratio=row["leap_cp_ratio"],
        narrative=row["narrative"] or "",
    )
