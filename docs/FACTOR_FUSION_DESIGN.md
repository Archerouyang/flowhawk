# FlowHawk 因子融合与自定义信号挖掘设计方案

## 一、产品定位

**核心目标**：让普通投资者也能像专业期权交易员一样，通过多因子组合发现高胜率交易机会。

**差异化**：
- Unusual Whales = 数据展示（你看懂算你赢）
- FlowHawk = 信号挖掘（我帮你筛出来，告诉你为什么）

---

## 二、因子体系（4 大类 × N 小类）

### 2.1 期权因子（Option Greeks & Flow）

| 因子名 | 类型 | 说明 | 常用阈值 |
|--------|------|------|----------|
| Delta | Greeks | 方向敏感度 | >0.6 或 <-0.6 |
| Gamma | Greeks | 凸性/加速度 | >0.01 |
| Theta | Greeks | 时间损耗 | <-0.03 |
| Vega | Greeks | 波动率敏感度 | >0.2 |
| IV | 波动率 | 隐含波动率 | >30% |
| IV Percentile | 波动率 | IV 历史百分位 | >80% 为高 |
| IV Skew | 波动率 | Put/Call IV 差 | >5% |
| Volume/OI | 流量 | 成交量/持仓量比 | >3x |
| Premium | 流量 | 成交额 | >$100K |
| Sweep Count | 流量 | 扫单次数 | >3 |
| Block Size | 流量 | 大宗交易额 | >$500K |
| Dark Pool % | 流量 | 暗池占比 | >30% |

### 2.2 量价因子（Price & Volume）

| 因子名 | 类型 | 说明 | 常用阈值 |
|--------|------|------|----------|
| RSI | 动量 | 相对强弱 | >70 超买 / <30 超卖 |
| MACD | 动量 | 均线差离 | 金叉/死叉 |
| Price Change | 动量 | 日内涨跌幅 | >±3% |
| Volume Spike | 量能 | 成交量 vs 20日均 | >2x |
| ATR | 波动 | 真实波动幅度 | >5% |
| Support/Resistance | 技术 | 支撑阻力位 | 价格接近关键位 |
| Bollinger Band | 技术 | 布林带位置 | 触及上轨/下轨 |

### 2.3 基本面因子（Fundamental）

| 因子名 | 类型 | 说明 | 常用阈值 |
|--------|------|------|----------|
| PE Ratio | 估值 | 市盈率 | <15 低估 / >30 高估 |
| EPS Growth | 盈利 | 季度 EPS 增长 | >15% |
| Revenue Growth | 盈利 | 季度营收增长 | >10% |
| Earnings Date | 事件 | 财报日期 | <7天 |
| Insider Buying | 事件 | 内部人买入 | 最近30天有买入 |
| Short Float | 情绪 | 空头占比 | >20% |

### 2.4 新闻/情绪因子（Sentiment）

| 因子名 | 类型 | 说明 | 常用阈值 |
|--------|------|------|----------|
| News Sentiment | 情绪 | 新闻情绪得分 | >0.6 积极 |
| Social Volume | 情绪 | 社交媒体提及量 | >2x 均值 |
| Analyst Rating | 情绪 | 分析师评级变化 | 上调 |
| Options Sentiment | 情绪 | 期权情绪（Put/Call）| <0.7 看多 |

---

## 三、自定义因子组合设计

### 3.1 前端交互

```
┌─────────────────────────────────────────────────────────┐
│  Signal Builder（信号构建器）                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Factor Pool ─┐    ┌─ Selected Factors ─────────┐   │
│  │ 🔍 Search...   │    │                              │   │
│  │                │    │  1. IV Percentile > 80%    │   │
│  │ 📊 Price/Vol   │    │     [====●====] Weight 30% │   │
│  │   ├ RSI        │    │                              │   │
│  │   ├ MACD       │    │  2. V/OI > 3x              │   │
│  │   ├ Volume     │    │     [==●======] Weight 25% │   │
│  │   └ ...        │    │                              │   │
│  │                │    │  3. Price Change > 3%      │   │
│  │ 📈 Options     │    │     [●========] Weight 15% │   │
│  │   ├ IV         │    │                              │   │
│  │   ├ Greeks     │    │  4. News Sentiment > 0.6   │   │
│  │   ├ Flow       │    │     [====●====] Weight 30% │   │
│  │   └ ...        │    │                              │   │
│  │                │    │  ─────────────────────────   │   │
│  │ 📰 News        │    │  Total Weight: 100% ✓       │   │
│  │   ├ Sentiment  │    │                              │   │
│  │   └ ...        │    │  [💾 Save Strategy]         │   │
│  │                │    │  [▶ Run Backtest]           │   │
│  │ 🏢 Fundamental │    └──────────────────────────────┘   │
│  │   └ ...        │                                       │
│  └────────────────┘                                       │
│                                                           │
│  [Logic: ALL must match]  [Logic: ANY can match]          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 因子条件编辑器

每个因子可设置：
- **Operator**：>、<、=、between、in range
- **Value**：数值/百分比
- **Weight**：0-100%，影响综合评分
- **Required**：是否必须满足（硬条件 vs 软条件）

### 3.3 策略保存与加载

```typescript
interface Strategy {
  id: string;
  name: string;
  description: string;
  factors: {
    factorId: string;
    operator: ">" | "<" | "=" | "between";
    value: number | [number, number];
    weight: number;
    required: boolean;
  }[];
  logic: "all" | "any"; // 全部满足 / 任一满足
  minScore: number; // 最低综合分
  createdAt: string;
}
```

---

## 四、信号评分算法

### 4.1 单因子评分

```
factor_score = min(100, (actual_value / threshold) * 100)
// 如果 operator 是 "<"，则反向计算
```

### 4.2 综合评分

```
composite_score = Σ(factor_score * weight) / Σ(weight) * logic_bonus

其中 logic_bonus:
- ALL 全部满足: +10%
- ANY 任一满足: +0%
```

### 4.3 信号分类

根据综合分和满足条件自动分类：
- **🔴 Conviction**: Score ≥ 85, 且所有 required 因子满足
- **🟠 Strong**: Score ≥ 70, 且 ≥80% required 因子满足
- **🟡 Monitor**: Score ≥ 55, 部分因子满足
- **⚪ Noise**: Score < 55

---

## 五、前端页面规划

### 5.1 新增页面

| 页面 | 路由 | 功能 |
|------|------|------|
| Signal Builder | `/dashboard/builder` | 自定义因子组合 |
| Strategy Library | `/dashboard/strategies` | 保存/加载策略 |
| Backtest | `/dashboard/backtest` | 策略回测 |
| Factor Explorer | `/dashboard/factors` | 单因子分析 |

### 5.2 现有页面增强

| 页面 | 增强 |
|------|------|
| Signals | 显示每个信号满足哪些因子条件 |
| Symbol Detail | 显示该标的所有因子实时值 |
| Dashboard | 新增 "My Strategies" 卡片 |

---

## 六、数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Raw Data   │────▶│  Factor     │────▶│  Signal     │
│  (Options,  │     │  Engine     │     │  Engine     │
│   Price,    │     │  (计算各    │     │  (匹配策略  │
│   News)     │     │  因子值)    │     │  条件)      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  Scored     │
                                         │  Signals    │
                                         └─────────────┘
```

---

## 七、实现优先级

| 优先级 | 任务 | 预计工作量 |
|--------|------|-----------|
| P0 | 因子数据层（定义 + 计算） | 2d |
| P0 | Signal Builder UI | 3d |
| P1 | 策略保存/加载 | 1d |
| P1 | 信号评分算法 | 1d |
| P2 | 回测引擎 | 3d |
| P2 | Factor Explorer | 2d |
| P3 | 新闻因子接入 | 2d |
| P3 | 基本面因子接入 | 2d |

---

## 八、参考设计

### Unusual Whales 借鉴点：
- **Flow Feed**: 实时流式展示（已实现）
- **Filter Pills**: 快速筛选（已实现）
- **Dark Pool**: 暗池数据（已加入信号类型）

### FlowHawk 差异化：
- **信号解释**: 每信号配 narrative + 因子拆解
- **策略构建**: 用户可自定义因子组合
- **低门槛**: 颜色 + 图标 + 评分降低理解成本
- **Research**: 一键深入标的分析（已实现）
