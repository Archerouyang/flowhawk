# Options Anomaly Screener — Domain Context

## 项目定位

个人量化期权异动挖掘与 LEAPS 交易平台。

自下而上三层筛选：
1. **期权异常检测** — 全市场扫描 V/OI 异动、IV 突变、大单信号
2. **正股技术面精筛** — K线形态、均线、成交量 + 新闻情绪分析
3. **LEAPS 精选** — Delta/Theta/IV 优化，输出 1-2 个交易建议

前端覆盖：回测、策略选择、特征挖掘、因子研究、实盘交易、信号捕捉。

非高频。数据粒度以日 K 为主，盘后跑批。

---

## 术语表 (Glossary)

| 术语 | 定义 | 同义词/避免词 |
|------|------|--------------|
| **标的** | 可交易资产（股票、ETF、期权） | — |
| **信号 (Signal)** | 交易建议（买/卖/持） | 用"信号"而非"提示" |
| **特征 (Feature)** | 原始计算值（V/OI、RSI、Delta） | 区分于 signal |
| **筛选器 (Screener)** | 从全市场过滤符合条件的列表 | 用"筛选"而非"扫描" |
| **回测 (Backtest)** | 用历史数据验证策略表现 | — |
| **LEAPS** | 长期期权（到期日 > 180天） | — |
| **因子 (Factor)** | 解释收益来源的维度 | — |
| **V/OI** | Volume / Open Interest 比率 | — |
| **IV Rank** | 当前 IV 在 52 周范围的百分位 | — |
| **DTE** | Days to Expiration | — |

---

## 数据源分工

| 源 | 数据类型 | 频率 | 用途 |
|----|---------|------|------|
| **Theta Data** | 期权 EOD 快照、Greeks、IV | 日终 | 全市场异动扫描 |
| **FMP** | 股票 K 线、新闻 | 日终 | 技术面过滤 + 新闻情绪 |

---

## 策略分类

### 1. 信号捕捉 (Signal Capture)
- V/OI > 3、成交量突增 > 5x、Premium > $100k
- IV Rank < 50%（不买贵）
- Delta 0.50-0.85

### 2. 技术面过滤 (Technical Filter)
- 价格 > 200MA、> 20MA
- 成交量 > 20 日均量 × 1.5
- RSI 30-70、ATR/价格 < 5%
- 新闻情绪加分

### 3. LEAPS 精选 (LEAPS Selection)
- Delta 0.65-0.80
- DTE > 180
- Theta/价格 < 0.3%
- Bid-Ask < 5%

### 4. 回测 (Backtest)
- 历史信号胜率统计
- 盈亏比、夏普比率、最大回撤

### 5. 因子研究 (Factor Research)
- 各信号因子的 IC 分析
- 因子衰减、相关性矩阵

### 6. 实盘交易 (Live Trading)
- 信号执行追踪
- 持仓管理、P&L 监控

---

## 关键约束

- Python 3.11.x 固定版本
- 包管理用 `uv`
- API key 通过 `.env` 加载
- 所有变更通过 PR，CI 通过后方可合并
- 公开 GitHub 仓库
