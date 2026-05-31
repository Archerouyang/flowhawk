# FlowHawk — Quick Start

Options anomaly signal screener with LEAPS selector.

**Stack:** Python (FastAPI + Polars) backend · React (Next.js + shadcn/ui) frontend

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.11.9+ | `python --version` |
| Node.js | 22+ | `node --version` |
| uv | latest | `uv --version` |

Install `uv`:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Install Python 3.11 (if you don't have it):
```bash
uv python install 3.11
```

---

## 1. Clone & Setup

```bash
git clone https://github.com/Archerouyang/flowhawk.git ~/projects/flowhawk
cd ~/projects/flowhawk
```

### Python backend
```bash
uv sync --all-extras          # install Python deps + dev tools
cp .env.example .env          # create env file (edit with your API keys)
```

### TypeScript frontend
```bash
cd frontend
npm install                   # install Node deps
cd ..
```

---

## 2. Start Development Stack

### Option A: One command (recommended)
```bash
./scripts/start-dev.sh
```

Starts both services and waits for backend health check:
- **Backend**  → http://127.0.0.1:8000
- **Frontend** → http://localhost:3000

Press `Ctrl+C` to stop both.

### Option B: Manual (two terminals)

**Terminal 1 — Backend:**
```bash
uv run uvicorn api.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## 3. Verify Everything Works

### Backend health
```bash
curl http://127.0.0.1:8000/health
# → {"status":"ok","service":"flowhawk-api"}
```

### API docs
Open http://127.0.0.1:8000/docs — interactive Swagger UI.

### Frontend
Open http://localhost:3000 — you should see the FlowHawk dashboard.

---

## 4. Data Mode

The frontend supports two data modes, controlled by `NEXT_PUBLIC_USE_MOCK`:

| Mode | How | Backend required? |
|------|-----|-------------------|
| **Mock** (default) | `NEXT_PUBLIC_USE_MOCK=true` or unset | ❌ No |
| **API** | `NEXT_PUBLIC_USE_MOCK=false` | ✅ Yes |

Mock mode uses local data in `frontend/lib/api.ts` — no backend needed for UI work.

To use the real backend API:
```bash
cd frontend
export NEXT_PUBLIC_USE_MOCK=false
npm run dev
```

The frontend proxies `/api/*` to the FastAPI backend via Next.js rewrites.

---

## 5. Project Layout

```
flowhawk/
├── api/                    # FastAPI backend
│   ├── main.py             # App entry
│   └── routes/             # /screen, /signals, /backtest, /health
├── frontend/               # Next.js frontend
│   ├── app/                # Pages (dashboard, screener, signals...)
│   ├── components/         # UI components (sidebar, cards, tables)
│   └── lib/api.ts          # API client + mock data
├── src/                    # Python core (screening engine, data sources)
├── dashboard/              # Legacy Streamlit prototype
├── tests/                  # pytest suite
├── scripts/
│   └── start-dev.sh        # One-command dev launcher
└── QUICKSTART.md           # This file
```

---

## 6. Common Commands

| Task | Command |
|------|---------|
| Run tests | `uv run pytest tests/ -v` |
| Python lint | `uv run ruff check src/ api/ tests/` |
| Python format | `uv run ruff format src/ api/ tests/` |
| Type check | `uv run mypy src/ api/` |
| Frontend build | `cd frontend && npm run build` |
| Frontend lint | `cd frontend && ./node_modules/.bin/eslint app/ components/` |

---

## 7. Next Steps

1. **Add API keys** to `.env` (Theta Data, FMP) — see `.env.example`
2. **Connect data sources** — replace mock generators with real APIs
3. **Add news sentiment** — integrate Deep Research for signal refinement
4. **Deploy** — Vercel (frontend) + Railway/Render (backend)
