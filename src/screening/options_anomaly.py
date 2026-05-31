"""Stage 1: Options anomaly detection engine."""

import polars as pl

from src.config import get_config


class OptionsAnomalyScreener:
    """Detect unusual options activity across the full market."""

    def __init__(self):
        cfg = get_config()
        opts = cfg.screening.get("options", {})

        self.min_voi_ratio = opts.get("min_voi_ratio", 3.0)
        self.min_volume_spike = opts.get("min_volume_spike", 5.0)
        self.min_premium = opts.get("min_premium_usd", 100_000)
        self.max_iv_rank = opts.get("max_iv_rank", 50.0)
        self.min_dte = opts.get("min_dte", 180)
        self.max_dte = opts.get("max_dte", 730)
        self.min_delta = opts.get("min_delta", 0.50)
        self.max_delta = opts.get("max_delta", 0.85)
        self.min_contract_volume = opts.get("min_contract_volume", 500)
        self.top_n = opts.get("top_n_anomalies", 50)

    def screen(self, df: pl.DataFrame) -> pl.DataFrame:
        """Run anomaly screening on options snapshot.

        Args:
            df: Polars DataFrame with columns:
                symbol, option_type, strike, expiration, bid, ask, last_price,
                volume, open_interest, delta, theta, vega, implied_volatility,
                underlying_price, snapshot_date

        Returns:
            DataFrame with anomaly_score, ranked descending.
        """
        if df.is_empty():
            return df

        # Compute derived fields
        df = df.with_columns(
            [
                ((pl.col("bid") + pl.col("ask")) / 2).alias("mid"),
                (pl.col("last_price") * pl.col("volume") * 100).alias("premium"),
                (
                    pl.col("volume").cast(pl.Float64)
                    / pl.col("open_interest").cast(pl.Float64).replace(0, 1e-9)
                ).alias("voi_ratio"),
                (pl.col("expiration") - pl.col("snapshot_date"))
                .dt.total_days()
                .alias("dte"),
                (
                    (pl.col("ask") - pl.col("bid")) / pl.col("ask").replace(0, 1e-9)
                ).alias("spread_ratio"),
            ]
        )

        # Hard filters
        filtered = df.filter(
            (pl.col("volume") >= self.min_contract_volume)
            & (pl.col("premium") >= self.min_premium)
            & (pl.col("voi_ratio") >= self.min_voi_ratio)
            & (pl.col("dte") >= self.min_dte)
            & (pl.col("dte") <= self.max_dte)
            & (pl.col("delta").abs() >= self.min_delta)
            & (pl.col("delta").abs() <= self.max_delta)
            & (pl.col("spread_ratio") <= 0.10)
        )

        if filtered.is_empty():
            return filtered

        # Compute anomaly score (composite)
        # Normalize each signal to 0-1 within the filtered set
        filtered = self._add_normalized(filtered, "voi_ratio", "voi_norm")
        filtered = self._add_normalized(filtered, "premium", "premium_norm")
        filtered = self._add_normalized(filtered, "volume", "volume_norm")

        # IV rank: lower is better (we want cheap options), so invert
        filtered = filtered.with_columns(
            (1.0 - self._normalize_col(filtered, "implied_volatility")).alias("iv_norm")
        )

        # Delta quality: prefer 0.65-0.80
        filtered = filtered.with_columns(
            (1.0 - ((pl.col("delta").abs() - 0.725).abs() / 0.725))
            .clip(0, 1)
            .alias("delta_norm")
        )

        # Composite score
        filtered = filtered.with_columns(
            (
                pl.col("voi_norm") * 0.30
                + pl.col("volume_norm") * 0.20
                + pl.col("premium_norm") * 0.15
                + pl.col("iv_norm") * 0.15
                + pl.col("delta_norm") * 0.10
                + (pl.col("dte").cast(pl.Float64) / self.max_dte).clip(0, 1) * 0.10
            ).alias("anomaly_score")
        )

        # Sort and limit
        result = filtered.sort("anomaly_score", descending=True).head(self.top_n)

        return result

    @staticmethod
    def _add_normalized(df: pl.DataFrame, col: str, new_col: str) -> pl.DataFrame:
        return df.with_columns(
            OptionsAnomalyScreener._normalize_col(df, col).alias(new_col)
        )

    @staticmethod
    def _normalize_col(df: pl.DataFrame, col: str) -> pl.Expr:
        min_val = df[col].min()
        max_val = df[col].max()
        if max_val == min_val:
            return pl.lit(0.5)
        return ((pl.col(col) - min_val) / (max_val - min_val)).clip(0, 1)
