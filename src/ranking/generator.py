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
from src.utils.contract_code import encode as encode_contract_code


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
    # LEAP C/P ratio (underlying-level)
    leap_cp_ratio: float
    # Narrative
    narrative: str


class RankingGenerator:
    """Generate daily contract-level rankings."""

    DRAGON_TIGER_TOP_N = 25
    CATEGORY_TOP_N = 25
    LEAP_DTE_MIN = 90

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
            return {
                "dragon_tiger": [],
                "individual": [],
                "etf": [],
                "premium": [],
            }

        # Precompute per-symbol LEAP C/P ratio (DTE >= 90)
        leap_cp_map = self._compute_leap_cp_ratio()

        # Build contract entries from snapshot
        all_entries: list[ContractEntry] = []
        for row in self.df.iter_rows(named=True):
            entry = self._build_entry(row, leap_cp_map)
            all_entries.append(entry)

        import dataclasses

        # Dragon-Tiger: Top 25 by volume
        all_entries.sort(key=lambda e: e.volume, reverse=True)
        dragon_tiger = [
            dataclasses.replace(e, rank=i + 1)
            for i, e in enumerate(all_entries[: self.DRAGON_TIGER_TOP_N])
        ]

        # Individual stocks (not ETF) by volume
        individual = [
            dataclasses.replace(e, rank=i + 1)
            for i, e in enumerate(
                [e for e in all_entries if not e.is_etf][: self.CATEGORY_TOP_N]
            )
        ]

        # ETF by volume
        etf_entries = [
            dataclasses.replace(e, rank=i + 1)
            for i, e in enumerate(
                [e for e in all_entries if e.is_etf][: self.CATEGORY_TOP_N]
            )
        ]

        # Premium ranking: Top 25 by premium (all contracts)
        all_entries.sort(key=lambda e: e.premium, reverse=True)
        premium_entries = [
            dataclasses.replace(e, rank=i + 1)
            for i, e in enumerate(all_entries[: self.CATEGORY_TOP_N])
        ]

        return {
            "dragon_tiger": dragon_tiger,
            "individual": individual,
            "etf": etf_entries,
            "premium": premium_entries,
        }

    def _compute_leap_cp_ratio(self) -> dict[str, float]:
        """Compute LEAP C/P ratio per symbol (DTE >= 90)."""
        if self.df.is_empty():
            return {}

        # Ensure dte column exists
        df = self.df.with_columns(
            (pl.col("expiration") - pl.col("snapshot_date"))
            .dt.total_days()
            .alias("dte")
        )

        leap_cp_map: dict[str, float] = {}
        for sym in df["symbol"].unique().to_list():
            sym_df = df.filter(pl.col("symbol") == sym)
            leaps = sym_df.filter(pl.col("dte") >= self.LEAP_DTE_MIN)
            if leaps.is_empty():
                leap_cp_map[sym] = 0.0
                continue

            call_vol = float(leaps.filter(pl.col("option_type") == "C")["volume"].sum())
            put_vol = float(leaps.filter(pl.col("option_type") == "P")["volume"].sum())
            leap_cp_map[sym] = call_vol / put_vol if put_vol > 0 else 999.0

        return leap_cp_map

    def _build_entry(self, row: dict, leap_cp_map: dict[str, float]) -> ContractEntry:
        """Build a ContractEntry from a snapshot row."""
        sym = row["symbol"]
        meta = self.meta.get(sym)
        is_etf = meta.is_etf if meta else False

        strike = float(row["strike"])
        exp = row["expiration"]
        if isinstance(exp, date):
            exp_str = exp.strftime("%Y-%m-%d")
        else:
            exp_str = str(exp)

        option_type = row["option_type"]
        contract_code = encode_contract_code(sym, exp, option_type, strike)

        last_price = float(row["last_price"])
        bid = float(row["bid"])
        ask = float(row["ask"])
        iv = float(row.get("implied_volatility", 0.3))
        volume = int(row["volume"])
        oi = int(row["open_interest"])
        leap_cp_ratio = leap_cp_map.get(sym, 0.0)

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
            leap_cp_ratio=round(leap_cp_ratio, 2),
            narrative=narrative,
        )

    # TODO: Replace with actual anomaly narrative generation
    # Current: simple rule-based mock. Need: historical context, sentiment,
    #          premium ranking, Greeks profile, LEAP sentiment analysis.
    # See docs/CONTEXT.md for planned dimensions.
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
