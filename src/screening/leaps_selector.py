"""Stage 3: LEAPS selection engine."""

from datetime import date

import polars as pl

from src.config import get_config
from src.models import TradeSignal, SignalDirection


class LEAPSSelector:
    """Select optimal LEAPS contracts from filtered candidates."""

    def __init__(self):
        cfg = get_config()
        leaps = cfg.screening.get("leaps", {})

        self.min_dte = leaps.get("min_dte", 180)
        self.target_delta_min = leaps.get("target_delta_min", 0.65)
        self.target_delta_max = leaps.get("target_delta_max", 0.80)
        self.max_theta_ratio = leaps.get("max_theta_ratio", 0.003)
        self.max_bid_ask_spread = leaps.get("max_bid_ask_spread", 0.05)
        self.max_iv_percentile = leaps.get("max_iv_percentile", 50)
        self.top_n = leaps.get("top_n_recommendations", 2)

    def select(
        self,
        df_options: pl.DataFrame,
        df_technical: pl.DataFrame,
    ) -> list[TradeSignal]:
        """Select best LEAPS from options + technical data.

        Args:
            df_options: Options anomaly DataFrame (after Stage 1).
            df_technical: Technical scores DataFrame (after Stage 2).

        Returns:
            List of TradeSignal recommendations.
        """
        if df_options.is_empty() or df_technical.is_empty():
            return []

        # Join with technical scores
        df = df_options.join(
            df_technical.select(["symbol", "technical_score"]),
            on="symbol",
            how="inner",
        )

        if df.is_empty():
            return []

        # LEAPS-specific filters
        df = df.filter(
            (pl.col("dte") >= self.min_dte)
            & (pl.col("delta").abs() >= self.target_delta_min)
            & (pl.col("delta").abs() <= self.target_delta_max)
            & (pl.col("spread_ratio") <= self.max_bid_ask_spread)
        )

        if df.is_empty():
            return []

        # Compute LEAPS quality score
        df = df.with_columns(
            [
                (1.0 - ((pl.col("delta").abs() - 0.725).abs() / 0.725))
                .clip(0, 1)
                .alias("delta_quality"),
                (
                    1.0
                    - (
                        pl.col("theta").abs()
                        / (pl.col("last_price").replace(0, 1e-9))
                        / self.max_theta_ratio
                    )
                )
                .clip(0, 1)
                .alias("theta_quality"),
            ]
        )

        # Composite score
        df = df.with_columns(
            (
                pl.col("anomaly_score") * 0.40
                + pl.col("technical_score") * 0.30
                + pl.col("delta_quality") * 0.15
                + pl.col("theta_quality") * 0.15
            ).alias("composite_score")
        )

        # Pick top N
        top = df.sort("composite_score", descending=True).head(self.top_n)

        signals = []
        for row in top.to_dicts():
            direction = (
                SignalDirection.LONG_CALL
                if row["option_type"] == "C"
                else SignalDirection.LONG_PUT
            )

            # Risk management
            stop_loss = (
                row["close"] * 0.92
                if "close" in row
                else row["underlying_price"] * 0.92
            )
            target_price = (
                row["close"] * 1.15
                if "close" in row
                else row["underlying_price"] * 1.15
            )

            signal = TradeSignal(
                date=row.get("snapshot_date", date.today()),
                symbol=row["symbol"],
                direction=direction,
                strike=row["strike"],
                expiration=row["expiration"],
                entry_price=row["last_price"],
                delta=row["delta"],
                theta=row["theta"],
                stop_loss=round(stop_loss, 2),
                target_price=round(target_price, 2),
                confidence_score=round(row["composite_score"], 3),
                anomaly_score=round(row.get("anomaly_score", 0), 3),
                technical_score=round(row.get("technical_score", 0), 3),
                rationale=self._build_rationale(row),
            )
            signals.append(signal)

        return signals

    @staticmethod
    def _build_rationale(row: dict) -> str:
        parts = [
            f"V/OI ratio: {row.get('voi_ratio', 0):.1f}x",
            f"Delta: {row['delta']:.2f}",
            f"DTE: {row.get('dte', 0)}",
            f"IV: {row.get('implied_volatility', 0):.1%}",
        ]
        return " | ".join(parts)
