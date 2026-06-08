"""Configuration loader."""

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

_DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"


class Config:
    """Configuration container — plain class, no singleton."""

    def __init__(self, raw: dict | None = None) -> None:
        if raw is None:
            raw = _load_yaml(_DEFAULT_CONFIG_PATH)
        self._apply(raw)

    def _apply(self, raw: dict) -> None:
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


def _load_yaml(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f) or {}


def create_config(path: str | None = None) -> Config:
    """Factory: create a Config from a YAML file.

    Loads .env variables on first call so credentials are available
    before config instantiation.

    Args:
        path: Path to config YAML. If None, uses default config.yaml.

    Returns:
        A new Config instance.
    """
    load_dotenv()
    if path is None:
        raw = _load_yaml(_DEFAULT_CONFIG_PATH)
    else:
        raw = _load_yaml(Path(path))
    return Config(raw)


# Backward-compatible lazy singleton
_config_instance: Config | None = None


def get_config() -> Config:
    """Return the default Config instance (lazy singleton for compatibility)."""
    global _config_instance
    if _config_instance is None:
        _config_instance = create_config()
    return _config_instance
