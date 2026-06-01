# FlowHawk Factor Library

> Candidate factors for options anomaly scoring. Organized by category. All factors are cross-sectional (computed per symbol per day).
>
> Reference: [Microsoft RD-Agent](https://github.com/microsoft/rd-agent) — factor mining automation framework.

---

## Category Overview

| Category | Factors | Purpose | Data Source |
|----------|---------|---------|-------------|
| **Options Core** | 12 | Volume, OI, C/P ratio, Greeks, IV | Theta Data / Mock |
| **Value** | 8 | P/E, P/B, ROE, dividend yield, etc. | FMP |
| **Macro** | 6 | VIX, yield curve, DXY, credit spread | FMP / Yahoo |
| **Fama-French 3-Factor** | 3 | MKT-RF, SMB, HML | FMP / Computed |
| **News** | 5 | Sentiment, volume, social, insider | FMP / Scraping |

---

## 1. Options Core Factors

> **Primary drivers of anomaly detection.** These are our core competitive factors.

### 1.1 C/P Ratio

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `volume_cp_ratio` | Call Volume / Put Volume | Bullish > 2, Bearish < 0.5 |
| `oi_cp_ratio` | Call OI / Put OI | Institutional directional bias |
| `leap_volume_cp_ratio` | LEAPS Call Vol / LEAPS Put Vol (DTE ≥ 90) | Smart money conviction |
| `nonleap_volume_cp_ratio` | Non-LEAPS Call Vol / Non-LEAPS Put Vol (DTE < 90) | Short-term sentiment |
| `leap_oi_cp_ratio` | LEAPS Call OI / LEAPS Put OI (DTE ≥ 90) | Long-term positioning |

### 1.2 LEAP Characteristic

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `leap_ratio` | LEAPS Volume / Total Volume | > 3 = not day-trade money |
| `leap_oi_ratio` | LEAPS OI / Total OI | Long-term positioning intensity |
| `leap_premium_ratio` | LEAPS Premium / Total Premium | Capital to far-dated |

### 1.3 Activity

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `voi_ratio` | Volume / Open Interest | > 3 = unusual vs positions |
| `volume_spike` | Today Volume / 30D Avg Volume | > 5x = significant spike |
| `premium` | Last Price × Volume × 100 | Dollar flow |
| `oi_change` | ΔOI / Yesterday OI | Buildup or unwind |

### 1.4 Greeks

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `delta` | Option Delta | 0.5-0.8 optimal for LEAPS |
| `theta_price_ratio` | \|Theta\| / Last Price | < 0.3% ideal |
| `gamma` | Option Gamma | Acceleration risk |
| `vega` | Option Vega | Volatility sensitivity |
| `delta_quality` | 1 - \|\|Delta\| - 0.725\| / 0.725 | Sweet spot proximity |

### 1.5 IV & Spread

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `iv_rank` | Current IV %ile in 52W | < 50% = cheap options |
| `iv_skew` | ATM Put IV - ATM Call IV | > 0 = fear premium |
| `term_structure` | 90D IV - 30D IV | Contango / backwardation |
| `spread_ratio` | (Ask - Bid) / Ask | < 5% liquid |

---

## 2. Value Factors

> From FMP fundamentals. Distinguish big-cap value (AAPL, MSFT) vs growth (NVDA, AMD).

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `pe_ttm` | Price / Earnings (TTM) | < 20 = value, > 40 = growth |
| `pb_ratio` | Price / Book Value | < 2 = value |
| `ps_ratio` | Price / Sales | Lower = value |
| `ev_ebitda` | EV / EBITDA | Lower = value |
| `dividend_yield` | Annual Dividend / Price | > 2% = value characteristic |
| `roe` | Net Income / Equity | > 15% = quality |
| `profit_margin` | Net Income / Revenue | Stability indicator |
| `debt_equity` | Total Debt / Equity | < 0.5 = healthy |

---

## 3. Macro Factors

> Market regime indicators. Affect all options pricing.

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `vix_level` | VIX Index | > 30 = high fear, < 15 = complacency |
| `yield_curve_slope` | 10Y Yield - 2Y Yield | < 0 = inversion (recession signal) |
| `dxy_trend` | DXY 20D return | Strong USD = headwind for multinationals |
| `credit_spread` | HY OAS - IG OAS | Widening = risk-off |
| `fed_funds_expectation` | Fed Funds Futures - Current | Rate cut/hike expectation |
| `put_call_index` | CBOE Total P/C Ratio | > 1.2 = extreme fear |

---

## 4. Fama-French 3-Factor

> Classic asset pricing model. Helps classify stock style.

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `mkt_rf` | Market Return - Risk-Free Rate | Equity risk premium |
| `smb` | Small Cap Return - Big Cap Return | Size premium |
| `hml` | High B/P Return - Low B/P Return | Value premium |

> Usage: Compute factor loadings (β) for each symbol. High SMB + low HML = growth. Low SMB + high HML = value.

---

## 5. News Factors

> Alternative data for sentiment and catalyst detection.

| Factor ID | Formula | Interpretation |
|-----------|---------|----------------|
| `news_sentiment_score` | Avg sentiment (-1 to 1) of last 7 days | > 0.3 = bullish |
| `news_volume` | Article count last 7 days | Spike = catalyst |
| `social_mention_velocity` | Social media mentions Δ% | Retail interest proxy |
| `insider_buy_ratio` | Insider Buy Volume / Sell Volume | > 2 = strong signal |
| `analyst_rating_change` | Net upgrade - downgrade | Directional conviction |

---

## Scoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Anomaly Score Model                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Options Core (weight: 0.50)                                │
│    ├── C/P Ratio       (0.15)                               │
│    ├── LEAP Character  (0.10)                               │
│    ├── Activity        (0.10)                               │
│    ├── Greeks          (0.10)                               │
│    └── IV & Spread     (0.05)                               │
│                                                             │
│  Value (weight: 0.15)                                       │
│    ├── P/E, P/B, ROE, Dividend Yield                        │
│                                                             │
│  Macro (weight: 0.10)                                       │
│    ├── VIX, Yield Curve, DXY, Credit Spread                 │
│                                                             │
│  Fama-French (weight: 0.10)                                 │
│    ├── SMB loading, HML loading                             │
│                                                             │
│  News (weight: 0.15)                                        │
│    ├── Sentiment, Volume, Insider, Analyst                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1 (Mock): Heuristic Weights

Use the weights above as starting point.

### Phase 2 (Data-Driven): IC Optimization

1. Generate 3 months mock history
2. Compute all factors daily
3. Calculate IC vs forward 1D/5D/20D returns per category
4. Optimize weights per category:
   - Big Cap: more weight on value + macro
   - 毛票: more weight on options core + news
   - ETF: more weight on macro + C/P

---

## Factor Count Summary

| Category | Count |
|----------|-------|
| Options Core | 16 |
| Value | 8 |
| Macro | 6 |
| Fama-French | 3 |
| News | 5 |
| **Total** | **38** |

---

## Data Source Mapping

| Factor Category | Primary Source | Fallback |
|-----------------|----------------|----------|
| Options Core | Theta Data | Mock |
| Value | FMP | Mock (randomized) |
| Macro | FMP / Yahoo Finance | Mock |
| Fama-French | Computed from FMP | Mock |
| News | FMP News API | Mock |
