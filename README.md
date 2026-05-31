# Options Anomaly Screener

A LEAPS trading screening system based on options anomaly signals.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  End-of-Day Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│  Theta Data EOD  ──▶  Options Anomaly  ──▶  Stock Filter   │
│  (Full Market)        (V/OI/IV/Premium)    (MA/RSI/ATR)    │
│                                                +            │
│                                           News Sentiment    │
│                                                │            │
│                                                ▼            │
│                                    LEAPS Selector           │
│                                    (Delta/Theta/IV Filter)  │
│                                                │            │
│                                                ▼            │
│                                    1-2 Trade Recommendations│
│                                    + Streamlit Dashboard    │
└─────────────────────────────────────────────────────────────┘
```

## Data Sources

| Source | Purpose | Cost |
|--------|---------|------|
| **Theta Data** | Options EOD Snapshot + Greeks | ~$25/mo |
| **FMP** | Stock K-lines + News | Free tier / $19+/mo |

## Core Modules

```
src/
├── data_sources/          # Data source adapters
│   ├── theta_data.py      # Theta Data SDK wrapper
│   └── fmp.py             # FMP API (stocks + news)
├── screening/             # Three-stage screening engine
│   ├── options_anomaly.py # Stage 1: Options anomaly detection
│   ├── stock_technical.py # Stage 2: Technical + news filter
│   └── leaps_selector.py  # Stage 3: LEAPS selection
├── models/                # Data models
│   ├── option_contract.py
│   ├── stock_bar.py
│   └── trade_signal.py
└── storage/               # Parquet local storage
    └── parquet_store.py

dashboard/                  # Streamlit visualization
├── app.py                  # Main entry
└── pages/
    ├── 01_screener.py      # Screener
    ├── 02_signals.py       # Signal details
    ├── 03_backtest.py      # Backtest
    ├── 04_strategies.py    # Strategy selection
    ├── 05_features.py      # Feature mining
    ├── 06_factors.py       # Factor research
    └── 07_live.py          # Live trading

scripts/
└── daily_scan.py           # End-of-day CLI
```

## Quick Start

```bash
# 1. Install dependencies
cd quantResearch
uv sync

# 2. Configure API keys
cp .env.example .env
# Edit .env with THETA_DATA_USER / THETA_DATA_PASS / FMP_API_KEY

# 3. Run daily scan
uv run python scripts/daily_scan.py

# 4. Launch dashboard
uv run streamlit run dashboard/app.py
```

## Signal Definitions

### Stage 1: Options Anomaly

| Signal | Threshold | Weight |
|--------|-----------|--------|
| V/OI Ratio | ≥ 3.0x | 30% |
| Volume Spike | ≥ 5x 20-day avg | 20% |
| Notional Premium | ≥ $100,000 | 15% |
| IV Rank | ≤ 50% | 15% |
| DTE | 180-730 days | 10% |
| Delta | 0.50-0.85 | 10% |

### Stage 2: Technical Filter

- Price > 200-day SMA
- Price > 20-day SMA
- Volume > 20-day avg × 1.5
- RSI 30-70
- ATR/Price < 5%
- News sentiment bonus

### Stage 3: LEAPS Selection

- Delta: 0.65-0.80
- DTE: > 180 days
- Theta/Price < 0.3%
- Bid-Ask Spread < 5%
- IV Percentile < 50%

## CI / CD

- **Lint**: ruff
- **Type Check**: mypy
- **Test**: pytest
- **Coverage**: codecov

All changes must go through PR review and pass CI before merging.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [Branch Strategy](docs/BRANCH_STRATEGY.md) for details.

## License

MIT
