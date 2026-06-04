"""Tracker API routes — watchlist + daily snapshot tracking for option contracts."""

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot
from src.storage.tracker_db import (
    add_tracked_contract,
    get_tracked_contracts,
    get_tracked_contract,
    remove_tracked_contract,
    update_tracked_contract,
    get_tracker_history,
    get_latest_snapshots,
    get_previous_day_snapshots,
    save_tracker_snapshot,
)

router = APIRouter()


class AddTrackerRequest(BaseModel):
    contract_code: str
    underlying: str
    option_type: str
    strike: float
    expiration: str
    notes: str = ""
    alert_threshold: float | None = None


class UpdateTrackerRequest(BaseModel):
    notes: str | None = None
    status: str | None = None
    alert_threshold: float | None = None


class TrackerItem(BaseModel):
    contract_code: str
    underlying: str
    option_type: str
    strike: float
    expiration: str
    added_at: str
    notes: str
    status: str
    alert_threshold: float | None


class SnapshotData(BaseModel):
    snapshot_date: str
    last_price: float
    volume: int
    open_interest: int
    oi_change: int
    iv: float
    iv_change_pct: float
    delta: float
    gamma: float
    theta: float
    vega: float
    premium: float
    volume_vs_avg: float


class TrackedContractWithSnapshot(BaseModel):
    contract_code: str
    underlying: str
    option_type: str
    strike: float
    expiration: str
    added_at: str
    notes: str
    status: str
    alert_threshold: float | None
    # latest snapshot
    last_price: float | None
    volume: int | None
    open_interest: int | None
    oi_change: int | None
    iv: float | None
    delta: float | None
    gamma: float | None
    theta: float | None
    vega: float | None
    premium: float | None
    volume_vs_avg: float | None
    # day-over-day comparison
    prev_oi: int | None
    prev_volume: int | None
    prev_price: float | None
    oi_delta: int | None
    volume_delta: int | None
    price_delta: float | None
    oi_delta_pct: float | None


class TrackerListResponse(BaseModel):
    count: int
    contracts: list[TrackedContractWithSnapshot]


class TrackerHistoryResponse(BaseModel):
    contract_code: str
    count: int
    history: list[SnapshotData]


@router.post("/tracker", response_model=TrackerItem)
async def create_tracker(request: AddTrackerRequest) -> TrackerItem:
    """Add a contract to the tracker."""
    row = add_tracked_contract(
        contract_code=request.contract_code,
        underlying=request.underlying,
        option_type=request.option_type,
        strike=request.strike,
        expiration=request.expiration,
        notes=request.notes,
        alert_threshold=request.alert_threshold,
    )
    return _row_to_item(row)


@router.delete("/tracker/{contract_code}")
async def delete_tracker(contract_code: str) -> dict:
    """Remove a contract from the tracker."""
    removed = remove_tracked_contract(contract_code)
    return {"removed": removed, "contract_code": contract_code}


@router.get("/tracker", response_model=TrackerListResponse)
async def list_tracker(status: str | None = None) -> TrackerListResponse:
    """Get all tracked contracts with latest snapshot and day-over-day deltas."""
    contracts = get_tracked_contracts(status=status)
    codes = [c["contract_code"] for c in contracts]

    latest = get_latest_snapshots(codes)
    previous = get_previous_day_snapshots(codes)

    result = []
    for c in contracts:
        code = c["contract_code"]
        snap = latest.get(code)
        prev = previous.get(code)

        entry = TrackedContractWithSnapshot(
            contract_code=code,
            underlying=c["underlying"],
            option_type=c["option_type"],
            strike=c["strike"],
            expiration=c["expiration"],
            added_at=c["added_at"],
            notes=c["notes"] or "",
            status=c["status"],
            alert_threshold=c["alert_threshold"],
            # latest
            last_price=snap["last_price"] if snap else None,
            volume=snap["volume"] if snap else None,
            open_interest=snap["open_interest"] if snap else None,
            oi_change=snap["oi_change"] if snap else None,
            iv=snap["iv"] if snap else None,
            delta=snap["delta"] if snap else None,
            gamma=snap["gamma"] if snap else None,
            theta=snap["theta"] if snap else None,
            vega=snap["vega"] if snap else None,
            premium=snap["premium"] if snap else None,
            volume_vs_avg=snap["volume_vs_avg"] if snap else None,
            # prev day
            prev_oi=prev["open_interest"] if prev else None,
            prev_volume=prev["volume"] if prev else None,
            prev_price=prev["last_price"] if prev else None,
            oi_delta=(snap["open_interest"] - prev["open_interest"]) if snap and prev else None,
            volume_delta=(snap["volume"] - prev["volume"]) if snap and prev else None,
            price_delta=(snap["last_price"] - prev["last_price"]) if snap and prev else None,
            oi_delta_pct=_pct(snap["open_interest"] - prev["open_interest"], prev["open_interest"])
            if snap and prev and prev["open_interest"]
            else None,
        )
        result.append(entry)

    return TrackerListResponse(count=len(result), contracts=result)


@router.get("/tracker/{contract_code}/history", response_model=TrackerHistoryResponse)
async def get_tracker_contract_history(contract_code: str, limit: int = 30) -> TrackerHistoryResponse:
    """Get historical snapshots for a tracked contract."""
    history = get_tracker_history(contract_code, limit=limit)
    return TrackerHistoryResponse(
        contract_code=contract_code,
        count=len(history),
        history=[SnapshotData(**h) for h in history],
    )


@router.put("/tracker/{contract_code}", response_model=TrackerItem)
async def patch_tracker(contract_code: str, request: UpdateTrackerRequest) -> TrackerItem:
    """Update notes, status, or alert threshold."""
    row = update_tracked_contract(
        contract_code=contract_code,
        notes=request.notes,
        status=request.status,
        alert_threshold=request.alert_threshold,
    )
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Contract {contract_code} not found")
    return _row_to_item(row)


@router.post("/tracker/snapshot")
async def snapshot_tracker() -> dict:
    """Manually trigger a snapshot for all tracked contracts (uses mock data)."""
    snapshot_date = date.today().isoformat()
    contracts = get_tracked_contracts(status="active")
    if not contracts:
        return {"date": snapshot_date, "snapshots": 0}

    symbols = list({c["underlying"] for c in contracts})
    mock_data = generate_options_snapshot(symbols, date.today(), num_contracts_per_symbol=50)

    # Build lookup by contract code
    contract_map = {}
    for symbol, contracts_list in mock_data.items():
        for oc in contracts_list:
            code = _make_code(oc.symbol, oc.expiration, oc.option_type, oc.strike)
            contract_map[code] = oc

    saved = 0
    for c in contracts:
        code = c["contract_code"]
        oc = contract_map.get(code)
        if oc:
            save_tracker_snapshot(
                contract_code=code,
                snapshot_date=snapshot_date,
                last_price=oc.last_price,
                volume=oc.volume,
                open_interest=oc.open_interest,
                oi_change=0,  # Would need previous day data to compute
                iv=oc.implied_volatility,
                iv_change_pct=0.0,
                delta=oc.delta,
                gamma=oc.gamma,
                theta=oc.theta,
                vega=oc.vega,
                premium=oc.premium,
                volume_vs_avg=round(oc.volume / max(oc.open_interest * 0.1, 1), 1),
            )
            saved += 1

    return {"date": snapshot_date, "snapshots": saved, "total_tracked": len(contracts)}


def _make_code(symbol: str, expiration: date, option_type: str, strike: float) -> str:
    """Generate contract code matching frontend convention."""
    exp_str = expiration.strftime("%y%m%d")
    strike_str = str(int(strike))
    return f"{symbol}{exp_str}{option_type}{strike_str}"


def _row_to_item(row: dict) -> TrackerItem:
    return TrackerItem(
        contract_code=row["contract_code"],
        underlying=row["underlying"],
        option_type=row["option_type"],
        strike=row["strike"],
        expiration=row["expiration"],
        added_at=row["added_at"],
        notes=row["notes"] or "",
        status=row["status"],
        alert_threshold=row["alert_threshold"],
    )


def _pct(delta: float, base: float) -> float | None:
    if base and base != 0:
        return round(delta / base * 100, 2)
    return None
