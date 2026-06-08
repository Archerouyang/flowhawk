"""Shared FastAPI dependencies."""

from fastapi import Request

from src.config import Config


def get_app_config(request: Request) -> Config:
    """Get application config from app state."""
    return request.app.state.config
