# FlowHawk Signal Analysis Framework

> Abstracted from real-world analysis patterns. Each signal type maps to detectable, quantifiable rules.

---

## Signal Taxonomy

### 1. Smart Money LEAPS 🔮

**What:** Long-dated call accumulation while stock is flat or down. Institutions using calls as stock replacement.

**Detect Rules:**
```
DTE > 150
AND C/P > 2.0
AND LEAP_Ratio > 3.0
AND Price_Change_Day < 0.02   # stock flat or down
AND Hottest_Contract_DTE > 90  # not day-trader expiry
```

**Narrative:** "{symbol} 跌/平 {pct}%，但 {dte} 天 {strike} call 异常堆积——聪明钱在建远月仓"

**Historical Win Rate:** Track in backtest module

**User Example:** BSX (C/P 4.33, LEAP 4.53, stock -2.68%, hottest = 203 DTE)

---

### 2. First Timer 🆕

**What:** Symbol never appeared on options anomaly list before, suddenly shows extreme LEAPS call activity.

**Detect Rules:**
```
First_Appearance = True        # never in anomalies table before
AND LEAPS_Call_Rate > 10.0
AND Market_Cap < 10B          # small/mid cap more explosive
```

**Narrative:** "{symbol} 首次上榜，LEAPS call {rate}x——小盘/新叙事，容易被忽视"

**Historical Win Rate:** SPCE pattern: 4/6 detected → +201% in 2 months

**Key Insight:** First appearance + extreme LEAPS = highest alpha potential. Market hasn't priced in the narrative yet.

---

### 3. Index Hedge Alert 🛡️

**What:** ETF/index puts堆积 while underlying components are bullish. "Long alpha + short beta" institutional structure.

**Detect Rules:**
```
ETF_Category = True
AND C/P < 0.5
AND Underlying_Change > 0.005   # index up
AND Put_Wall_Detected = True     # single expiry > 30% of put volume
```

**Narrative:** "{symbol} 涨 {pct}%，但 put 墙高耸——机构在锁尾部风险"

**User Example:** SMH (C/P 0.14, underlying +0.73%, put wall at 550 strike)

---

### 4. Gamma Squeeze Watch 🚀

**What:** Small-cap + massive single-day move + extreme call concentration. Day-traders + momentum algos piling in.

**Detect Rules:**
```
Market_Cap < 5B
AND Price_Change_Day > 0.15    # +15% day
AND C/P > 3.0
AND LEAP_Ratio > 5.0           # not just day-trade,远月也热
AND Volume > 10x_Avg_30d
```

**Narrative:** "{symbol} 单日 +{pct}%，{volume}x 放量——远月也堆 call，赌的不是今天"

**User Example:** ONDS (+22.69%, C/P 4.41, LEAP 7.44, policy narrative)

**Risk:** High volatility, tight stops needed.

---

### 5. Sector Rotation 🔄

**What:** Multiple symbols in same sector show call anomaly simultaneously. Institutional sector reallocation.

**Detect Rules:**
```
Sector_Signal_Count >= 3       # 3+ symbols in same sector
AND AVG(C/P) > 2.0
AND Sector_ETF_C/P > 1.5       # sector ETF also bullish
```

**Narrative:** "{sector} 今日 {count} 只标的异常——板块级资金流入"

---

## Key Metrics Dictionary

| Metric | Formula | Meaning |
|--------|---------|---------|
| **C/P Ratio** | Call_Volume / Put_Volume | >2 = bullish, <0.5 = bearish |
| **LEAP Ratio** | LEAPS_Volume / Total_Volume | >3 = not day-trade money |
| **LEAPS Call Rate** | LEAPS_Call_Volume / LEAPS_Put_Volume | Extreme values = directional conviction |
| **First Appearance** | Symbol not in anomalies (last 90 days) | New narrative discovery |
| **Price Divergence** | Sign(Price_Change) ≠ Sign(Option_Sentiment) | Smart money vs market sentiment |
| **Volume Concentration** | Hottest_Contract_Volume / Total_Volume | >30% = concentrated bet |
| **Strike Distance** | (Strike - Spot) / Spot | OTM %, directional conviction magnitude |

---

## Signal Scoring

Each detected signal gets a composite score (0-100):

```
Score = Base_Score(Type) × Multipliers

Base_Score:
  Smart Money LEAPS: 25
  First Timer: 30
  Index Hedge: 20
  Gamma Squeeze: 15
  Sector Rotation: 25

Multipliers:
  LEAPS_Call_Rate > 10: ×1.5
  First Appearance: ×1.3
  Price_Divergence (down day + call): ×1.4
  Volume > 10x average: ×1.2
  News catalyst detected: ×1.2
  Market_Cap < 2B: ×1.3  (smaller = more explosive)
```

**Score Tiers:**
- 80-100: 🔴 ** conviction trade** — highest priority
- 60-79: 🟠 **strong signal** — add to watchlist
- 40-59: 🟡 **interesting** — monitor
- <40: ⚪ **noise** — ignore

---

## UI Impact

### Dashboard
```
┌──────────────────────────────────────────────┐
│ 今日信号总览                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │🔮 Smart │ │🆕 First │ │🛡️ Hedge │         │
│ │   3     │ │   1     │ │   1     │         │
│ └─────────┘ └─────────┘ └─────────┘         │
├──────────────────────────────────────────────┤
│ Top 5 高置信度信号                              │
│ #1 SPCE  🆕 First Timer  Score: 94           │
│    "首次上榜，LEAPS call 27x，小盘航空概念"      │
│ #2 BSX   🔮 Smart Money  Score: 87           │
│    "跌2.68%建12月远月call，C/P 4.33"           │
│ ...                                          │
├──────────────────────────────────────────────┤
│ Sector Heatmap                               │
│ Tech ████████ 8  Healthcare ████ 3          │
│ ...                                          │
└──────────────────────────────────────────────┘
```

### Screener
- **Signal Type** filter: multi-select [🔮🆕🛡️🚀🔄]
- **Score** slider: 0-100
- **Narrative** column: auto-generated one-liner
- **First Appearance** badge: 🆕 icon

### Signals (Detail)
- **Signal Card** = narrative + Greeks + risk + news
- **Historical Similar** tab: past signals with same pattern
- **Thesis Panel**: "Why this signal matters" (auto-generated from rules)
- **Failure Mode**: "If wrong, most likely because..."

---

## Implementation Priority

| Phase | Feature | Est |
|-------|---------|-----|
| 1 | First Appearance detection + flag | 2h |
| 2 | Signal Type classifier (5 types) | 4h |
| 3 | Narrative generator (template-based) | 3h |
| 4 | Score engine + tier system | 2h |
| 5 | Dashboard redesign (signal-centric) | 4h |
| 6 | Historical Similar signal lookup | 3h |
| 7 | Sector Rotation detector | 2h |
