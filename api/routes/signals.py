"""Trade signals API routes."""

from datetime import date

import polars as pl
from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.screening.options_anomaly import OptionsAnomalyScreener
from src.screening.leaps_selector import LEAPSSelector
from src.screening.signal_classifier import SignalClassifier

router = APIRouter()


class SignalRequest(BaseModel):
    """Signal generation request."""

    symbols: list[str] = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"]


class SignalResult(BaseModel):
    """Trade signal result with classification."""

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
    # classification
    signal_type: str
    composite_score: int
    tier: str
    narrative: str
    tags: list[str]
    # meta
    asset_type: str
    cap_type: str
    sector: str


class SignalResponse(BaseModel):
    """Signal generation response."""

    count: int
    signals: list[SignalResult]


def _compute_tier(score: int) -> str:
    if score >= 85:
        return "🔴 conviction"
    if score >= 70:
        return "🟠 strong"
    if score >= 55:
        return "🟡 monitor"
    return "⚪ noise"


def _build_tags(detected, stats: dict) -> list[str]:
    tags = []
    leap = stats.get("leap_ratio", 0)
    cp = stats.get("cp_ratio_all", 0)
    price_change = stats.get("price_change_day", 0)
    vol_spike = stats.get("volume_vs_avg", 1.0)

    signal_type = detected.signal_type.value if hasattr(detected.signal_type, "value") else str(detected.signal_type)

    if signal_type == "smart_money":
        if leap > 10:
            tags.append("LEAPS call rate > 10x")
        elif leap > 5:
            tags.append("LEAPS call rate > 5x")
        if price_change < 0:
            tags.append("Down day + call build")
    elif signal_type == "first_timer":
        tags.append("First appearance")
        if leap > 20:
            tags.append("LEAPS call rate > 20x")
        tags.append("Small cap")
    elif signal_type == "index_hedge":
        tags.append("Put wall detected")
        tags.append("Index up + puts堆积")
    elif signal_type == "gamma_squeeze":
        if price_change > 0.15:
            tags.append("+15% day move")
        if leap > 5:
            tags.append("LEAP > 5x")
    elif signal_type == "sector_rotation":
        tags.append(f"Sector: {detected.symbol}")

    return tags


def _cap_type_from_market_cap(cap_b: float) -> str:
    if cap_b >= 50:
        return "LARGE"
    return "GROWTH"


@router.post("/signals", response_model=SignalResponse)
async def generate_signals(request: SignalRequest) -> SignalResponse:
    """Generate LEAPS trade signals through full pipeline."""
    snapshot = generate_options_snapshot(
        request.symbols, date.today(), num_contracts_per_symbol=30
    )

    anomaly_df = OptionsAnomalyScreener().screen(snapshot)
    meta_map = generate_symbol_meta(request.symbols)

    # Stage 2: Technical filter placeholder
    # TODO: integrate real stock technical data from FMP
    tech_df = pl.DataFrame(
        {
            "symbol": request.symbols,
            "technical_score": [0.5] * len(request.symbols),
        }
    )

    # Classify anomalies into signal types
    classifier = SignalClassifier(history_symbols=set())
    detected_signals = classifier.classify(anomaly_df, meta_map)

    # Build lookup: symbol -> highest-volume anomaly row
    anomaly_by_sym: dict[str, dict] = {}
    for row in anomaly_df.to_dicts():
        sym = row["symbol"]
        if sym not in anomaly_by_sym or row["volume"] > anomaly_by_sym[sym]["volume"]:
            anomaly_by_sym[sym] = row

    sym_stats = classifier._aggregate_symbol_stats(anomaly_df)

    signals = []
    for detected in detected_signals:
        sym = detected.symbol
        anom = anomaly_by_sym.get(sym)
        meta = meta_map.get(sym)
        stats = sym_stats.get(sym, {})

        if anom is None:
            continue

        dte_val = (
            (date.fromisoformat(anom["expiration"]) - date.today()).days
            if isinstance(anom["expiration"], str)
            else 180
        )

        composite_score = min(int(detected.confidence * 100), 99)

        signals.append(
            SignalResult(
                symbol=sym,
                option_type=anom["option_type"],
                strike=anom["strike"],
                expiration=anom["expiration"]
                if isinstance(anom["expiration"], str)
                else anom["expiration"].isoformat(),
                last_price=anom["last_price"],
                delta=anom["delta"],
                gamma=anom.get("gamma", 0.0),
                theta=anom.get("theta", 0.0),
                vega=anom.get("vega", 0.0),
                implied_volatility=anom["implied_volatility"],
                voi_ratio=anom["voi_ratio"],
                leaps_score=round(detected.confidence, 3),
                theta_price_ratio=abs(anom.get("theta", 0.0)) / (anom["last_price"] or 1e-9),
                dte=dte_val,
                signal_type=detected.signal_type.value,
                composite_score=composite_score,
                tier=_compute_tier(composite_score),
                narrative=detected.narrative,
                tags=_build_tags(detected, stats),
                asset_type="ETF" if (meta and meta.is_etf) else "STOCK",
                cap_type=_cap_type_from_market_cap(meta.market_cap) if meta else "GROWTH",
                sector=meta.sector if meta else "Unknown",
            )
        )

    return SignalResponse(count=len(signals), signals=signals)
