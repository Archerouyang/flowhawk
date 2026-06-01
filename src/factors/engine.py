"""Factor computation engine for options anomaly scoring.

Computes cross-sectional factors from a daily options snapshot.
All factors are normalized to [0, 1] or z-scored within category.
"""

from datetime import date

import polars as pl
import numpy as np

from src.data_sources.mock import SymbolMeta


class FactorEngine:
    """Compute factor values for each symbol from options snapshot."""

    # LEAP cutoff: 90 days
    LEAP_DTE_MIN = 90

    def __init__(self, df_snapshot: pl.DataFrame, meta_map: dict[str, SymbolMeta]):
        """Initialize with daily snapshot and symbol metadata.

        Args:
            df_snapshot: Polars DataFrame with columns:
                symbol, option_type, strike, expiration, bid, ask, last_price,
                volume, open_interest, delta, gamma, theta, vega,
                implied_volatility, underlying_price, snapshot_date
            meta_map: symbol -> SymbolMeta mapping
        """
        self.df = df_snapshot
        self.meta = meta_map
        self.today = date.today()

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def compute(self) -> dict[str, dict[str, float]]:
        """Compute all factor values per symbol.

        Returns:
            {symbol: {factor_name: value}}
        """
        if self.df.is_empty():
            return {}

        # Precompute DTE
        df = self.df.with_columns(
            (pl.col("expiration") - pl.col("snapshot_date"))
            .dt.total_days()
            .alias("dte")
        )

        results: dict[str, dict[str, float]] = {}
        for sym in df["symbol"].unique().to_list():
            sym_df = df.filter(pl.col("symbol") == sym)
            meta = self.meta.get(sym)
            if meta is None:
                continue

            factors = {}
            factors.update(self._cp_ratio_factors(sym_df))
            factors.update(self._leap_factors(sym_df))
            factors.update(self._activity_factors(sym_df))
            factors.update(self._greeks_factors(sym_df))
            factors.update(self._iv_factors(sym_df))
            factors.update(self._spread_factors(sym_df))
            factors.update(self._mock_other_factors(meta))
            results[sym] = factors

        return results

    # ------------------------------------------------------------------ #
    # Options Core Factors
    # ------------------------------------------------------------------ #

    def _cp_ratio_factors(self, df: pl.DataFrame) -> dict[str, float]:
        """Call/Put ratio factors."""
        calls = df.filter(pl.col("option_type") == "C")
        puts = df.filter(pl.col("option_type") == "P")

        call_vol = float(calls["volume"].sum()) if calls.height else 0.0
        put_vol = float(puts["volume"].sum()) if puts.height else 0.0
        call_oi = float(calls["open_interest"].sum()) if calls.height else 0.0
        put_oi = float(puts["open_interest"].sum()) if puts.height else 0.0

        # LEAPS subset
        leaps = df.filter(pl.col("dte") >= self.LEAP_DTE_MIN)
        leap_calls = (
            leaps.filter(pl.col("option_type") == "C") if leaps.height else None
        )
        leap_puts = leaps.filter(pl.col("option_type") == "P") if leaps.height else None
        leap_call_vol = (
            float(leap_calls["volume"].sum())
            if leap_calls is not None and leap_calls.height
            else 0.0
        )
        leap_put_vol = (
            float(leap_puts["volume"].sum())
            if leap_puts is not None and leap_puts.height
            else 0.0
        )
        leap_call_oi = (
            float(leap_calls["open_interest"].sum())
            if leap_calls is not None and leap_calls.height
            else 0.0
        )
        leap_put_oi = (
            float(leap_puts["open_interest"].sum())
            if leap_puts is not None and leap_puts.height
            else 0.0
        )

        # Non-LEAPS subset
        nonleaps = df.filter(pl.col("dte") < self.LEAP_DTE_MIN)
        nl_calls = (
            nonleaps.filter(pl.col("option_type") == "C") if nonleaps.height else None
        )
        nl_puts = (
            nonleaps.filter(pl.col("option_type") == "P") if nonleaps.height else None
        )
        nl_call_vol = (
            float(nl_calls["volume"].sum())
            if nl_calls is not None and nl_calls.height
            else 0.0
        )
        nl_put_vol = (
            float(nl_puts["volume"].sum())
            if nl_puts is not None and nl_puts.height
            else 0.0
        )

        return {
            "volume_cp_ratio": _safe_ratio(call_vol, put_vol),
            "oi_cp_ratio": _safe_ratio(call_oi, put_oi),
            "leap_volume_cp_ratio": _safe_ratio(leap_call_vol, leap_put_vol),
            "nonleap_volume_cp_ratio": _safe_ratio(nl_call_vol, nl_put_vol),
            "leap_oi_cp_ratio": _safe_ratio(leap_call_oi, leap_put_oi),
        }

    def _leap_factors(self, df: pl.DataFrame) -> dict[str, float]:
        """LEAP characteristic factors."""
        total_vol = float(df["volume"].sum())
        total_oi = float(df["open_interest"].sum())

        leaps = df.filter(pl.col("dte") >= self.LEAP_DTE_MIN)
        leap_vol = float(leaps["volume"].sum()) if leaps.height else 0.0
        leap_oi = float(leaps["open_interest"].sum()) if leaps.height else 0.0
        leap_premium = (
            float((leaps["last_price"] * leaps["volume"] * 100).sum())
            if leaps.height
            else 0.0
        )
        total_premium = float((df["last_price"] * df["volume"] * 100).sum())

        return {
            "leap_ratio": _safe_ratio(leap_vol, total_vol),
            "leap_oi_ratio": _safe_ratio(leap_oi, total_oi),
            "leap_premium_ratio": _safe_ratio(leap_premium, total_premium),
        }

    def _activity_factors(self, df: pl.DataFrame) -> dict[str, float]:
        """Activity-based factors."""
        total_vol = float(df["volume"].sum())
        total_oi = float(df["open_interest"].sum())
        premium = float((df["last_price"] * df["volume"] * 100).sum())

        # OI change: not available in single-day snapshot, use proxy
        # In production: compare with yesterday's OI
        oi_change = 0.0

        return {
            "voi_ratio": _safe_ratio(total_vol, total_oi),
            "volume_spike": 1.0,  # Placeholder: requires historical data
            "premium": premium / 1e6,  # in millions
            "oi_change": oi_change,
        }

    def _greeks_factors(self, df: pl.DataFrame) -> dict[str, float]:
        """Greeks-based factors."""
        # Use the most active contract as representative
        hottest = df.sort("volume", descending=True).head(1)
        if hottest.is_empty():
            return {
                "delta": 0.0,
                "theta_price_ratio": 0.0,
                "gamma": 0.0,
                "vega": 0.0,
                "delta_quality": 0.0,
            }

        delta = float(hottest["delta"][0])
        theta = float(hottest["theta"][0]) if "theta" in hottest.columns else 0.0
        last_price = float(hottest["last_price"][0])
        gamma = float(hottest["gamma"][0]) if "gamma" in hottest.columns else 0.0
        vega = float(hottest["vega"][0]) if "vega" in hottest.columns else 0.0

        # Delta quality: closer to 0.725 = better
        delta_abs = abs(delta)
        delta_quality = max(0.0, 1.0 - abs(delta_abs - 0.725) / 0.725)

        return {
            "delta": delta,
            "theta_price_ratio": abs(theta) / last_price if last_price > 0 else 0.0,
            "gamma": gamma,
            "vega": vega,
            "delta_quality": delta_quality,
        }

    def _iv_factors(self, df: pl.DataFrame) -> dict[str, float]:
        """Implied volatility factors."""
        # IV rank: placeholder (requires historical IV)
        # Use average IV as proxy
        _iv_mean = df["implied_volatility"].mean()  # type: ignore[assignment]
        avg_iv = float(_iv_mean) if _iv_mean is not None else 0.3  # type: ignore[arg-type]

        # IV skew: ATM put IV - ATM call IV
        calls = df.filter(pl.col("option_type") == "C")
        puts = df.filter(pl.col("option_type") == "P")
        _civ = calls["implied_volatility"].mean()  # type: ignore[assignment]
        call_iv = float(_civ) if _civ is not None else avg_iv  # type: ignore[arg-type]
        _piv = puts["implied_volatility"].mean()  # type: ignore[assignment]
        put_iv = float(_piv) if _piv is not None else avg_iv  # type: ignore[arg-type]

        # Term structure: compare far-dated vs near-dated IV
        leaps = df.filter(pl.col("dte") >= self.LEAP_DTE_MIN)
        nonleaps = df.filter(pl.col("dte") < self.LEAP_DTE_MIN)
        _liv = leaps["implied_volatility"].mean()  # type: ignore[assignment]
        leap_iv = float(_liv) if _liv is not None else avg_iv  # type: ignore[arg-type]
        _niv = nonleaps["implied_volatility"].mean()  # type: ignore[assignment]
        nonleap_iv = float(_niv) if _niv is not None else avg_iv  # type: ignore[arg-type]

        return {
            "iv_rank": avg_iv,  # Placeholder
            "iv_skew": put_iv - call_iv,
            "term_structure": leap_iv - nonleap_iv,
        }

    def _spread_factors(self, df: pl.DataFrame) -> dict[str, float]:
        """Spread and liquidity factors."""
        _bid = df["bid"].mean()  # type: ignore[assignment]
        avg_bid = float(_bid) if _bid is not None else 0.0  # type: ignore[arg-type]
        _ask = df["ask"].mean()  # type: ignore[assignment]
        avg_ask = float(_ask) if _ask is not None else 0.0  # type: ignore[arg-type]
        spread_ratio = (avg_ask - avg_bid) / avg_ask if avg_ask > 0 else 0.0

        _dte = df["dte"].mean() if "dte" in df.columns else None  # type: ignore[assignment]
        avg_dte = float(_dte) if _dte is not None else 180.0  # type: ignore[arg-type]

        return {
            "spread_ratio": spread_ratio,
            "dte": avg_dte,
        }

    # ------------------------------------------------------------------ #
    # Mock / Placeholder Factors (non-options)
    # ------------------------------------------------------------------ #

    def _mock_other_factors(self, meta: SymbolMeta) -> dict[str, float]:
        """Generate mock values for value, macro, and news factors."""
        rng = np.random.RandomState(hash(meta.symbol) % 2**31)

        # Value factors
        if meta.category == "big_cap":
            pe = rng.uniform(15, 35)
            pb = rng.uniform(3, 8)
            ps = rng.uniform(3, 10)
            dividend_yield = rng.uniform(0.5, 2.5)
            roe = rng.uniform(15, 30)
        elif meta.category == "small_cap":
            pe = (
                rng.uniform(40, 100) if rng.random() > 0.3 else rng.uniform(-50, 0)
            )  # some unprofitable
            pb = rng.uniform(1, 5)
            ps = rng.uniform(2, 15)
            dividend_yield = rng.uniform(0, 0.5)
            roe = rng.uniform(-10, 20)
        else:  # ETF
            pe = rng.uniform(20, 30)
            pb = rng.uniform(2, 5)
            ps = rng.uniform(2, 6)
            dividend_yield = rng.uniform(1.0, 3.0)
            roe = rng.uniform(10, 20)

        return {
            # Value
            "pe_ttm": pe,
            "pb_ratio": pb,
            "ps_ratio": ps,
            "ev_ebitda": pe * 0.8,  # Proxy
            "dividend_yield": dividend_yield,
            "roe": roe,
            "profit_margin": rng.uniform(5, 25),
            "debt_equity": rng.uniform(0.2, 1.0),
            # Macro (same for all, should come from global state in production)
            "vix_level": 18.5,
            "yield_curve_slope": 0.8,
            "dxy_trend": 0.02,
            "credit_spread": 3.2,
            "fed_funds_expectation": -0.25,
            "put_call_index": 0.95,
            # Fama-French (symbol-specific loadings)
            "mkt_rf": 1.0,
            "smb": -0.3 if meta.category == "big_cap" else 0.8,
            "hml": 0.2 if meta.category == "big_cap" else -0.1,
            # News
            "news_sentiment_score": rng.uniform(-0.3, 0.5),
            "news_volume": rng.randint(5, 50),
            "social_mention_velocity": rng.uniform(-0.2, 0.8),
            "insider_buy_ratio": rng.uniform(0.5, 3.0),
            "analyst_rating_change": rng.randint(-2, 3),
        }


# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #


def _safe_ratio(numerator: float, denominator: float) -> float:
    """Safe division with fallback."""
    if denominator <= 0:
        return 999.0 if numerator > 0 else 0.0
    return numerator / denominator


def compute_all_factors(
    df_snapshot: pl.DataFrame,
    meta_map: dict[str, SymbolMeta],
) -> dict[str, dict[str, float]]:
    """Convenience function: compute all factors from snapshot."""
    engine = FactorEngine(df_snapshot, meta_map)
    return engine.compute()
