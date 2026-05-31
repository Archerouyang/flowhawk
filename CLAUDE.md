# Options Anomaly Screener

A LEAPS trading screening system based on options anomaly signals.

## Data Sources

| Source | Purpose | Status |
|--------|---------|--------|
| Theta Data | Options EOD Snapshot + Greeks | Subscription required (~$25/mo) |
| FMP | Stock K-lines + News | API Key required |

## Directory Structure

```
quantResearch/
├── src/                  # Core source code
│   ├── data_sources/    # Data source adapters
│   ├── screening/       # Three-stage screening engine
│   ├── models/          # Data models
│   └── storage/         # Parquet storage
├── dashboard/           # Streamlit visualization
│   └── pages/           # Feature pages
├── scripts/             # CLI tools
├── data/                # Data storage
└── docs/adr/            # Architecture Decision Records
```

## Agent Skills

### Issue Tracker
Issues tracked on GitHub. See `docs/agents/issue-tracker.md`.

### Triage Labels
Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain Docs
Single-context repo. Domain docs live at `CONTEXT.md` and `docs/adr/`.

## Quick Start

```bash
cd ~/projects/quantResearch
uv sync
cp .env.example .env
# Edit .env with your API keys
uv run streamlit run dashboard/app.py
```

## Development

- **Package manager**: `uv` (Astral)
- **Python version**: 3.11.9
- **Add dependency**: `uv add <package>`
- **Run script**: `uv run python <script.py>`
- **Lint**: `uv run ruff check src/`
- **Test**: `uv run pytest`

## CI / CD

- All changes submitted via Pull Request
- CI: ruff + mypy + pytest
- CODEOWNERS: @archer
- See [Branch Strategy](docs/BRANCH_STRATEGY.md) for branching model
