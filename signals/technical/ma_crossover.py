"""Moving average crossover signal."""
import pandas as pd
import numpy as np


class MACrossoverSignal:
    """Generate buy/sell signals from short/long MA crossovers."""

    def __init__(self, short: int = 20, long: int = 60):
        self.short = short
        self.long = long

    def compute(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add MA columns and signal columns to DataFrame.

        Returns DataFrame with added columns:
            - ma_short, ma_long
            - buy_signal: True on golden cross
            - sell_signal: True on death cross
            - position: 1 when long, 0 when flat
        """
        df = df.copy()
        df["ma_short"] = df["Close"].rolling(self.short).mean()
        df["ma_long"] = df["Close"].rolling(self.long).mean()

        # Crossover detection: direct boolean diff, no intermediate signal state
        above = df["ma_short"] > df["ma_long"]
        df["buy_signal"] = above & ~above.shift(1).fillna(False)
        df["sell_signal"] = ~above & above.shift(1).fillna(False)

        # Position: 1 when above long MA, 0 otherwise
        df["position"] = above.astype(int)

        return df
