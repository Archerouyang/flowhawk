"""RSI overbought/oversold signal."""
import pandas as pd
import numpy as np


class RSISignal:
    """Generate buy/sell signals based on RSI levels."""

    def __init__(self, period: int = 14, overbought: float = 70, oversold: float = 30):
        self.period = period
        self.overbought = overbought
        self.oversold = oversold

    def _rsi(self, prices: pd.Series) -> pd.Series:
        delta = prices.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)

        avg_gain = gain.ewm(alpha=1 / self.period, min_periods=self.period).mean()
        avg_loss = loss.ewm(alpha=1 / self.period, min_periods=self.period).mean()

        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def compute(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["rsi"] = self._rsi(df["Close"])

        df["buy_signal"] = (df["rsi"] < self.oversold) & (df["rsi"].shift(1) >= self.oversold)
        df["sell_signal"] = (df["rsi"] > self.overbought) & (df["rsi"].shift(1) <= self.overbought)
        df["position"] = np.where(df["rsi"] < self.oversold, 1,
                                   np.where(df["rsi"] > self.overbought, 0, np.nan))
        df["position"] = df["position"].ffill().fillna(0)

        return df
