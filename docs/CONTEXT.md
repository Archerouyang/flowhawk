# Options Anomaly Screener — Domain Context

## Project Positioning

A personal quantitative options anomaly mining and LEAPS trading platform.

Bottom-up three-stage screening:
1. **Options Anomaly Detection** — Full-market scan for V/OI anomalies, IV mutations, block trade signals
2. **Stock Technical Filter** — K-line patterns, moving averages, volume + news sentiment analysis
3. **LEAPS Selection** — Delta/Theta/IV optimization, output 1-2 trade recommendations

Frontend covers: backtest, strategy selection, feature mining, factor research, live trading, signal capture.

Non-high-frequency. Daily granularity, end-of-day batch processing.

---

## Glossary

| Term | Definition | Synonyms / Avoid |
|------|------------|------------------|
| **Underlying** | Any tradeable asset (stock, ETF, option) | — |
| **Signal** | Trading recommendation (buy/sell/hold) | Use "signal" not "hint" |
| **Feature** | Raw computed value (V/OI, RSI, Delta) | Distinguish from signal |
| **Screener** | Filter universe for符合条件的列表 | Use "screen" not "scan" |
| **Backtest** | Validate strategy with historical data | — |
| **LEAPS** | Long-term options (DTE > 180 days) | — |
| **Factor** | Dimension explaining returns | — |
| **V/OI** | Volume / Open Interest ratio | — |
| **IV Rank** | Current IV percentile in 52-week range | — |
| **DTE** | Days to Expiration | — |

---

## Data Source Division

| Source | Data Type | Frequency | Purpose |
|--------|-----------|-----------|---------|
| **Theta Data** | Options EOD snapshot, Greeks, IV | End-of-day | Full-market anomaly scan |
| **FMP** | Stock K-lines, news | End-of-day | Technical filter + news sentiment |

---

## Strategy Classification

### 1. Signal Capture
- V/OI > 3, Volume spike > 5x, Premium > $100k
- IV Rank < 50% (don't buy expensive)
- Delta 0.50-0.85

### 2. Technical Filter
- Price > 200MA, > 20MA
- Volume > 20-day avg × 1.5
- RSI 30-70, ATR/Price < 5%
- News sentiment bonus

### 3. LEAPS Selection
- Delta 0.65-0.80
- DTE > 180
- Theta/Price < 0.3%
- Bid-Ask < 5%

### 4. Backtest
- Historical signal win rate statistics
- P&L ratio, Sharpe ratio, max drawdown

### 5. Factor Research
- IC analysis for each signal factor
- Factor decay, correlation matrix

### 6. Live Trading
- Signal execution tracking
- Position management, P&L monitoring

---

## Key Constraints

- Python 3.11.x fixed version
- Package manager: `uv`
- API keys via `.env`
- All changes via PR, CI pass required before merge
- Public GitHub repository
