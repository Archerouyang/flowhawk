"""Anomaly scoring engine — composite score from factor values.

Phase 1: Heuristic weights (documented in FACTOR_LIBRARY.md)
Phase 2: IC-optimized weights from historical backtesting
"""

import numpy as np


class AnomalyScorer:
    """Compute anomaly score from factor values."""

    # Phase 1 heuristic weights (sum = 1.0)
    WEIGHTS: dict[str, float] = {
        # Options Core (50%)
        "voi_ratio": 0.15,
        "volume_cp_ratio": 0.15,
        "leap_volume_cp_ratio": 0.15,
        "theta_price_ratio": 0.10,
        "iv_rank": 0.10,
        "delta_quality": 0.10,
        "price_vs_sma20": 0.10,
        "spread_ratio": 0.05,
        "premium": 0.05,
        "rsi_14": 0.05,
        # Value (15%)
        "pe_ttm": 0.03,
        "pb_ratio": 0.03,
        "roe": 0.03,
        "dividend_yield": 0.03,
        "profit_margin": 0.03,
        # Macro (10%)
        "vix_level": 0.03,
        "yield_curve_slope": 0.02,
        "credit_spread": 0.02,
        "put_call_index": 0.03,
        # Fama-French (10%)
        "smb": 0.05,
        "hml": 0.05,
        # News (15%)
        "news_sentiment_score": 0.05,
        "news_volume": 0.03,
        "social_mention_velocity": 0.04,
        "insider_buy_ratio": 0.03,
    }

    def __init__(self, weights: dict[str, float] | None = None):
        """Initialize with optional custom weights.

        Args:
            weights: Override default weights. Must sum to ~1.0.
        """
        self.weights = weights or self.WEIGHTS.copy()

    def score(self, factors: dict[str, float]) -> float:
        """Compute anomaly score from factor values.

        Args:
            factors: {factor_name: raw_value}

        Returns:
            Anomaly score (0-100 scale)
        """
        if not factors:
            return 0.0

        total = 0.0
        total_weight = 0.0

        for name, weight in self.weights.items():
            if name not in factors:
                continue
            raw = factors[name]
            normalized = self._normalize(name, raw)
            total += normalized * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0

        # Scale to 0-100
        return min(100.0, max(0.0, total / total_weight * 100))

    @staticmethod
    def _normalize(name: str, value: float) -> float:
        """Normalize factor value to [0, 1].

        Each factor has its own normalization logic based on empirical ranges.
        """
        # C/P ratios: higher = more bullish, clip at reasonable bounds
        if name in (
            "volume_cp_ratio",
            "leap_volume_cp_ratio",
            "nonleap_volume_cp_ratio",
        ):
            # 0-10 range, log scale for high values
            return min(1.0, np.log1p(value) / np.log1p(10))

        if name == "oi_cp_ratio":
            return min(1.0, np.log1p(value) / np.log1p(10))

        # LEAP ratios: higher = more LEAPS activity
        if name in ("leap_ratio", "leap_oi_ratio", "leap_premium_ratio"):
            return min(1.0, value / 5.0)

        # VOI ratio: higher = more unusual
        if name == "voi_ratio":
            return min(1.0, value / 10.0)

        # Activity
        if name == "volume_spike":
            return min(1.0, value / 10.0)
        if name == "premium":
            # Premium in millions, 0-100M range
            return min(1.0, value / 100.0)
        if name == "oi_change":
            # -1 to 1, map to 0-1 with 0 = neutral
            return (value + 1) / 2

        # Greeks
        if name == "delta":
            # Prefer 0.5-0.8 range
            return 1.0 - abs(abs(value) - 0.65) / 0.65
        if name == "theta_price_ratio":
            # Lower is better, < 0.003 = good
            return max(0.0, 1.0 - value / 0.01)
        if name == "gamma":
            # Moderate gamma preferred
            return max(0.0, 1.0 - abs(value - 0.02) / 0.02)
        if name == "vega":
            return min(1.0, value / 2.0)
        if name == "delta_quality":
            # Already [0, 1]
            return max(0.0, min(1.0, value))

        # IV
        if name == "iv_rank":
            # Lower IV rank = cheaper options = better
            # But not too low (< 10% might mean no demand)
            if value < 0.1:
                return value * 10  # 0-0.1 -> 0-1
            return max(0.0, 1.0 - value)
        if name == "iv_skew":
            # Moderate positive skew is normal
            # Very negative = unusual call buying
            return (value + 0.2) / 0.4  # -0.2 to 0.2 -> 0 to 1
        if name == "term_structure":
            # Slightly positive is normal
            return 0.5 + value * 5  # centered around 0.5

        # Spread
        if name == "spread_ratio":
            # Lower = more liquid = better
            return max(0.0, 1.0 - value / 0.1)
        if name == "dte":
            # 30-730 range, prefer 180-365 (LEAPS sweet spot)
            sweet = 270
            return max(0.0, 1.0 - abs(value - sweet) / sweet)

        # Value factors
        if name == "pe_ttm":
            # Lower PE = value, but negative PE is bad
            if value <= 0:
                return 0.0
            return max(0.0, 1.0 - (value - 10) / 90)  # 10-100 range
        if name == "pb_ratio":
            return max(0.0, 1.0 - (value - 1) / 9)  # 1-10 range
        if name == "ps_ratio":
            return max(0.0, 1.0 - value / 15)
        if name == "ev_ebitda":
            return max(0.0, 1.0 - value / 50)
        if name == "dividend_yield":
            # Higher = better for value
            return min(1.0, value / 5.0)
        if name == "roe":
            return min(1.0, value / 30.0)
        if name == "profit_margin":
            return min(1.0, value / 30.0)
        if name == "debt_equity":
            # Lower = better
            return max(0.0, 1.0 - value / 2.0)

        # Macro (same for all symbols in a day)
        if name == "vix_level":
            # 10-40 range, moderate VIX (15-25) = best for options buying
            return max(0.0, 1.0 - abs(value - 20) / 20)
        if name == "yield_curve_slope":
            # Positive = normal, negative = warning
            return (value + 1) / 2  # -1 to 1 -> 0 to 1
        if name == "dxy_trend":
            # Slight uptrend OK
            return 0.5 + value * 10
        if name == "credit_spread":
            # Lower = better
            return max(0.0, 1.0 - value / 10.0)
        if name == "fed_funds_expectation":
            # Rate cuts = bullish
            return (value + 1) / 2
        if name == "put_call_index":
            # < 0.8 = extreme bullish, > 1.2 = extreme bearish
            return 1.0 - abs(value - 1.0) / 0.5

        # Fama-French
        if name == "mkt_rf":
            return min(1.0, value / 2.0)
        if name == "smb":
            # Centered around 0
            return (value + 1) / 2
        if name == "hml":
            return (value + 1) / 2

        # News
        if name == "news_sentiment_score":
            return (value + 1) / 2  # -1 to 1 -> 0 to 1
        if name == "news_volume":
            return min(1.0, value / 50.0)
        if name == "social_mention_velocity":
            return (value + 1) / 2
        if name == "insider_buy_ratio":
            # > 2 = strong buy signal
            return min(1.0, value / 3.0)
        if name == "analyst_rating_change":
            # -5 to 5 -> 0 to 1
            return (value + 5) / 10

        # Fallback: sigmoid-like clamp
        return max(0.0, min(1.0, value))


def compute_anomaly_scores(
    factor_map: dict[str, dict[str, float]],
    weights: dict[str, float] | None = None,
) -> dict[str, float]:
    """Convenience function: score all symbols.

    Args:
        factor_map: {symbol: {factor_name: value}}
        weights: Optional custom weights

    Returns:
        {symbol: anomaly_score}
    """
    scorer = AnomalyScorer(weights)
    return {sym: scorer.score(factors) for sym, factors in factor_map.items()}
