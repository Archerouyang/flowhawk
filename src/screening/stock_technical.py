"""Stage 2: Stock technical filter with news sentiment."""

from typing import Optional

import polars as pl
import numpy as np

from src.config import get_config


class StockTechnicalScreener:
    """Filter candidates using technical indicators and optional news sentiment."""

    def __init__(self):
        cfg = get_config()
        tech = cfg.screening.get("technical", {})

        self.min_price_vs_sma200 = tech.get("min_price_vs_sma200", 1.0)
        self.min_price_vs_sma20 = tech.get("min_price_vs_sma20", 1.0)
        self.min_volume_vs_avg = tech.get("min_volume_vs_avg", 1.5)
        self.rsi_min = tech.get("rsi_min", 30)
        self.rsi_max = tech.get("rsi_max", 70)
        self.max_atr_ratio = tech.get("max_atr_ratio", 0.05)

    def screen(
        self,
        df_kline: pl.DataFrame,
        symbols: list[str],
        news_scores: Optional[dict[str, float]] = None,
    ) -> pl.DataFrame:
        """Run technical screening.

        Args:
            df_kline: Concatenated kline data for all candidates.
            symbols: List of candidate symbols from Stage 1.
            news_scores: Optional dict of symbol -> sentiment score (-1 to 1).

        Returns:
            DataFrame with technical_score per symbol.
        """
        if df_kline.is_empty():
            return pl.DataFrame()

        results = []
        for sym in symbols:
            sym_df = df_kline.filter(pl.col("symbol") == sym).sort("date")
            if sym_df.height < 50:
                continue

            score, metrics = self._analyze_symbol(sym_df)

            # Blend news sentiment if available
            if news_scores and sym in news_scores:
                news_score = (news_scores[sym] + 1) / 2  # normalize to 0-1
                score = score * 0.7 + news_score * 0.3

            results.append(
                {
                    "symbol": sym,
                    "technical_score": score,
                    **metrics,
                }
            )

        if not results:
            return pl.DataFrame()

        return pl.DataFrame(results).sort("technical_score", descending=True)

    def _analyze_symbol(self, df: pl.DataFrame) -> tuple[float, dict]:
        """Analyze a single symbol's technicals. Returns (score, metrics)."""
        close = df["close"].to_numpy()
        volume = df["volume"].to_numpy()

        # SMAs
        sma20 = close[-20:].mean() if len(close) >= 20 else close.mean()
        sma50 = close[-50:].mean() if len(close) >= 50 else close.mean()
        sma200 = close[-200:].mean() if len(close) >= 200 else close.mean()

        last_close = close[-1]
        last_volume = volume[-1]
        avg_volume_20 = volume[-20:].mean()

        # RSI
        rsi = self._compute_rsi(close)

        # ATR
        atr = self._compute_atr(df)
        atr_ratio = atr / last_close if last_close > 0 else 1.0

        # Check conditions
        passes = 0
        total = 5

        if last_close > sma200 * self.min_price_vs_sma200:
            passes += 1
        if last_close > sma20 * self.min_price_vs_sma20:
            passes += 1
        if last_volume > avg_volume_20 * self.min_volume_vs_avg:
            passes += 1
        if self.rsi_min < rsi < self.rsi_max:
            passes += 1
        if atr_ratio < self.max_atr_ratio:
            passes += 1

        score = passes / total

        # Bonus for trend strength
        if sma20 > sma50 > sma200:
            score = min(1.0, score + 0.15)

        metrics = {
            "close": round(last_close, 2),
            "sma20": round(sma20, 2),
            "sma50": round(sma50, 2),
            "sma200": round(sma200, 2),
            "rsi_14": round(rsi, 2),
            "atr_ratio": round(atr_ratio, 4),
            "volume_vs_avg": round(last_volume / avg_volume_20, 2)
            if avg_volume_20 > 0
            else 0,
        }

        return score, metrics

    @staticmethod
    def _compute_rsi(prices: np.ndarray, period: int = 14) -> float:
        if len(prices) < period + 1:
            return 50.0
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return float(100.0 - (100.0 / (1.0 + rs)))

    @staticmethod
    def _compute_atr(df: pl.DataFrame, period: int = 14) -> float:
        if df.height < period + 1:
            return 0.0
        high = df["high"].to_numpy()
        low = df["low"].to_numpy()
        close = df["close"].to_numpy()

        tr1 = high[1:] - low[1:]
        tr2 = np.abs(high[1:] - close[:-1])
        tr3 = np.abs(low[1:] - close[:-1])
        tr = np.maximum(np.maximum(tr1, tr2), tr3)

        return float(np.mean(tr[-period:]))
