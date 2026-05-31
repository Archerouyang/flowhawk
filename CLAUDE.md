# FlowHawk

An options anomaly signal screener with LEAPS selector, built with Python backend + React/Next.js frontend.

## Architecture

```
FlowHawk
├── Python Backend (src/ + api/)
│   ├── src/
│   │   ├── data_sources/     # Theta Data, FMP, YFinance, Mock
│   │   ├── screening/        # 3-stage pipeline: anomaly → technical → LEAPS
│   │   ├── models/           # TradeSignal, OptionContract, etc.
│   │   └── storage/          # Parquet + DuckDB
│   └── api/                  # FastAPI REST layer
│       ├── routes/           # /screen, /signals, /backtest, /health
│       └── main.py           # FastAPI app entry
│
├── React Frontend (frontend/)
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Dashboard
│   │   ├── screener/         # Options anomaly scanner
│   │   ├── signals/          # LEAPS trade recommendations
│   │   ├── backtest/         # Strategy validation
│   │   ├── strategies/       # Strategy management
│   │   ├── features/         # Feature mining
│   │   ├── factors/          # IC analysis
│   │   └── live/             # Live trading / positions
│   └── components/           # shadcn/ui + custom
│
└── Streamlit Prototype (dashboard/)
    └── pages/                # Legacy Streamlit pages (reference)
```

## Data Sources

| Source | Purpose | Status |
|--------|---------|--------|
| Theta Data | Options EOD Snapshot + Greeks | Subscription required (~$25/mo) |
| FMP | Stock K-lines + News | API Key required |
| Mock | Development without subscriptions | Active |

## Quick Start

### Backend
```bash
cd ~/projects/quantResearch
uv sync --all-extras
cp .env.example .env
# Edit .env with your API keys
uv run python -m uvicorn api.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build
```

### Streamlit (Legacy)
```bash
uv run streamlit run dashboard/app.py
```

## Development

- **Package manager**: `uv` (Astral) for Python, `npm` for frontend
- **Python version**: 3.11.9+
- **Node version**: 22+
- **Add Python dep**: `uv add <package>`
- **Add Node dep**: `cd frontend && npm install <package>`

## CI / CD

- All changes submitted via Pull Request
- CI runs on Python 3.11/3.12 + Node 22
- Backend: ruff lint/format, mypy, pytest
- Frontend: tsc type check, next lint, next build
- See [Branch Strategy](docs/BRANCH_STRATEGY.md)
