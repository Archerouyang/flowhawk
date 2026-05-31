# FlowHawk Project Roadmap

## Overview

FlowHawk is an options anomaly signal screener that identifies unusual options activity and filters for actionable LEAPS trades through a three-stage pipeline.

**Current Status**: Foundation complete — CI/CD, data sources, screening engine skeleton, and project structure are in place.

---

## Phase 1: Data Pipeline (Week 1-2)

### 1.1 Theta Data Integration
- [x] EOD snapshot fetcher
- [ ] Historical IV data for IV rank calculation
- [ ] Rate limiting and retry logic
- [ ] Mock data mode for development without subscription

### 1.2 FMP Integration
- [x] Stock K-line fetcher
- [x] News fetcher
- [ ] News sentiment scoring (deep research integration)

### 1.3 Storage Layer
- [x] Parquet store for options snapshots
- [x] Parquet store for stock klines
- [ ] DuckDB integration for SQL queries
- [ ] Data retention policies

---

## Phase 2: Screening Engine (Week 2-3)

### 2.1 Stage 1: Options Anomaly Detection
- [x] V/OI ratio filter
- [x] Volume spike filter
- [x] Premium filter
- [x] Delta range filter
- [x] DTE range filter
- [ ] IV rank filter (requires historical IV)
- [ ] Composite anomaly scoring

### 2.2 Stage 2: Technical Filter
- [x] Moving average filters (20/50/200 MA)
- [x] RSI filter
- [x] ATR filter
- [x] Volume confirmation
- [ ] News sentiment filter

### 2.3 Stage 3: LEAPS Selector
- [x] Delta quality scoring
- [x] Theta quality scoring
- [x] Composite LEAPS score
- [x] Risk management (stop loss / target)
- [ ] IV percentile filter

---

## Phase 3: Dashboard (Week 3-5)

### 3.1 Core Pages
- [ ] **Screener** — Options chain table with filters
- [ ] **Signals** — Signal detail cards with Greeks
- [ ] **Backtest** — Historical signal performance
- [ ] **Strategies** — Strategy comparison and selection
- [ ] **Features** — Feature importance and mining
- [ ] **Factors** — Factor IC analysis
- [ ] **Live Trading** — Position tracking and P&L

### 3.2 Visualizations
- [ ] IV skew chart
- [ ] Stock candlestick chart
- [ ] Volume bar chart
- [ ] Greeks radar chart
- [ ] Signal scorecard

---

## Phase 4: Backtest Engine (Week 4-6)

- [ ] Historical signal generation
- [ ] P&L tracking per signal
- [ ] Win rate / Sharpe / Max drawdown metrics
- [ ] Walk-forward analysis
- [ ] Parameter sensitivity

---

## Phase 5: Live Trading (Week 6-8)

- [ ] Paper trading integration
- [ ] Signal execution tracking
- [ ] Position management
- [ ] Daily P&L reporting
- [ ] Alert system (email/Slack)

---

## Phase 6: Advanced Features (Ongoing)

- [ ] Factor research module
- [ ] Feature engineering pipeline
- [ ] ML-based signal enhancement
- [ ] Multi-strategy portfolio optimization
- [ ] Real-time streaming (upgrade from EOD)

---

## CI/CD Status

| Check | Status |
|-------|--------|
| ruff lint | ✅ |
| ruff format | ✅ |
| mypy type check | ✅ |
| pytest | ⏳ (needs tests) |

---

## Data Sources

| Source | Cost | Status |
|--------|------|--------|
| Theta Data | ~$25/mo | Configured, needs subscription |
| FMP | Free tier | Configured |

---

## Branch Strategy

- `main` — production, protected
- `develop` — integration
- `feature/*` — new features via PR
- `hotfix/*` — urgent fixes

All changes require PR review + CI pass.
