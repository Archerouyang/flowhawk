"""FastAPI entry point for FlowHawk backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import health, screening, signals, backtest, ranking


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="FlowHawk API",
    description="Options anomaly screener backend",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["Health"])
app.include_router(screening.router, prefix="/api/v1", tags=["Screening"])
app.include_router(signals.router, prefix="/api/v1", tags=["Signals"])
app.include_router(backtest.router, prefix="/api/v1", tags=["Backtest"])
app.include_router(ranking.router, prefix="/api/v1", tags=["Ranking"])
