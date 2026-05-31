"""Parquet-based local storage."""

from datetime import date
from pathlib import Path

import polars as pl

from src.config import get_config


class ParquetStore:
    """Store and retrieve DataFrames as Parquet files."""

    def __init__(self):
        cfg = get_config()
        self.raw_dir = cfg.raw_dir
        self.processed_dir = cfg.processed_dir

    def save_options_snapshot(self, df: pl.DataFrame, snapshot_date: date) -> Path:
        path = self.raw_dir / f"options_snapshot_{snapshot_date.isoformat()}.parquet"
        df.write_parquet(path)
        return path

    def load_options_snapshot(self, snapshot_date: date) -> pl.DataFrame:
        path = self.raw_dir / f"options_snapshot_{snapshot_date.isoformat()}.parquet"
        if not path.exists():
            return pl.DataFrame()
        return pl.read_parquet(path)

    def save_stock_kline(self, df: pl.DataFrame) -> Path:
        path = self.raw_dir / "stock_kline.parquet"
        df.write_parquet(path)
        return path

    def load_stock_kline(self) -> pl.DataFrame:
        path = self.raw_dir / "stock_kline.parquet"
        if not path.exists():
            return pl.DataFrame()
        return pl.read_parquet(path)

    def save_signals(self, df: pl.DataFrame) -> Path:
        path = self.processed_dir / "anomaly_signals.parquet"
        df.write_parquet(path)
        return path

    def load_signals(self) -> pl.DataFrame:
        path = self.processed_dir / "anomaly_signals.parquet"
        if not path.exists():
            return pl.DataFrame()
        return pl.read_parquet(path)

    def save_recommendations(self, df: pl.DataFrame) -> Path:
        path = self.processed_dir / "trade_recommendations.parquet"
        # Append mode: read existing, concat, write
        if path.exists():
            existing = pl.read_parquet(path)
            df = pl.concat([existing, df], how="vertical_relaxed")
            df = df.unique(subset=["date", "symbol", "strike", "expiration"])
        df.write_parquet(path)
        return path

    def load_recommendations(self) -> pl.DataFrame:
        path = self.processed_dir / "trade_recommendations.parquet"
        if not path.exists():
            return pl.DataFrame()
        return pl.read_parquet(path)
