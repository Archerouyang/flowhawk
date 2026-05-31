"""Base signal interface."""
from typing import Protocol

import pandas as pd


class Signal(Protocol):
    """Protocol for all signal generators."""

    def compute(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add signal columns to DataFrame.

        Must add at minimum:
            - position: int/float (1=long, 0=flat, -1=short)
            - buy_signal: bool (optional, for event logging)
            - sell_signal: bool (optional, for event logging)

        Returns a new DataFrame; input must not be modified.
        """
        ...
