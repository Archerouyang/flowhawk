# Options Anomaly Screener

基于期权异常信号的 LEAPS 交易筛选系统。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     每日盘后 Pipeline                         │
├─────────────────────────────────────────────────────────────┤
│  Theta Data EOD  ──▶  期权异常检测  ──▶  正股技术面过滤       │
│  (全市场快照)         (V/OI/IV/Premium)   (MA/RSI/ATR)      │
│                                              +              │
│                                         新闻情绪分析        │
│                                              │              │
│                                              ▼              │
│                                   LEAPS 精选引擎            │
│                                   (Delta/Theta/IV筛选)      │
│                                              │              │
│                                              ▼              │
│                                   1-2个交易建议             │
│                                   + Streamlit 可视化面板    │
└─────────────────────────────────────────────────────────────┘
```

## 数据源

| 数据源 | 用途 | 成本 |
|--------|------|------|
| **Theta Data** | 期权 EOD 快照 + Greeks | ~$25/月 |
| **FMP** | 股票 K 线 + 新闻 | 免费档 / $19/月起 |

## 核心模块

```
src/
├── data_sources/          # 数据源适配器
│   ├── theta_data.py      # Theta Data SDK 封装
│   └── fmp.py             # FMP API (股票 + 新闻)
├── screening/             # 三层筛选引擎
│   ├── options_anomaly.py # Stage 1: 期权异常检测
│   ├── stock_technical.py # Stage 2: 技术面 + 新闻过滤
│   └── leaps_selector.py  # Stage 3: LEAPS 精选
├── models/                # 数据模型
│   ├── option_contract.py
│   ├── stock_bar.py
│   └── trade_signal.py
└── storage/               # Parquet 本地存储
    └── parquet_store.py

dashboard/                  # Streamlit 可视化
├── app.py                  # 主入口
└── pages/
    ├── 01_screener.py      # 筛选器
    ├── 02_signals.py       # 信号详情
    ├── 03_backtest.py      # 回测
    ├── 04_strategies.py    # 策略选择
    ├── 05_features.py      # 特征挖掘
    ├── 06_factors.py       # 因子研究
    └── 07_live.py          # 实盘交易

scripts/
└── daily_scan.py           # 每日盘后 CLI
```

## 快速开始

```bash
# 1. 安装依赖
cd quantResearch
uv sync

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env 填入 THETA_DATA_USER / THETA_DATA_PASS / FMP_API_KEY

# 3. 运行每日扫描
uv run python scripts/daily_scan.py

# 4. 启动可视化面板
uv run streamlit run dashboard/app.py
```

## 信号定义

### Stage 1: 期权异常

| 信号 | 阈值 | 权重 |
|------|------|------|
| V/OI 比率 | ≥ 3.0x | 30% |
| 成交量突增 | ≥ 5x 20日均值 | 20% |
| 名义本金 | ≥ $100,000 | 15% |
| IV Rank | ≤ 50% | 15% |
| DTE | 180-730 天 | 10% |
| Delta | 0.50-0.85 | 10% |

### Stage 2: 技术面过滤

- 价格 > 200日均线
- 价格 > 20日均线
- 成交量 > 20日均量 × 1.5
- RSI 30-70
- ATR/价格 < 5%
- 新闻情绪加分

### Stage 3: LEAPS 精选

- Delta: 0.65-0.80
- DTE: > 180 天
- Theta/价格 < 0.3%
- Bid-Ask Spread < 5%
- IV Percentile < 50%

## CI / CD

- **Lint**: ruff
- **Type Check**: mypy
- **Test**: pytest
- **Coverage**: codecov

所有变更必须通过 PR 审查，CI 通过后方可合并。

## License

MIT
