"""Daily anomaly ranking generator — contract-level leaderboard.

Produces:
1. Volume Dragon-Tiger Ranking (Top 25 by volume across all contracts)
2. Individual Stock Options Anomaly Ranking (top contracts per stock)
3. ETF Options Anomaly Ranking (top contracts per ETF)
"""

from dataclasses import dataclass
from datetime import date

import numpy as np
import polars as pl

from src.data_sources.mock import SymbolMeta


@dataclass(frozen=True, slots=True)
class ContractEntry:
    """Single option contract in the leaderboard."""

    rank: int
    underlying: str  # e.g. AAPL
    is_etf: bool
    contract_code: str  # e.g. AAPL260618C185
    strike: float
    expiration: str  # YYYY-MM-DD
    option_type: str  # C or P
    # Price
    last_price: float
    high: float
    low: float
    change_pct: float  # vs previous close
    bid: float
    ask: float
    # Volume
    volume: int
    volume_vs_avg: float  # multiple of 20-day average
    premium: float  # USD in millions
    # OI
    open_interest: int
    oi_change: int
    # IV
    iv: float
    iv_change_pct: float
    # Greeks
    delta: float
    gamma: float
    theta: float
    vega: float
    # Narrative
    narrative: str


class RankingGenerator:
    """Generate daily contract-level rankings."""

    DRAGON_TIGER_TOP_N = 25
    CATEGORY_TOP_N = 15

    def __init__(
        self,
        df_snapshot: "pl.DataFrame",
        meta_map: dict[str, SymbolMeta],
    ):
        self.df = df_snapshot
        self.meta = meta_map

    def generate(self) -> dict[str, list[ContractEntry]]:
        """Generate all rankings.

        Returns:
            {
                "dragon_tiger": [...],   # Top 25 by volume (all contracts)
                "individual": [...],     # Top stock-option contracts
                "etf": [...],            # Top ETF-option contracts
            }
        """
        if self.df.is_empty():
            return {"dragon_tiger": [], "individual": [], "etf": []}

        # Build contract entries from snapshot
        all_entries: list[ContractEntry] = []
        for row in self.df.iter_rows(named=True):
            entry = self._build_entry(row)
            all_entries.append(entry)

        # Sort by volume desc
        all_entries.sort(key=lambda e: e.volume, reverse=True)

        import dataclasses

        # Dragon-Tiger: Top 25 overall
        dragon_tiger = all_entries[: self.DRAGON_TIGER_TOP_N]
        dragon_tiger = [
            dataclasses.replace(e, rank=i + 1) for i, e in enumerate(dragon_tiger)
        ]

        # Individual stocks (not ETF)
        individual = [e for e in all_entries if not e.is_etf][: self.CATEGORY_TOP_N]
        individual = [
            dataclasses.replace(e, rank=i + 1) for i, e in enumerate(individual)
        ]

        # ETF
        etf_entries = [e for e in all_entries if e.is_etf][: self.CATEGORY_TOP_N]
        etf_entries = [
            dataclasses.replace(e, rank=i + 1) for i, e in enumerate(etf_entries)
        ]

        return {
            "dragon_tiger": dragon_tiger,
            "individual": individual,
            "etf": etf_entries,
        }

    def _build_entry(self, row: dict) -> ContractEntry:
        """Build a ContractEntry from a snapshot row."""
        sym = row["symbol"]
        meta = self.meta.get(sym)
        is_etf = meta.is_etf if meta else False

        strike = float(row["strike"])
        exp = row["expiration"]
        if isinstance(exp, date):
            exp_str = exp.strftime("%Y-%m-%d")
            exp_code = exp.strftime("%y%m%d")
        else:
            exp_str = str(exp)
            exp_code = exp_str[2:4] + exp_str[5:7] + exp_str[8:10]

        option_type = row["option_type"]
        contract_code = f"{sym}{exp_code}{option_type}{strike:g}"

        last_price = float(row["last_price"])
        bid = float(row["bid"])
        ask = float(row["ask"])
        iv = float(row.get("implied_volatility", 0.3))
        volume = int(row["volume"])
        oi = int(row["open_interest"])

        # Mock HLC: use last_price as close, generate high/low from IV
        rng = np.random.RandomState(hash(contract_code) % 2**31)
        daily_vol = iv / np.sqrt(252)  # approximate daily vol from IV
        high = last_price * (1 + abs(rng.normal(0, daily_vol)))
        low = last_price * (1 - abs(rng.normal(0, daily_vol)))
        low = min(low, last_price)  # ensure low <= close
        high = max(high, last_price)  # ensure high >= close

        # Mock change %
        change_pct = rng.normal(0, daily_vol * 100)

        # Volume vs avg (mock)
        volume_vs_avg = rng.uniform(1.5, 15.0)

        # Premium in millions
        premium = last_price * volume * 100 / 1e6

        # Mock OI change
        oi_change = int(rng.randint(-5000, 10000))

        # Mock IV change
        iv_change_pct = rng.uniform(-15, 25)

        # Greeks
        delta = float(row.get("delta", 0.0))
        gamma = float(row.get("gamma", 0.0))
        theta = float(row.get("theta", 0.0))
        vega = float(row.get("vega", 0.0))

        # Narrative
        narrative = self._build_narrative(
            sym, is_etf, option_type, volume, volume_vs_avg, iv_change_pct
        )

        return ContractEntry(
            rank=0,  # assigned later
            underlying=sym,
            is_etf=is_etf,
            contract_code=contract_code,
            strike=strike,
            expiration=exp_str,
            option_type=option_type,
            last_price=round(last_price, 2),
            high=round(high, 2),
            low=round(low, 2),
            change_pct=round(change_pct, 2),
            bid=round(bid, 2),
            ask=round(ask, 2),
            volume=volume,
            volume_vs_avg=round(volume_vs_avg, 1),
            premium=round(premium, 2),
            open_interest=oi,
            oi_change=oi_change,
            iv=round(iv, 4),
            iv_change_pct=round(iv_change_pct, 2),
            delta=round(delta, 3),
            gamma=round(gamma, 4),
            theta=round(theta, 4),
            vega=round(vega, 4),
            narrative=narrative,
        )

    @staticmethod
    def _build_narrative(
        sym: str,
        is_etf: bool,
        option_type: str,
        volume: int,
        volume_vs_avg: float,
        iv_change_pct: float,
    ) -> str:
        """Generate narrative for a contract."""
        type_str = "Call" if option_type == "C" else "Put"

        if volume_vs_avg > 10:
            flow = f"🔥 {volume_vs_avg:.1f}x volume spike"
        elif volume_vs_avg > 5:
            flow = f"⚡ {volume_vs_avg:.1f}x volume surge"
        elif volume_vs_avg > 2:
            flow = f"📈 {volume_vs_avg:.1f}x above avg"
        else:
            flow = ""

        iv_str = ""
        if iv_change_pct > 15:
            iv_str = "IV jumping"
        elif iv_change_pct < -10:
            iv_str = "IV collapsing"

        if is_etf:
            base = f"{sym} {type_str} — hedge/rotation flow"
        else:
            base = f"{sym} {type_str} — directional bet"

        parts = [p for p in [base, flow, iv_str] if p]
        return " | ".join(parts)


def generate_contract_rankings(
    df_snapshot: "pl.DataFrame",
    meta_map: dict[str, SymbolMeta],
) -> dict[str, list[ContractEntry]]:
    """Convenience function."""
    generator = RankingGenerator(df_snapshot, meta_map)
    return generator.generate()
