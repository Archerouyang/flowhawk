"""Signal classifier — detect 5 anomaly patterns from options data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum
from typing import Protocol

import polars as pl


class PriceDataSource(Protocol):
    """Seam for injecting per-symbol price change data."""

    def get_change(self, symbol: str) -> float:
        """Return the daily price change ratio for the given symbol."""
        ...


class SignalType(str, Enum):
    SMART_MONEY = "smart_money"
    FIRST_TIMER = "first_timer"
    INDEX_HEDGE = "index_hedge"
    GAMMA_SQUEEZE = "gamma_squeeze"
    SECTOR_ROTATION = "sector_rotation"


@dataclass(frozen=True, slots=True)
class SymbolMeta:
    """Per-symbol metadata needed for classification."""

    symbol: str
    market_cap: float  # in billions
    sector: str
    is_etf: bool
    avg_volume_30d: float
    category: str = ""  # "big_cap" | "small_cap" | "etf"


@dataclass(frozen=True, slots=True)
class AnomalyRow:
    """Flattened anomaly record for classification."""

    symbol: str
    option_type: str
    strike: float
    expiration: date
    last_price: float
    volume: int
    open_interest: int
    voi_ratio: float
    delta: float
    gamma: float
    theta: float
    vega: float
    implied_volatility: float
    anomaly_score: float


@dataclass(frozen=True, slots=True)
class DetectedSignal:
    """Output of the classifier."""

    symbol: str
    signal_type: SignalType
    contract_desc: str  # e.g. "260618.C.67.5"
    dte: int
    strike_distance_pct: float
    cp_ratio: float
    leap_ratio: float
    narrative: str
    confidence: float  # 0-1, pre-scoring


class SignalClassifier:
    """Classify options anomalies into actionable signal types."""

    # Thresholds tuned from empirical observations
    LEAP_DTE_MIN = 90
    CP_BULLISH = 2.0
    CP_BEARISH = 0.5
    LEAP_RATIO_MIN = 3.0
    LEAPS_CALL_RATE_EXTREME = 10.0
    VOLUME_SPIKE = 10.0
    PRICE_MOVE_GAMMA = 0.15

    def __init__(
        self,
        *,
        price_source: PriceDataSource,
        history_symbols: set[str] | None = None,
    ):
        """
        Args:
            price_source: source of per-symbol daily price changes.
            history_symbols: symbols that have appeared in anomalies
                within the last 90 days. Used for First Timer detection.
        """
        self._price_source = price_source
        self._history = history_symbols or set()

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def classify(
        self,
        anomalies: pl.DataFrame,
        meta_map: dict[str, SymbolMeta],
    ) -> list[DetectedSignal]:
        """Run all 5 detectors over the anomaly set.

        Returns a deduplicated list — a symbol may match multiple patterns,
        but we keep the highest-confidence match only.
        """
        all_signals: list[DetectedSignal] = []

        # Aggregate per-symbol stats first (needed for several detectors)
        sym_stats = self.aggregate_symbol_stats(anomalies)

        for row in anomalies.iter_rows(named=True):
            sym = row["symbol"]
            meta = meta_map.get(sym)
            if meta is None:
                continue

            stats = sym_stats[sym]
            anom = self._to_anomaly_row(row)

            candidates = [
                self._detect_smart_money(anom, meta, stats),
                self._detect_first_timer(anom, meta, stats),
                self._detect_index_hedge(anom, meta, stats),
                self._detect_gamma_squeeze(anom, meta, stats),
            ]

            best = max(
                (c for c in candidates if c is not None),
                key=lambda s: s.confidence,
                default=None,
            )
            if best:
                all_signals.append(best)

        # Sector rotation is a cross-symbol pattern
        all_signals.extend(self._detect_sector_rotation(sym_stats, meta_map))

        # Deduplicate by symbol + signal_type — signals are symbol-level,
        # not contract-level. Keep highest confidence per (symbol, type).
        best_by_type: dict[tuple[str, SignalType], DetectedSignal] = {}
        for sig in all_signals:
            key = (sig.symbol, sig.signal_type)
            if key not in best_by_type or sig.confidence > best_by_type[key].confidence:
                best_by_type[key] = sig

        return list(best_by_type.values())

    # ------------------------------------------------------------------ #
    # Detectors
    # ------------------------------------------------------------------ #

    def _detect_smart_money(
        self,
        anom: AnomalyRow,
        meta: SymbolMeta,
        stats: dict,
    ) -> DetectedSignal | None:
        """Smart Money LEAPS: down/flat day + extreme call activity in far-dated."""
        dte = (anom.expiration - date.today()).days
        if dte < self.LEAP_DTE_MIN:
            return None

        cp_leaps = stats.get("cp_ratio_leaps", 1.0)
        leap = stats.get("leap_ratio", 0.0)
        price_change = stats.get("price_change_day", 0.0)

        if cp_leaps < self.CP_BULLISH or leap < self.LEAP_RATIO_MIN:
            return None
        if price_change >= 0.02:
            return None

        conf = 0.6
        if price_change < 0:
            conf += 0.15
        if leap > 5:
            conf += 0.1
        if anom.voi_ratio > 3:
            conf += 0.1
        if cp_leaps > 5:
            conf += 0.1

        strike_dist = (anom.strike - anom.last_price) / anom.last_price
        narrative = (
            f"{anom.symbol} 跌/平 {price_change:.1%}，"
            f"但 {dte} 天 {anom.strike:.1f} call 异常堆积——聪明钱在建远月仓"
        )

        return DetectedSignal(
            symbol=anom.symbol,
            signal_type=SignalType.SMART_MONEY,
            contract_desc=f"{anom.expiration.strftime('%y%m%d')}.{anom.option_type}.{anom.strike}",
            dte=dte,
            strike_distance_pct=strike_dist,
            cp_ratio=cp_leaps,
            leap_ratio=leap,
            narrative=narrative,
            confidence=min(conf, 0.95),
        )

    def _detect_first_timer(
        self,
        anom: AnomalyRow,
        meta: SymbolMeta,
        stats: dict,
    ) -> DetectedSignal | None:
        """First Timer: never seen before + extreme LEAPS call rate."""
        if anom.symbol in self._history:
            return None

        leaps_call_rate = stats.get("leaps_call_rate", 0.0)
        if not (self.LEAPS_CALL_RATE_EXTREME <= leaps_call_rate <= 100):
            return None

        conf = 0.7
        if meta.market_cap < 2:
            conf += 0.15
        if leaps_call_rate > 20:
            conf += 0.1

        dte = (anom.expiration - date.today()).days
        narrative = (
            f"{anom.symbol} 首次上榜，LEAPS call {leaps_call_rate:.1f}x——"
            f"小盘/新叙事，容易被忽视"
        )

        return DetectedSignal(
            symbol=anom.symbol,
            signal_type=SignalType.FIRST_TIMER,
            contract_desc=f"{anom.expiration.strftime('%y%m%d')}.{anom.option_type}.{anom.strike}",
            dte=dte,
            strike_distance_pct=(anom.strike - anom.last_price) / anom.last_price,
            cp_ratio=stats.get("cp_ratio", 0.0),
            leap_ratio=stats.get("leap_ratio", 0.0),
            narrative=narrative,
            confidence=min(conf, 0.95),
        )

    def _detect_index_hedge(
        self,
        anom: AnomalyRow,
        meta: SymbolMeta,
        stats: dict,
    ) -> DetectedSignal | None:
        """Index Hedge: ETF puts堆积 while underlying bullish."""
        if not meta.is_etf:
            return None

        cp_all = stats.get("cp_ratio_all", 1.0)
        price_change = stats.get("price_change_day", 0.0)
        put_wall = stats.get("put_wall_ratio", 0.0)

        if cp_all >= self.CP_BEARISH or price_change < 0.005:
            return None
        if put_wall < 0.3:
            return None

        dte = (anom.expiration - date.today()).days
        narrative = (
            f"{anom.symbol} 涨 {price_change:.1%}，但 put 墙高耸——机构在锁尾部风险"
        )

        return DetectedSignal(
            symbol=anom.symbol,
            signal_type=SignalType.INDEX_HEDGE,
            contract_desc=f"{anom.expiration.strftime('%y%m%d')}.{anom.option_type}.{anom.strike}",
            dte=dte,
            strike_distance_pct=(anom.strike - anom.last_price) / anom.last_price,
            cp_ratio=cp_all,
            leap_ratio=stats.get("leap_ratio", 0.0),
            narrative=narrative,
            confidence=0.75,
        )

    def _detect_gamma_squeeze(
        self,
        anom: AnomalyRow,
        meta: SymbolMeta,
        stats: dict,
    ) -> DetectedSignal | None:
        """Gamma Squeeze: small-cap + massive day move + call concentration."""
        if meta.market_cap >= 5:
            return None

        price_change = stats.get("price_change_day", 0.0)
        cp_all = stats.get("cp_ratio_all", 1.0)
        leap = stats.get("leap_ratio", 0.0)
        vol_spike = stats.get("volume_vs_avg", 0.0)

        if price_change < self.PRICE_MOVE_GAMMA or cp_all < 3.0:
            return None
        if leap < 5.0 and vol_spike < self.VOLUME_SPIKE:
            return None

        dte = (anom.expiration - date.today()).days
        narrative = (
            f"{anom.symbol} 单日 +{price_change:.1%}，"
            f"{vol_spike:.1f}x 放量——远月也堆 call，赌的不是今天"
        )

        return DetectedSignal(
            symbol=anom.symbol,
            signal_type=SignalType.GAMMA_SQUEEZE,
            contract_desc=f"{anom.expiration.strftime('%y%m%d')}.{anom.option_type}.{anom.strike}",
            dte=dte,
            strike_distance_pct=(anom.strike - anom.last_price) / anom.last_price,
            cp_ratio=cp_all,
            leap_ratio=leap,
            narrative=narrative,
            confidence=0.7,
        )

    def _detect_sector_rotation(
        self,
        sym_stats: dict[str, dict],
        meta_map: dict[str, SymbolMeta],
    ) -> list[DetectedSignal]:
        """Sector Rotation: 3+ symbols in same sector with bullish anomalies."""
        sector_symbols: dict[str, list[str]] = {}
        for sym, stats in sym_stats.items():
            meta = meta_map.get(sym)
            if meta is None:
                continue
            cp_all = stats.get("cp_ratio_all", 1.0)
            if cp_all < self.CP_BULLISH:
                continue
            sector_symbols.setdefault(meta.sector, []).append(sym)

        signals = []
        for sector, syms in sector_symbols.items():
            if len(syms) < 3:
                continue
            signals.append(
                DetectedSignal(
                    symbol=sector,  # use sector name as pseudo-symbol
                    signal_type=SignalType.SECTOR_ROTATION,
                    contract_desc="SECTOR",
                    dte=0,
                    strike_distance_pct=0.0,
                    cp_ratio=sum(sym_stats[s]["cp_ratio_all"] for s in syms)
                    / len(syms),
                    leap_ratio=sum(sym_stats[s].get("leap_ratio", 0) for s in syms)
                    / len(syms),
                    narrative=f"{sector} 今日 {len(syms)} 只标的异常——板块级资金流入",
                    confidence=min(0.6 + len(syms) * 0.05, 0.9),
                )
            )

        return signals

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def aggregate_symbol_stats(self, anomalies: pl.DataFrame) -> dict[str, dict]:
        """Compute per-symbol aggregates needed by detectors.

        In production these come from real market data (FMP, Theta Data).
        Here we approximate from the anomaly DataFrame itself for the
        mock/development path.
        """
        stats: dict[str, dict] = {}

        for sym in anomalies["symbol"].unique().to_list():
            df_sym = anomalies.filter(pl.col("symbol") == sym)

            total_vol = df_sym["volume"].sum()
            total_oi = df_sym["open_interest"].sum()

            today = date.today()
            leap_cutoff = today + timedelta(days=90)

            # --- All contracts ---
            all_calls = df_sym.filter(pl.col("option_type") == "C")
            all_puts = df_sym.filter(pl.col("option_type") == "P")
            all_call_vol = float(all_calls["volume"].sum()) if all_calls.height else 0.0
            all_put_vol = float(all_puts["volume"].sum()) if all_puts.height else 0.0
            cp_ratio_all = all_call_vol / all_put_vol if all_put_vol > 0 else 999.0

            # --- LEAPS only (far-dated) ---
            leaps = df_sym.filter(pl.col("expiration") > leap_cutoff)
            leap_calls = (
                leaps.filter(pl.col("option_type") == "C") if leaps.height else None
            )
            leap_puts = (
                leaps.filter(pl.col("option_type") == "P") if leaps.height else None
            )
            lc_vol = (
                float(leap_calls["volume"].sum())
                if leap_calls is not None and leap_calls.height
                else 0.0
            )
            lp_vol = (
                float(leap_puts["volume"].sum())
                if leap_puts is not None and leap_puts.height
                else 0.0
            )

            # LEAPS C/P ratio — the "LEAP ratio" in user analysis (e.g. 4.53)
            cp_ratio_leaps = lc_vol / lp_vol if lp_vol > 0.0 else 0.0
            # Also track as leap_ratio for backward-compat in detector logic
            leap_ratio = cp_ratio_leaps
            # Leaps call rate = same metric, capped to avoid infinity on tiny put vol
            leaps_call_rate = min(cp_ratio_leaps, 999.0) if cp_ratio_leaps > 0 else 0.0

            # Hottest contract
            hottest = df_sym.sort("volume", descending=True).head(1)
            hottest_vol = hottest["volume"][0] if hottest.height else 0
            vol_conc = hottest_vol / total_vol if total_vol > 0 else 0.0

            # Price change from injected source (production: yfinance / FMP / Theta Data)
            price_change = self._price_source.get_change(sym)

            stats[sym] = {
                "total_volume": total_vol,
                "total_oi": total_oi,
                "cp_ratio": cp_ratio_all,  # all contracts
                "cp_ratio_leaps": cp_ratio_leaps,  # LEAPS only
                "cp_ratio_all": cp_ratio_all,  # alias for clarity
                "leap_ratio": leap_ratio,
                "leaps_call_rate": leaps_call_rate,
                "volume_concentration": vol_conc,
                "price_change_day": price_change,
                "put_wall_ratio": 0.0,  # populated in production
                "volume_vs_avg": 1.0,  # populated in production
            }

        return stats

    @staticmethod
    def _to_anomaly_row(row: dict) -> AnomalyRow:
        exp = row["expiration"]
        if isinstance(exp, str):
            exp = date.fromisoformat(exp)
        return AnomalyRow(
            symbol=row["symbol"],
            option_type=row["option_type"],
            strike=row["strike"],
            expiration=exp,
            last_price=row["last_price"],
            volume=row["volume"],
            open_interest=row["open_interest"],
            voi_ratio=row["voi_ratio"],
            delta=row["delta"],
            gamma=row.get("gamma", 0.0),
            theta=row.get("theta", 0.0),
            vega=row.get("vega", 0.0),
            implied_volatility=row["implied_volatility"],
            anomaly_score=row["anomaly_score"],
        )
