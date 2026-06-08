# ADR-0002: Options Anomaly Screener Architecture

## Status
Proposed → Approved

## Context
需要构建一个"自下而上"的期权异常信号扫描系统：
1. 从全市场期权数据中挖掘异常信号（成交量/持仓量比、IV 突变、Greeks 异常）
2. 对筛选出的标的进行正股技术面精筛（K线形态、均线、成交量）
3. 最终输出 1-2 个可行的 LEAPS 交易建议
4. 需要一个好看的可视化前端展示结果

## Decision: 技术栈

### 后端
| 组件 | 选型 | 理由 |
|------|------|------|
| 语言 | Python 3.11+ | 量化生态最成熟 |
| 包管理 | uv | 项目已有，极速依赖管理 |
| 数据处理 | Polars | 比 Pandas 快 10-50x，处理百万级期权合约必备 |
| 数据源1 | Theta Data Python SDK | EOD 全市场快照 + Greeks + Trade Streams，$80/月 (Standard) |
| 数据源2 | yfinance | 正股 K 线（免费） |
| 缓存/存储 | Parquet + DuckDB | 本地列式存储，查询极快 |
| API 服务 | FastAPI | 为前端提供 REST API |

### 前端
| 组件 | 选型 | 理由 |
|------|------|------|
| 框架 | Streamlit | 最快搭建数据仪表盘的 Python 方案，内置交互组件 |
| 图表 | Plotly (via Streamlit) | 交互式图表，支持 candlestick、IV skew、volume |
| 表格 | Ag-Grid (via streamlit-aggrid) | 支持排序/筛选/分页的大数据表格 |
| 样式 | Streamlit 原生主题 + 自定义 CSS | 支持 dark mode |

> 备选：如果 Streamlit 不够灵活，可迁移到 Dash。但 Streamlit 对单用户本地工具是最优解。

## Decision: 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                     每日盘后 Pipeline                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Theta Data   │───▶│ Options      │───▶│ Anomaly      │  │
│  │ EOD Snapshot │    │ Raw Store    │    │ Detection    │  │
│  │ (Full Market)│    │ (Parquet)    │    │ Engine       │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                  │          │
│                                                  ▼          │
│                                         ┌──────────────┐   │
│                                         │ Filtered     │   │
│                                         │ Tickers      │   │
│                                         │ (20-50)      │   │
│                                         └──────┬───────┘   │
│                                                │            │
│  ┌──────────────┐    ┌──────────────┐         │            │
│  │ yfinance     │───▶│ Stock K-line │◀────────┘            │
│  │ Historical   │    │ Store        │                      │
│  └──────────────┘    └──────┬───────┘                      │
│                             │                               │
│                             ▼                               │
│                    ┌──────────────┐                         │
│                    │ Technical    │                         │
│                    │ Filter       │                         │
│                    └──────┬───────┘                         │
│                           │                                 │
│                           ▼                                 │
│                    ┌──────────────┐                         │
│                    │ LEAPS        │                         │
│                    │ Selector     │                         │
│                    └──────┬───────┘                         │
│                           │                                 │
│                           ▼                                 │
│                    ┌──────────────┐                         │
│                    │ Trade        │                         │
│                    │ Report       │                         │
│                    │ (1-2 picks)  │                         │
│                    └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Streamlit       │
                    │  Dashboard       │
                    │  (Interactive)   │
                    └──────────────────┘
```

## Decision: 信号定义

### Stage 1: 期权异常信号（全市场过滤）

| 信号 | 公式 | 阈值 | 权重 |
|------|------|------|------|
| V/OI 比率 | `volume / open_interest` | > 3.0 | 30% |
| 成交量突增 | `volume / avg_volume_20d` | > 5.0 | 20% |
| 名义本金 | `last_price * volume * 100` | > $100,000 | 15% |
| IV Rank | `当前IV / 52周IV范围` | < 50% | 15% |
| DTE 范围 | `days_to_expiration` | 180-730 | 10% |
| Delta 范围 | `delta` | 0.50-0.85 | 10% |

> 综合得分 = Σ(信号值_normalized * 权重)，取前 50 名进入 Stage 2

### Stage 2: 正股技术面过滤

| 指标 | 条件 | 说明 |
|------|------|------|
| 价格 vs 200MA | `close > sma_200` | 只选上升趋势 |
| 短期动量 | `close > sma_20` | 短期强势 |
| 成交量确认 | `volume > avg_volume_20d * 1.5` | 放量突破 |
| RSI | `30 < RSI_14 < 70` | 排除极端超买超卖 |
| ATR 波动 | `ATR_14 / close < 0.05` | 排除过高波动 |

### Stage 3: LEAPS 精选

| 条件 | 值 | 说明 |
|------|-----|------|
| 到期日 | > 180 天 | 远期期权 |
| Delta | 0.65 - 0.80 | 轻度实值，享受上涨 |
| Theta/价格 | < 0.3% | 时间衰减可控 |
| Bid-Ask Spread | < 5% | 流动性充足 |
| IV Percentile | < 50% | 不买贵 |

## Decision: 项目结构

```
quantResearch/
├── README.md                    # 项目说明
├── CLAUDE.md                    # Agent 指引
├── pyproject.toml               # uv 依赖
├── config.yaml                  # 全局配置
├── .env.example                 # API key 模板
│
├── src/                         # 源码（新增 src 布局）
│   ├── __init__.py
│   ├── config.py                # 配置加载
│   ├── pipeline.py              # 主流程编排
│   │
│   ├── data_sources/            # 数据源
│   │   ├── __init__.py
│   │   ├── theta_data.py        # Theta Data SDK 封装
│   │   └── yfinance_ds.py       # yfinance 封装
│   │
│   ├── screening/               # 筛选引擎
│   │   ├── __init__.py
│   │   ├── options_anomaly.py   # Stage 1: 期权异常检测
│   │   ├── stock_technical.py   # Stage 2: 正股技术面
│   │   └── leaps_selector.py    # Stage 3: LEAPS 精选
│   │
│   ├── models/                  # 数据模型
│   │   ├── __init__.py
│   │   ├── option_contract.py   # 期权合约数据类
│   │   ├── stock_bar.py         # K线数据类
│   │   └── trade_signal.py      # 交易信号数据类
│   │
│   ├── storage/                 # 数据存储
│   │   ├── __init__.py
│   │   ├── parquet_store.py     # Parquet 读写
│   │   └── cache.py             # 缓存管理
│   │
│   └── report/                  # 报告生成
│       ├── __init__.py
│       └── html_generator.py    # HTML 报告
│
├── dashboard/                   # Streamlit 前端
│   ├── app.py                   # 入口
│   ├── pages/
│   │   ├── 01_screener.py       # 筛选器页面
│   │   ├── 02_signals.py        # 信号详情页面
│   │   └── 03_history.py        # 历史回测页面
│   └── components/
│       ├── option_table.py      # 期权链表格
│       ├── iv_skew.py           # IV 歪斜图
│       ├── stock_chart.py       # 股票K线图
│       └── signal_card.py       # 信号卡片
│
├── data/                        # 数据目录
│   ├── raw/                     # 原始下载
│   ├── processed/               # 清洗后
│   └── cache/                   # 临时缓存
│
└── scripts/
    └── daily_scan.py            # 每日盘后扫描 CLI
```

## Decision: 数据库 Schema (DuckDB)

```sql
-- 期权快照表
CREATE TABLE options_snapshot (
    date DATE,
    symbol VARCHAR,
    option_type VARCHAR(1),  -- C or P
    strike DOUBLE,
    expiration DATE,
    bid DOUBLE,
    ask DOUBLE,
    last_price DOUBLE,
    volume BIGINT,
    open_interest BIGINT,
    delta DOUBLE,
    gamma DOUBLE,
    theta DOUBLE,
    vega DOUBLE,
    implied_volatility DOUBLE,
    underlying_price DOUBLE,
    PRIMARY KEY (date, symbol, option_type, strike, expiration)
);

-- 正股 K 线表
CREATE TABLE stock_kline (
    date DATE,
    symbol VARCHAR,
    open DOUBLE,
    high DOUBLE,
    low DOUBLE,
    close DOUBLE,
    volume BIGINT,
    PRIMARY KEY (date, symbol)
);

-- 异常信号表
CREATE TABLE anomaly_signals (
    date DATE,
    symbol VARCHAR,
    option_type VARCHAR(1),
    strike DOUBLE,
    expiration DATE,
    voi_ratio DOUBLE,
    volume_spike DOUBLE,
    premium DOUBLE,
    iv_rank DOUBLE,
    anomaly_score DOUBLE,
    PRIMARY KEY (date, symbol, option_type, strike, expiration)
);

-- 交易建议表
CREATE TABLE trade_recommendations (
    date DATE,
    symbol VARCHAR,
    direction VARCHAR(10),  -- LONG_CALL / LONG_PUT
    strike DOUBLE,
    expiration DATE,
    entry_price DOUBLE,
    delta DOUBLE,
    theta DOUBLE,
    stop_loss DOUBLE,
    target_price DOUBLE,
    confidence_score DOUBLE,
    rationale TEXT,
    PRIMARY KEY (date, symbol, strike, expiration)
);
```

## Consequences

### Positive
- Polars 处理百万级数据速度极快
- Streamlit 最快路径搭建好看前端
- DuckDB 本地查询无网络依赖
- Theta Data Standard $80/月，含 Option Chain Snapshot + Trade Streams

### Negative
- Streamlit 不适合多用户并发（但本项目是单用户本地工具，不是问题）
- Theta Data 需要订阅（已确认用户接受）
- 需要维护本地数据存储（但 Parquet 压缩率极高，1年数据<1GB）

## Related
- ADR-0001: 原技术栈决策（保留 uv + Python 3.11）
