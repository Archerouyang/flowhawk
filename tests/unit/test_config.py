"""Tests for Config factory pattern — TDD red phase."""

import shutil
import sys
from pathlib import Path

import pytest

from src.config import Config, create_config, get_config


FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
CUSTOM_CONFIG_PATH = FIXTURES_DIR / "config.yaml"


class TestConfigFactory:
    """Test create_config factory function."""

    def test_create_config_with_custom_path(self):
        """create_config with explicit path returns a Config with custom values."""
        cfg = create_config(str(CUSTOM_CONFIG_PATH))
        assert cfg.data_sources["theta_data"]["enabled"] is False
        assert cfg.screening["options"]["min_voi_ratio"] == 2.0
        assert cfg.data["raw_dir"] == "./tests/data/raw"

    def test_create_config_uses_default_path_when_none(self):
        """create_config() with no args uses default config.yaml."""
        cfg = create_config()
        assert cfg.screening["options"]["min_voi_ratio"] == 3.0

    def test_parallel_configs_isolated(self):
        """Two configs from different paths are independent."""
        custom = create_config(str(CUSTOM_CONFIG_PATH))
        default = create_config()

        custom.screening["options"]["min_voi_ratio"] = 999.0
        assert default.screening["options"]["min_voi_ratio"] == 3.0


class TestConfigNoSideEffects:
    """Config should not cause side effects at import time."""

    def test_config_no_import_side_effects(self, tmp_path):
        """Importing src.config must not create directories or read files."""
        # Remove any previously-imported module state
        if "src.config" in sys.modules:
            del sys.modules["src.config"]

        # Use a non-existent path to ensure no file read happens
        fake_path = tmp_path / "nonexistent.yaml"
        assert not fake_path.exists()

        # Import must succeed without reading files or creating dirs
        import src.config as cfg_module

        # Config class should exist but no instance created yet
        assert hasattr(cfg_module, "Config")
        assert hasattr(cfg_module, "create_config")
        assert hasattr(cfg_module, "get_config")

    def test_config_instance_creates_dirs_on_load(self, tmp_path):
        """Only creating a Config instance should create directories."""
        raw_dir = tmp_path / "raw"
        processed_dir = tmp_path / "processed"
        cache_dir = tmp_path / "cache"

        config_data = {
            "data_sources": {},
            "data": {
                "raw_dir": str(raw_dir),
                "processed_dir": str(processed_dir),
                "cache_dir": str(cache_dir),
                "db_path": str(tmp_path / "test.db"),
            },
            "screening": {},
            "dashboard": {},
            "scheduler": {},
        }

        cfg = Config(config_data)
        assert raw_dir.exists()
        assert processed_dir.exists()
        assert cache_dir.exists()


class TestConfigBackwardCompatibility:
    """get_config() must remain a working compatibility layer."""

    def test_get_config_returns_config(self):
        """get_config() returns a Config instance."""
        cfg = get_config()
        assert isinstance(cfg, Config)

    def test_get_config_is_lazy(self):
        """get_config() creates instance on first call, reuses on second."""
        # Ensure fresh module state
        if "src.config" in sys.modules:
            del sys.modules["src.config"]

        import src.config as cfg_module

        cfg1 = cfg_module.get_config()
        cfg2 = cfg_module.get_config()
        assert cfg1 is cfg2
