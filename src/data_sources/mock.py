"""Mock data generator for development without API subscriptions."""

import random
from dataclasses import dataclass
from datetime import date, timedelta

import polars as pl


@dataclass(frozen=True, slots=True)
class SymbolMeta:
    """Per-symbol metadata for signal classification."""

    symbol: str
    market_cap: float  # billions
    sector: str
    is_etf: bool
    avg_volume_30d: float


# Sector pool for realistic mock data
_SECTORS = [
    "Technology",
    "Healthcare",
    "Financials",
    "Consumer Discretionary",
    "Communication Services",
    "Industrials",
    "Energy",
    "Materials",
    "Real Estate",
    "Utilities",
]

_ETF_SECTORS = {
    "SPY": "Broad Market",
    "QQQ": "Technology",
    "SMH": "Technology",
    "XLF": "Financials",
    "XLE": "Energy",
    "XBI": "Healthcare",
    "ARKK": "Technology",
    "IWM": "Broad Market",
}


def generate_symbol_meta(symbols: list[str]) -> dict[str, SymbolMeta]:
    """Generate realistic metadata for each symbol."""
    rng = random.Random(7)  # separate seed for stability
    meta_map: dict[str, SymbolMeta] = {}

    for sym in symbols:
        sym_upper = sym.upper()

        # Known ETFs
        if sym_upper in _ETF_SECTORS or sym_upper.endswith("ETF"):
            sector = _ETF_SECTORS.get(sym_upper, "Broad Market")
            market_cap = rng.uniform(10, 500)  # AUM proxy
            is_etf = True
        else:
            sector = rng.choice(_SECTORS)
            # Size-weighted: most stocks small, few mega-cap
            roll = rng.random()
            if roll < 0.6:
                market_cap = rng.uniform(0.5, 5.0)  # small-cap
            elif roll < 0.9:
                market_cap = rng.uniform(5.0, 50.0)  # mid-cap
            else:
                market_cap = rng.uniform(50.0, 3000.0)  # large-cap
            is_etf = False

        meta_map[sym_upper] = SymbolMeta(
            symbol=sym_upper,
            market_cap=round(market_cap, 2),
            sector=sector,
            is_etf=is_etf,
            avg_volume_30d=round(rng.gauss(5e6, 2e6), 0),
        )

    return meta_map


def generate_options_snapshot(
    symbols: list[str],
    snapshot_date: date,
    num_contracts_per_symbol: int = 20,
    biased_symbols: set[str] | None = None,
) -> pl.DataFrame:
    """Generate mock options snapshot data."""
    records = []
    rng = random.Random(42)  # reproducible
    bias_set = {s.upper() for s in (biased_symbols or set())}

    for sym in symbols:
        sym_upper = sym.upper()
        underlying_price = rng.uniform(50, 500)
        is_biased = sym_upper in bias_set

        for i in range(num_contracts_per_symbol):
            if is_biased:
                # 80% call, 20% put for biased symbols
                option_type = "C" if rng.random() < 0.8 else "P"
                # 60% far-dated (LEAPS) for biased symbols
                if rng.random() < 0.6:
                    dte = rng.randint(150, 730)
                else:
                    dte = rng.randint(30, 149)
                # Higher volume for biased symbols
                volume = rng.randint(2000, 15000)
            else:
                option_type = rng.choice(["C", "P"])
                dte = rng.randint(30, 730)
                volume = rng.randint(0, 5000)

            strike = round(underlying_price * rng.uniform(0.7, 1.3), 1)
            expiration = snapshot_date + timedelta(days=dte)

            moneyness = strike / underlying_price
            if option_type == "C":
                intrinsic = max(0, underlying_price - strike)
            else:
                intrinsic = max(0, strike - underlying_price)

            time_value = rng.uniform(0.5, 15)
            last_price = round(intrinsic + time_value, 2)
            bid = round(last_price * 0.95, 2)
            ask = round(last_price * 1.05, 2)

            open_interest = rng.randint(100, 50000)

            if option_type == "C":
                delta = max(0.01, min(0.99, 1 - abs(moneyness - 1) * 2))
            else:
                delta = -max(0.01, min(0.99, 1 - abs(moneyness - 1) * 2))

            gamma = rng.uniform(0.001, 0.05)
            theta = -rng.uniform(0.01, 0.5)
            vega = rng.uniform(0.01, 2.0)
            iv = rng.uniform(0.15, 0.80)

            records.append(
                {
                    "symbol": sym,
                    "option_type": option_type,
                    "strike": strike,
                    "expiration": expiration,
                    "bid": bid,
                    "ask": ask,
                    "last_price": last_price,
                    "volume": volume,
                    "open_interest": open_interest,
                    "delta": round(delta, 3),
                    "gamma": round(gamma, 4),
                    "theta": round(theta, 4),
                    "vega": round(vega, 4),
                    "implied_volatility": round(iv, 4),
                    "underlying_price": round(underlying_price, 2),
                    "snapshot_date": snapshot_date,
                }
            )

    return pl.DataFrame(records)


def generate_stock_kline(
    symbol: str,
    start: date,
    end: date,
) -> pl.DataFrame:
    """Generate mock stock OHLCV data."""
    records = []
    rng = random.Random(hash(symbol) % 2**31)

    days = (end - start).days + 1
    price = rng.uniform(50, 500)

    for i in range(days):
        day = start + timedelta(days=i)
        if day.weekday() >= 5:
            continue

        change_pct = rng.gauss(0, 0.02)
        open_p = price * (1 + rng.gauss(0, 0.005))
        close_p = open_p * (1 + change_pct)
        high_p = max(open_p, close_p) * (1 + abs(rng.gauss(0, 0.01)))
        low_p = min(open_p, close_p) * (1 - abs(rng.gauss(0, 0.01)))
        volume = int(rng.gauss(1e6, 3e5))

        records.append(
            {
                "date": day,
                "symbol": symbol,
                "open": round(open_p, 2),
                "high": round(high_p, 2),
                "low": round(low_p, 2),
                "close": round(close_p, 2),
                "volume": max(0, volume),
            }
        )

        price = close_p

    return pl.DataFrame(records)
