"""Shared FastAPI dependencies."""

from functools import lru_cache

from src.config import get_config


@lru_cache
def get_app_config():
    """Get cached application config."""
    return get_config()
