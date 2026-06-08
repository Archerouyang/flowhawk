"""Trade signals API routes."""

import asyncio
import re
from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from src.data_sources.longbridge_ds import LongbridgeDataSource
from src.data_sources.mock import generate_options_snapshot, generate_symbol_meta
from src.screening.options_anomaly import OptionsAnomalyScreener
from src.screening.price_sources import YfinancePriceSource
from src.screening.signal_builder import SignalBuilder
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
    # Longbridge real-time data
    call_volume: int = 0
    put_volume: int = 0
    stock_change_pct: float = 0.0
    stock_price: float = 0.0
    pre_market_price: float | None = None
    post_market_price: float | None = None


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
    meta_map = generate_symbol_meta(request.symbols)

    # Fetch Longbridge real-time data for each symbol (parallelized)
    lb = LongbridgeDataSource()

    async def _fetch_symbol(sym: str) -> tuple[str, dict]:
        vol = await asyncio.to_thread(lb.get_option_volume, f"{sym}.US")
        quote = await asyncio.to_thread(lb.get_quote, f"{sym}.US")
        return sym, {
            "call_volume": vol.call_volume if vol else 0,
            "put_volume": vol.put_volume if vol else 0,
            "stock_change_pct": quote.change_pct if quote else 0.0,
            "stock_price": quote.price if quote else 0.0,
        }

    lb_results = await asyncio.gather(*[_fetch_symbol(s) for s in request.symbols])
    lb_data: dict[str, dict] = {sym: data for sym, data in lb_results}

    # Delegate full pipeline assembly to SignalBuilder (injected classifier)
    classifier = SignalClassifier(
        price_source=YfinancePriceSource(),
        history_symbols=set(),
    )
    builder = SignalBuilder(classifier=classifier)
    built = builder.build(
        anomaly_df=anomaly_df,
        meta_map=meta_map,
        lb_data=lb_data,
    )

    # Map plain dicts back to Pydantic models for the response
    signals = [SignalResult(**s) for s in built]

    return SignalResponse(count=len(signals), signals=signals)


@router.get("/contract/{code}")
async def get_contract_detail(code: str) -> dict:
    """Get contract detail with Longbridge real-time data."""
    m = re.match(r"^([A-Z]+)(\d{6})([CP])([\d.]+)$", code)
    if not m:
        return {"error": "Invalid contract code format"}

    sym = m.group(1)

    lb = LongbridgeDataSource()
    vol = lb.get_option_volume(f"{sym}.US")
    quote = lb.get_quote(f"{sym}.US")

    return {
        "code": code,
        "symbol": sym,
        "call_volume": vol.call_volume if vol else 0,
        "put_volume": vol.put_volume if vol else 0,
        "cp_ratio": vol.call_put_ratio if vol else 0.0,
        "stock_price": quote.price if quote else 0.0,
        "stock_change_pct": quote.change_pct if quote else 0.0,
    }
