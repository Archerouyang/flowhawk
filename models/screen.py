"""Fundamental-based stock screener."""
import pandas as pd
from data_sources.fmp import FMPDataSource


class FundamentalScreener:
    """Screen stocks using FMP fundamental data."""

    def __init__(self, fmp: FMPDataSource):
        self.fmp = fmp

    def screen(
        self,
        min_roe: float = 0.15,
        max_pe: float = 25,
        min_market_cap: float = 1e9,
        limit: int = 100,
    ) -> pd.DataFrame:
        """Run fundamental screener.

        Args:
            min_roe: minimum return on equity (e.g. 0.15 = 15%)
            max_pe: maximum trailing PE ratio
            min_market_cap: minimum market cap in USD
            limit: max results
        """
        df = self.fmp.stock_screener(
            market_cap_more_than=min_market_cap / 1e6,  # FMP uses millions
            roe_more_than=min_roe,
            limit=limit,
        )
        if df.empty:
            return df

        # Filter by PE
        df["pe"] = pd.to_numeric(df.get("priceEarningsRatio", pd.Series()), errors="coerce")
        df = df[df["pe"] < max_pe]

        return df.sort_values("roe", ascending=False)
