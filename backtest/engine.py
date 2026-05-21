"""Simple vectorized backtest engine."""
import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Callable


@dataclass
class BacktestResult:
    returns: pd.Series
    positions: pd.Series
    trades: pd.DataFrame
    total_return: float
    sharpe: float
    max_drawdown: float
    win_rate: float


class SimpleBacktest:
    """Vectorized backtest: signal -> position -> returns."""

    def __init__(self, df: pd.DataFrame, signal_col: str = "position",
                 price_col: str = "Close", commission: float = 0.001):
        self.df = df
        self.signal_col = signal_col
        self.price_col = price_col
        self.commission = commission

    def run(self) -> BacktestResult:
        df = self.df.copy()
        df["returns"] = df[self.price_col].pct_change()

        # Strategy returns: position * market returns
        df["strategy_returns"] = df[self.signal_col].shift(1) * df["returns"]

        # Commission on trades
        df["trade"] = df[self.signal_col].diff().abs()
        df["commission_cost"] = df["trade"] * self.commission
        df["strategy_returns"] -= df["commission_cost"]

        # Cumulative
        df["cum_strategy"] = (1 + df["strategy_returns"]).cumprod()

        # Metrics
        total_return = df["cum_strategy"].iloc[-1] - 1
        std = df["strategy_returns"].std()
        sharpe = (
            df["strategy_returns"].mean() / std * np.sqrt(252)
            if std > 0 else 0.0
        )

        # Max drawdown (positive number, e.g. 0.25 means 25% drawdown)
        peak = df["cum_strategy"].cummax()
        drawdown = (df["cum_strategy"] - peak) / peak
        max_dd = abs(drawdown.min())

        # Win rate - vectorized: pair entry/exit prices at trade events
        trade_prices = df.loc[df["trade"] > 0, self.price_col]
        if len(trade_prices) >= 2:
            entries = trade_prices.iloc[::2]
            exits = trade_prices.iloc[1::2].iloc[:len(entries)]
            trade_returns = (exits.values - entries.values[:len(exits)]) / entries.values[:len(exits)]
            win_rate = (trade_returns > 0).mean() if len(trade_returns) > 0 else 0.0
        else:
            win_rate = 0.0

        trades = df[df["trade"] > 0].copy()

        return BacktestResult(
            returns=df["strategy_returns"].dropna(),
            positions=df[self.signal_col],
            trades=trades,
            total_return=total_return,
            sharpe=sharpe,
            max_drawdown=max_dd,
            win_rate=win_rate,
        )
