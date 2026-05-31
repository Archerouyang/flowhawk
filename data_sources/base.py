"""Base data source interface."""
from typing import Protocol

import pandas as pd


class DataSource(Protocol):
    """Protocol for all data sources."""

    def history(self, symbol: str, **kwargs) -> pd.DataFrame:
        ...

    def info(self, symbol: str) -> dict:
        ...
