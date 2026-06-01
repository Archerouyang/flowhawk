# FlowHawk Anomaly Ranking (异动榜)

> Daily top-30 anomaly ranking by asset category. Replaces the previous signal-type-centric design.

---

## Product Definition

**What:** A daily leaderboard showing the most anomalous options activity, split by asset type.

**Why:** Different asset types have different anomaly patterns. Big-cap tech moves on institutional flow; 毛票 moves on retail/sentiment; ETFs move on hedging/rotation.

**Output:** 3 ranked lists × 30 entries each, updated daily after market close.

---

## Asset Classification

| Category | Criteria | Examples |
|----------|----------|----------|
| **Big Cap** | Market Cap ≥ $50B | AAPL, MSFT, GOOGL, META, NVDA, TSLA, AMD, AVGO |
| **毛票 (Small Cap)** | Market Cap < $50B | SPCE, ONDS, BSX, PLTR, CRWD, MSTR |
| **ETF** | `is_etf = true` | SPY, QQQ, SMH, XLF, XLE, IWM, ARKK |

> Note: Sector is secondary. Primary split is by size / vehicle type.

---

## Ranking Algorithm

### Step 1: Compute Factor Values

For each symbol, compute all 27 factors from [FACTOR_LIBRARY.md](FACTOR_LIBRARY.md) using the daily options snapshot.

### Step 2: Compute Anomaly Score

```
anomaly_score = Σ (factor_i_normalized × weight_i)
```

Initial weights (heuristic, Phase 1 mock):

| Factor | Weight | Rationale |
|--------|--------|-----------|
| `voi_ratio` | 0.15 | Volume vs open interest — core anomaly metric |
| `volume_cp_ratio` | 0.15 | Directional conviction |
| `leap_volume_cp_ratio` | 0.15 | Smart money LEAPS positioning |
| `theta_price_ratio` | 0.10 | Time decay cost efficiency |
| `iv_rank` | 0.10 | Don't buy expensive options |
| `delta_quality` | 0.10 | Optimal delta range |
| `price_vs_sma20` | 0.10 | Short-term trend confirmation |
| `spread_ratio` | 0.05 | Liquidity check |
| `premium` | 0.05 | Dollar flow magnitude |
| `rsi_14` | 0.05 | Mean reversion / momentum |

### Step 3: Per-Category Ranking

```python
for category in ["big_cap", "small_cap", "etf"]:
    symbols = filter_by_category(all_symbols, category)
    ranked = sorted(symbols, key=lambda s: s.anomaly_score, reverse=True)
    top_30 = ranked[:30]
```

### Step 4: Output Format

Each entry in the ranking:

```json
{
  "rank": 1,
  "symbol": "AAPL",
  "category": "big_cap",
  "anomaly_score": 87.3,
  "top_factors": [
    {"factor": "leap_volume_cp_ratio", "value": 4.33, "z_score": 2.8},
    {"factor": "voi_ratio", "value": 8.5, "z_score": 2.1}
  ],
  "contract": {
    "strike": 185.0,
    "expiration": "2026-12-18",
    "option_type": "C",
    "last_price": 12.5
  },
  "greeks": {
    "delta": 0.72,
    "theta": -0.035,
    "gamma": 0.012,
    "vega": 0.18
  },
  "narrative": "LEAPS call C/P 4.33x, 203 DTE, theta/price 0.28%"
}
```

---

## Frontend Display

### Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ 🦅 FlowHawk Anomaly Ranking — 2026-06-01                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Big Cap]  [毛票]  [ETF]                                   │
│                                                             │
│  ┌───┬───────┬─────┬──────────┬──────┬─────────────────┐   │
│  │ # │ Sym   │Score│ C/P      │ DTE  │ Narrative       │   │
│  ├───┼───────┼─────┼──────────┼──────┼─────────────────┤   │
│  │ 1 │ AAPL  │ 87  │ 4.33     │ 203  │ LEAPS call build│   │
│  │ 2 │ MSFT  │ 82  │ 3.12     │ 180  │ Smart money     │   │
│  │ 3 │ NVDA  │ 78  │ 2.89     │ 195  │ Post-earnings   │   │
│  └───┴───────┴─────┴──────────┴──────┴─────────────────┘   │
│                                                             │
│  [View Full List →]                                         │
└─────────────────────────────────────────────────────────────┘
```

### Signals Page (Detail)

Click any row → expand to full signal card:
- Greeks grid (delta/gamma/theta/vega)
- Factor breakdown bar chart (which factors drove the score)
- Contract details (strike, expiry, bid/ask)
- Risk metrics (max loss, theta decay per day)
- [Future] News sentiment panel

---

## API Design

```
POST /ranking
Request:
  {
    "date": "2026-06-01",
    "category": "big_cap"  // optional: "all" | "big_cap" | "small_cap" | "etf"
  }

Response:
  {
    "date": "2026-06-01",
    "category": "big_cap",
    "total": 30,
    "rankings": [...]
  }
```

---

## Implementation Order

| Step | Task | Est |
|------|------|-----|
| 1 | Refactor mock data: assign known symbols to categories | 2h |
| 2 | Build factor computation engine (`src/factors/`) | 1d |
| 3 | Build anomaly scorer (weighted composite) | 4h |
| 4 | Build category filter + ranking generator | 3h |
| 5 | `/ranking` API route | 2h |
| 6 | Frontend: Dashboard 3-tab ranking view | 1d |
| 7 | Frontend: Signal detail card with factor breakdown | 1d |
| 8 | Frontend: Factors page (IC analysis placeholder) | 4h |

---

## Future: Factor Research

Phase 2 adds data-driven weight optimization:

1. Generate 3 months of daily snapshots
2. Compute factor IC vs forward returns
3. Optimize weights via IC-weighting or ML
4. Update scoring model

See [FACTOR_LIBRARY.md](FACTOR_LIBRARY.md) for factor definitions.
