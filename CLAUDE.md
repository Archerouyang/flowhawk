# FlowHawk

Options anomaly signal screener with LEAPS selector. Python backend + React/Next.js frontend.

## Architecture

- `src/` — Python core (data sources, screening pipeline, models, storage)
- `api/` — FastAPI REST layer (`/screen`, `/signals`, `/backtest`, `/health`)
- `frontend/` — Next.js App Router dashboard
- `dashboard/` — Legacy Streamlit (reference only)

See `README.md` for full architecture and `QUICKSTART.md` for setup.

## Key Constraints

- Python 3.11.x, package manager `uv`
- API keys via `.env`
- All changes via PR, CI pass required before merge
- Public GitHub repository

## Context Budget

- 对话 >15 轮 → 主动建议 `/compact`
- 单次读取代码 >500 行后 → 建议 `/compact`
- 跨 >5 个文件分析后 → 建议 `/compact`

## Domain Context

See `docs/CONTEXT.md` for glossary, data sources, strategy classification, and key constraints.
