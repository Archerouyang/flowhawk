"""Configuration loader."""
import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

load_dotenv()

_CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"


class Config:
    """Singleton configuration."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load()
        return cls._instance

    def _load(self) -> None:
        with open(_CONFIG_PATH) as f:
            raw = yaml.safe_load(f)

        self.data_sources = raw.get("data_sources", {})
        self.data = raw.get("data", {})
        self.screening = raw.get("screening", {})
        self.dashboard = raw.get("dashboard", {})
        self.scheduler = raw.get("scheduler", {})

        # Resolve paths
        self.raw_dir = Path(self.data["raw_dir"])
        self.processed_dir = Path(self.data["processed_dir"])
        self.cache_dir = Path(self.data["cache_dir"])
        self.db_path = Path(self.data["db_path"])

        for p in [self.raw_dir, self.processed_dir, self.cache_dir]:
            p.mkdir(parents=True, exist_ok=True)

        # Credentials
        self.theta_user = os.getenv("THETA_DATA_USER", "")
        self.theta_pass = os.getenv("THETA_DATA_PASS", "")

    def get(self, *keys, default=None):
        """Deep get: config.get('screening', 'options', 'min_voi_ratio')."""
        node = self.__dict__
        for k in keys:
            if isinstance(node, dict) and k in node:
                node = node[k]
            else:
                return default
        return node


def get_config() -> Config:
    return Config()
