# FlowHawk Architecture Plan

> Approved design decisions from discussion with @archer

---

## 1. Logging & Error Handling

### Backend (Python)

```
logs/
├── app/
│   └── YYYY-MM-DD.log          # structlog JSON, 7-day rotation
├── pipeline/
│   └── YYYY-MM-DD.log          # daily scan pipeline logs
└── errors/
    └── YYYY-MM-DD.log          # exceptions + stack traces
```

- **Format:** JSON lines (timestamp, level, module, message, context)
- **Rotation:** 7 days, auto-delete older files
- **Alert:** consecutive API failures ≥ 3 → log WARNING + console alert
- **No Obsidian sync**

### Frontend (React)

- **Error Boundary:** catches React render errors → Toast notification
- **API Wrapper:** auto-retry 1x, then log to backend `/log` endpoint
- **Console:** dev-only verbose logs, production stripped

---

## 2. News Module

### 2A. Signal-Attached News (Deep Research)

**Trigger:** When anomaly detected → fetch news for that symbol

**Flow:**
```
Anomaly detected (AAPL)
  → Fetch FMP stock_news (AAPL, last 7 days)
  → Store in SQLite (news table)
  → Display in Signals page (below signal card)
  → [Future] LLM sentiment analysis on news batch
```

**UI:** Collapsible "News Research" panel inside each Signal card

### 2B. Independent News Feed

**Source:** FMP general news + macro news

**Categories:**
- 📰 Daily Finance (earnings, M&A, Fed)
- 🌍 Macro (rates, inflation, GDP)
- 🚀 Tech (AI, semiconductors, biotech)

**UI:** Dedicated `/news` page with tabs

---

## 3. Dashboard / Screener / Signals Logic

### Data Flow (One Pipeline, Three Views)

```
┌─────────────────────────────────────────────────────────────┐
│  Pipeline (triggered: manual / scheduled / continuous)      │
│                                                             │
│  Step 1: Options Anomaly Scan                               │
│    → Input:  full-market options snapshot                   │
│    → Output: anomalies table (SQLite)                       │
│                                                             │
│  Step 2: Technical Filter + News Context                    │
│    → Input:  anomalies + stock klines + news                │
│    → Output: filtered table (SQLite)                        │
│                                                             │
│  Step 3: LEAPS Selection + Classification                   │
│    → Input:  filtered + market cap + sector data            │
│    → Output: signals table (SQLite)                         │
│              ├─ type: ETF | STOCK                           │
│              ├─ cap: LARGE | GROWTH                         │
│              └─ category: [sector tags]                     │
└─────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Dashboard│   │ Screener │   │ Signals  │
   │ (summary)│   │ (detail) │   │ (action) │
   └──────────┘   └──────────┘   └──────────┘
```

### Dashboard Refresh Strategy

**Chosen approach: Cached + Manual Refresh**

1. **On page load:** Read from SQLite cache (instant, no pipeline run)
2. **Background:** Scheduler runs pipeline at market close (16:35 ET)
3. **Manual:** "🔄 Refresh Now" button triggers full pipeline
4. **Future (continuous mode):** Scheduler runs every 15 min during market hours

**Why not auto-run on open?**
- Pipeline takes 30-60s (full market scan)
- User wants instant dashboard, not loading spinner
- Daily EOD scan covers 99% of use case

### Signal Classification

Each signal gets tagged at generation time:

| Dimension | Values | Source |
|-----------|--------|--------|
| **Asset Type** | `ETF` / `STOCK` | FMP profile |
| **Market Cap** | `LARGE` (> $10B) / `GROWTH` (< $10B) | FMP market cap |
| **Sector** | `TECH`, `HEALTHCARE`, `FINANCE`, ... | FMP sector |
| **Anomaly Type** | `VOLUME_SPIKE`, `IV_SKEW`, `PREMIUM_SURGE` | Pipeline detection |

**UI Impact:**
- Dashboard: KPI cards split by type (Large Cap Signals, Growth Signals, ETF Signals)
- Screener: Filter sidebar adds "Asset Type", "Cap", "Sector" checkboxes
- Signals: Signal cards show type badge (e.g., "🚀 GROWTH | TECH")

### Cardinality

- **1 Anomaly → 0 or 1 Signal** (LEAPS selector is strict)
- **1 Symbol → N Anomalies** (different strikes/expirations)
- **1 Symbol → ≤ N Signals** (one per qualifying anomaly)

---

## 4. SQLite Schema

```sql
-- Pipeline runs
CREATE TABLE pipeline_runs (
    id INTEGER PRIMARY KEY,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stage TEXT,              -- 'anomaly', 'technical', 'leaps'
    status TEXT,             -- 'running', 'success', 'error'
    records_in INTEGER,
    records_out INTEGER,
    error_msg TEXT
);

-- Anomalies (Stage 1 output)
CREATE TABLE anomalies (
    id INTEGER PRIMARY KEY,
    run_id INTEGER,
    symbol TEXT,
    option_type TEXT,
    strike REAL,
    expiration DATE,
    last_price REAL,
    volume INTEGER,
    open_interest INTEGER,
    voi_ratio REAL,
    delta REAL,
    gamma REAL,
    theta REAL,
    vega REAL,
    implied_volatility REAL,
    anomaly_score REAL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(id)
);

-- Signals (Stage 3 output)
CREATE TABLE signals (
    id INTEGER PRIMARY KEY,
    run_id INTEGER,
    anomaly_id INTEGER,
    symbol TEXT,
    option_type TEXT,
    strike REAL,
    expiration DATE,
    entry_price REAL,
    delta REAL,
    theta REAL,
    leaps_score REAL,
    confidence_score REAL,
    asset_type TEXT,         -- 'ETF' | 'STOCK'
    cap_type TEXT,           -- 'LARGE' | 'GROWTH'
    sector TEXT,
    rationale TEXT,
    status TEXT DEFAULT 'active',  -- 'active', 'expired', 'closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(id),
    FOREIGN KEY (anomaly_id) REFERENCES anomalies(id)
);

-- News (attached to symbols)
CREATE TABLE news (
    id INTEGER PRIMARY KEY,
    symbol TEXT,             -- NULL for macro news
    title TEXT,
    source TEXT,
    url TEXT,
    published_at TIMESTAMP,
    sentiment REAL,          -- -1.0 to 1.0, NULL until LLM
    is_macro BOOLEAN DEFAULT FALSE,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Implementation Order

| Phase | Task | Est |
|-------|------|-----|
| 1 | SQLite schema + connection module | 2h |
| 2 | Logging infra (backend + frontend) | 2h |
| 3 | Pipeline → SQLite persistence | 3h |
| 4 | Dashboard read from SQLite + refresh button | 2h |
| 5 | Screener read from SQLite + filters | 2h |
| 6 | Signals read from SQLite + classification | 2h |
| 7 | News fetcher (FMP) + SQLite storage | 3h |
| 8 | News UI (attached + independent) | 4h |
| 9 | Scheduler (APScheduler) for auto-run | 2h |

**Total: ~22h**

---

## 6. Decisions Awaiting Confirmation

- [x] Log: temp files, 7-day rotation, alert on 3+ failures
- [x] News: signal-attached (deep research) + independent feed
- [x] Storage: SQLite
- [x] Dashboard: cached + manual refresh (not auto-run on open)
- [x] Cardinality: 1 anomaly → ≤ 1 signal
- [x] Classification: ETF/STOCK + LARGE/GROWTH + sector
- [ ] **Scheduler library:** APScheduler vs schedule vs custom? (recommend APScheduler)
- [ ] **News sentiment:** rule-based keyword now, or skip until LLM?
