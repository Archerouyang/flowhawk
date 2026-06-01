# FlowHawk Signal Framework

> Updated: 2026-06-01 | Shifted from behavior-type signals to anomaly ranking by asset category.

---

## Asset Classification

| Category | Criteria | Examples |
|----------|----------|----------|
| **Big Cap** | Market Cap ≥ $50B | AAPL, MSFT, GOOGL, META, NVDA, TSLA, AMD, AVGO, QCOM |
| **毛票 (Small Cap)** | Market Cap < $50B | SPCE, ONDS, BSX, PLTR, CRWD, MSTR, SOFI |
| **ETF** | `is_etf = true` | SPY, QQQ, SMH, XLF, XLE, IWM, ARKK, XBI |

---

## Anomaly Score Composition

**Phase 1 (Mock):** Weighted heuristic
```
anomaly_score = Σ (factor_i_normalized × weight_i)
```

**Phase 2 (Data-driven):** IC-weighted or ML-optimized

See [FACTOR_LIBRARY.md](FACTOR_LIBRARY.md) for factor definitions and weights.

---

## Ranking Output

For each trading day, produce 3 ranked lists:

| List | Count | Sort By |
|------|-------|---------|
| Big Cap Anomaly Ranking | Top 30 | anomaly_score desc |
| 毛票 Anomaly Ranking | Top 30 | anomaly_score desc |
| ETF Anomaly Ranking | Top 30 | anomaly_score desc |

---

## Narrative Templates

Auto-generated one-liner per entry:

**Big Cap:**
"{symbol} LEAPS call C/P {cp_ratio:.1f}x, {dte} DTE, θ/price {theta_ratio:.2%} — institutional accumulation"

**毛票:**
"{symbol} {volume_spike:.1f}x volume spike, C/P {cp_ratio:.1f}x — narrative-driven retail flow"

**ETF:**
"{symbol} put wall at ${strike}, C/P {cp_ratio:.2f} — hedge/rotation flow"

---

## Legacy Signal Types (Deprecated)

The previous 5-type classification (Smart Money / First Timer / Index Hedge / Gamma Squeeze / Sector Rotation) is deprecated. The category-based approach replaces it.

If needed, "behavior tags" can be added later as secondary labels:
- `first_appearance` — symbol not in ranking last 90 days
- `put_wall` — single put strike > 30% of put OI
- `sector_concentration` — 3+ symbols in same sector top-30

---

## UI Design

### Dashboard
```
┌─────────────────────────────────────────────┐
│ 🦅 FlowHawk — 2026-06-01                     │
├─────────────────────────────────────────────┤
│  [Big Cap] [毛票] [ETF]                      │
│                                             │
│  #  Symbol  Score  C/P    DTE   Narrative   │
│  1  AAPL    87     4.33   203   LEAPS build │
│  2  MSFT    82     3.12   180   Smart money │
│  3  NVDA    78     2.89   195   Post-earn   │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Signal Detail (Click Row)
- Factor breakdown bar chart
- Greeks grid
- Contract details
- [Future] News sentiment

---

## Implementation Order

| Step | Task | Est |
|------|------|-----|
| 1 | Refactor mock symbol meta with categories | 2h |
| 2 | Build factor engine | 1d |
| 3 | Build anomaly scorer + ranking | 4h |
| 4 | `/ranking` API | 2h |
| 5 | Frontend: 3-tab dashboard | 1d |
| 6 | Frontend: signal detail card | 1d |
