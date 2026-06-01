# FlowHawk Project Roadmap

> Updated: 2026-06-01 | Status: Algorithm layer complete, integration layer missing.

## Current Situation

**What's done:** 3-stage pipeline algorithms (anomaly → technical → LEAPS), signal classifier (5 types), signal scorer (0-100), SQLite schema, FastAPI routes, React frontend (8 pages).

**What's missing:** No real data flows through the system. All API routes use mock data. Frontend shows static mock signals.

**New direction:** Shift from "signal-type-centric" to "anomaly ranking by asset category" (Big Cap / 毛票 / ETF).

---

## Phase 1: Anomaly Ranking MVP (Week 1)

### 1.1 Factor Engine
- [ ] Define 27 candidate factors (see FACTOR_LIBRARY.md)
- [ ] Implement factor computation from mock options snapshot
- [ ] Cross-sectional normalization (z-score within category)

### 1.2 Anomaly Scorer
- [ ] Weighted composite score (heuristic weights, Phase 1)
- [ ] Per-category ranking (Big Cap / 毛票 / ETF)
- [ ] Top-30 selection per category

### 1.3 Mock Data Refinement
- [ ] Assign known symbols to categories (AAPL→big_cap, SPCE→small_cap, SMH→etf)
- [ ] Generate realistic factor values per category
- [ ] $50B market cap threshold

### 1.4 API Layer
- [ ] `/ranking` endpoint (POST, filter by category)
- [ ] `/dashboard` endpoint (aggregate stats)
- [ ] `/factors` endpoint (factor values for a symbol)

### 1.5 Frontend
- [ ] Dashboard: 3-tab ranking view (Big Cap / 毛票 / ETF)
- [ ] Signal detail: factor breakdown bar chart
- [ ] Factors page: candidate factor list + IC placeholder

---

## Phase 2: Factor Research (Week 2)

### 2.1 Historical Mock Data
- [ ] Generate 3 months of daily mock snapshots
- [ ] Compute factor time series
- [ ] Calculate forward returns (1D, 5D)

### 2.2 Factor Validation
- [ ] IC analysis per factor (Spearman correlation)
- [ ] IR calculation (IC mean / IC std)
- [ ] Layered backtest (quantile returns)
- [ ] Factor correlation matrix

### 2.3 Weight Optimization
- [ ] IC-weighted combination
- [ ] Linear regression on factor returns
- [ ] Replace heuristic weights with data-driven weights

---

## Phase 3: Real Data Integration (Week 3-4)

### 3.1 FMP Integration
- [ ] Stock klines for technical factors
- [ ] Company profile for market cap / sector
- [ ] News fetcher

### 3.2 Theta Data Integration
- [ ] Options EOD snapshot
- [ ] Greeks data
- [ ] IV rank calculation

### 3.3 Pipeline Automation
- [ ] Daily scheduler (post-market close)
- [ ] SQLite persistence
- [ ] Incremental updates

---

## Phase 4: Backtest Engine (Week 5-6)

- [ ] Signal history tracking
- [ ] P&L per signal
- [ ] Win rate / Sharpe / Max drawdown
- [ ] Walk-forward analysis
- [ ] Parameter sensitivity

---

## Phase 5: Advanced Features (Week 7+)

- [ ] News sentiment scoring
- [ ] Real-time streaming (upgrade from EOD)
- [ ] Multi-strategy portfolio optimization
- [ ] Alert system (email/Slack)

---

## Phase 6: Broker Integration (Future)

- [ ] IBKR Client Portal API
- [ ] 长桥 OpenAPI
- [ ] Position tracking
- [ ] macOS Menu Bar (Tauri)

---

## CI/CD Status

| Check | Status |
|-------|--------|
| ruff lint | ✅ |
| ruff format | ✅ |
| mypy type check | ✅ |
| pytest | ⏳ |
| frontend build | ⏳ |

---

## Data Sources

| Source | Cost | Status | Priority |
|--------|------|--------|----------|
| FMP | Free tier (250 req/day) | Configured | Phase 3 |
| Theta Data | ~$25/mo | Configured | Phase 3 |
| Mock | Free | Active | Phase 1-2 |
