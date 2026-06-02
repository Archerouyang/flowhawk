#!/usr/bin/env python3
"""Generate dynamic mock signals from Longbridge CLI data."""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Top US stocks to monitor
SYMBOLS = [
    "AAPL.US",
    "TSLA.US",
    "NVDA.US",
    "MSFT.US",
    "AMZN.US",
    "META.US",
    "GOOGL.US",
    "AMD.US",
]


def run_longbridge(*args: str) -> dict:
    """Run a longbridge CLI command and return parsed JSON."""
    cmd = ["longbridge", *args, "--format", "json"]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"Error running {' '.join(cmd)}: {result.stderr}", file=sys.stderr)
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"Invalid JSON from {' '.join(cmd)}", file=sys.stderr)
        return {}


def get_option_volume(sym: str) -> dict:
    """Get option volume for a symbol. Returns {call_vol, put_vol}."""
    data = run_longbridge("option", "volume", sym)
    return {
        "call": int(data.get("c", 0)),
        "put": int(data.get("p", 0)),
    }


def get_quote(sym: str) -> dict:
    """Get stock quote. Returns {price, change_pct, volume}."""
    data = run_longbridge("quote", sym)
    if not data or not isinstance(data, list):
        return {}
    q = data[0]
    return {
        "price": float(q.get("last", 0) or 0),
        "change_pct": float(q.get("change_percentage", 0) or 0),
        "volume": int(q.get("volume", 0) or 0),
    }


def get_option_chain(sym: str) -> list:
    """Get option expiry dates."""
    data = run_longbridge("option", "chain", sym)
    return data if isinstance(data, list) else []


def generate_mock_signals() -> list[dict]:
    """Generate mock ClassifiedSignal records from Longbridge data."""
    signals = []

    for sym in SYMBOLS:
        clean_sym = sym.replace(".US", "")
        vol = get_option_volume(sym)
        quote = get_quote(sym)
        chain = get_option_chain(sym)

        if not vol["call"] and not vol["put"]:
            continue

        # Derive signal type from data
        total_vol = vol["call"] + vol["put"]
        cp_ratio = vol["call"] / max(vol["put"], 1)
        is_bullish = cp_ratio > 2 and quote.get("change_pct", 0) > -2
        is_hedge = cp_ratio < 0.5 and quote.get("change_pct", 0) > 0

        if is_bullish:
            signal_type = "smart_money" if cp_ratio > 5 else "gamma_squeeze"
        elif is_hedge:
            signal_type = "index_hedge"
        else:
            signal_type = "first_timer"

        # Pick a random expiry from chain or default
        expiry = chain[0] if chain else "2026-12-18"

        # Generate synthetic strike near current price
        price = quote.get("price", 180)
        strike = round(price / 10) * 10

        # Score based on volume intensity
        volume_intensity = total_vol / max(10000, 1)
        composite_score = min(70 + int(volume_intensity * 5), 95)

        tier = (
            "🔴 conviction"
            if composite_score >= 85
            else "🟠 strong"
            if composite_score >= 70
            else "🟡 monitor"
        )

        signals.append(
            {
                "symbol": clean_sym,
                "option_type": "C" if is_bullish else "P",
                "strike": strike,
                "expiration": expiry,
                "last_price": round(price * 0.08, 2),
                "delta": round(0.55 + (composite_score / 100) * 0.25, 2),
                "gamma": round(0.008 + (composite_score / 10000), 3),
                "theta": round(-0.02 - (composite_score / 10000), 3),
                "vega": round(0.15 + (composite_score / 5000), 2),
                "implied_volatility": round(0.25 + (composite_score / 500), 2),
                "voi_ratio": round(cp_ratio, 2),
                "leaps_score": round(composite_score / 100, 2),
                "theta_price_ratio": round(0.002 + (composite_score / 50000), 4),
                "dte": 180,
                "signal_type": signal_type,
                "composite_score": composite_score,
                "tier": tier,
                "narrative": f"{clean_sym} {'+' if quote.get('change_pct', 0) >= 0 else ''}{quote.get('change_pct', 0):.1f}%, option C/P {cp_ratio:.1f}x — {signal_type.replace('_', ' ')} pattern detected.",
                "tags": [f"C/P ratio {cp_ratio:.1f}x", f"Vol {total_vol:,}"],
                "asset_type": "STOCK",
                "cap_type": "LARGE",
                "sector": "Technology",
            }
        )

    return signals


def main() -> None:
    """Entry point."""
    print("Fetching Longbridge option data...")
    signals = generate_mock_signals()

    output = {
        "generated_at": datetime.now().isoformat(),
        "count": len(signals),
        "signals": signals,
    }

    # Write to frontend public dir for dev consumption
    out_path = (
        Path(__file__).parent.parent / "frontend" / "public" / "mock_signals.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Generated {len(signals)} mock signals → {out_path}")
    for sig in signals:
        print(
            f"  {sig['symbol']} {sig['option_type']}${sig['strike']} | score={sig['composite_score']} | {sig['signal_type']}"
        )


if __name__ == "__main__":
    main()
