"""Mock data generator for development without API subscriptions."""
import random
from datetime import date, timedelta

import polars as pl


def generate_options_snapshot(
    symbols: list[str],
    snapshot_date: date,
    num_contracts_per_symbol: int = 20,
) -> pl.DataFrame:
    """Generate mock options snapshot data."""
    records = []
    rng = random.Random(42)  # reproducible

    for sym in symbols:
        underlying_price = rng.uniform(50, 500)

        for _ in range(num_contracts_per_symbol):
            option_type = rng.choice(["C", "P"])
            strike = round(
                underlying_price * rng.uniform(0.7, 1.3),
                1,
            )
            dte = rng.randint(30, 730)
            expiration = snapshot_date + timedelta(days=dte)

            # Price decreases as strike moves away from underlying
            moneyness = strike / underlying_price
            if option_type == "C":
                intrinsic = max(0, underlying_price - strike)
            else:
                intrinsic = max(0, strike - underlying_price)

            time_value = rng.uniform(0.5, 15)
            last_price = round(intrinsic + time_value, 2)
            bid = round(last_price * 0.95, 2)
            ask = round(last_price * 1.05, 2)

            # Volume and OI
            volume = rng.randint(0, 5000)
            open_interest = rng.randint(100, 50000)

            # Greeks (approximate)
            if option_type == "C":
                delta = max(0.01, min(0.99, 1 - abs(moneyness - 1) * 2))
            else:
                delta = -max(0.01, min(0.99, 1 - abs(moneyness - 1) * 2))

            gamma = rng.uniform(0.001, 0.05)
            theta = -rng.uniform(0.01, 0.5)
            vega = rng.uniform(0.01, 2.0)
            iv = rng.uniform(0.15, 0.80)

            records.append({
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
            })

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

        records.append({
            "date": day,
            "symbol": symbol,
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": max(0, volume),
        })

        price = close_p

    return pl.DataFrame(records)
