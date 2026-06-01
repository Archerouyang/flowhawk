# FlowHawk Phase 2 — macOS Menu Bar + Broker Integration Plan

> Date: 2026-06-01 | Status: Planning

---

## 1. macOS Menu Bar App（`FlowHawk Tray`）

### 技术选型：Tauri（确认）

| 方案 | 包大小 | 启动速度 | 原生感 | React 复用 | 移动端 | 维护 |
|------|--------|----------|--------|------------|--------|------|
| **Tauri v2** ⭐ | **2-10MB** | 快 | 好 | ✅ 完全复用 | ✅ 支持 | Rust 学习曲线 |
| Electron | 80-200MB | 慢 | 一般 | ✅ 完全复用 | ❌ | 简单 |
| SwiftUI | 2MB | 最快 | 最好 | ❌ 重写 | ✅ | 需学 Swift |
| Python rumps | 50MB | 快 | 差 | ❌ 不适用 | ❌ | 功能有限 |

**调研数据（2026）：**
- Tauri GitHub 仓库增长 **55% YoY**，Electron 增长放缓
- Stack Overflow 2025 调查：72% 桌面应用开发者考虑切换框架，包体积是首要原因
- Tauri v2 支持 **iOS/Android**，未来可扩展移动端

**选 Tauri v2 的理由：**
1. 完全复用现有 React 前端（Dashboard、Signal 卡片、图表）
2. 包体积 **2-10MB** vs Electron **150MB**（用户不会安装一个 150MB 的菜单栏工具）
3. Rust 后端处理：本地通知、自动启动、**macOS Keychain** 密钥存储
4. 打包为 `.app` + `.dmg`，支持自动更新
5. v2 支持移动端，未来可扩展 iOS 版本

**Rust 学习成本？**
- Tauri 的 Rust 代码量很少（主要做系统桥接）
- 核心业务逻辑仍在 Python（FastAPI）和 React（前端）
- 参考 QuantDinger 也是 Tauri + Python 架构

### 功能设计

```
┌─────────────────────────────┐
│ 🦅 FlowHawk    今日: 3 🔴 2 🟠 │  ← 菜单栏图标 + badge
└─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 今日信号                    [打开 Dashboard] │
│ ┌────────────────────────────────────────┐   │
│ │ 🔴 BSX  smart_money     score=87       │   │
│ │ 🟠 SPCE first_timer     score=73       │   │
│ │ 🟡 AAPL volume_spike    score=55       │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ Seeking Alpha Alpha Picks      [查看更多]    │
│ ┌────────────────────────────────────────┐   │
│ │ 📌 PLTR  新买入信号  $28.50 → $35      │   │
│ │ 📌 SOFI  加仓信号    $12.80 → $18      │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ 持仓总览                        [刷新]       │
│ ┌────────────────────────────────────────┐   │
│ │ IBKR   $124,500   +$3,200 (+2.6%)     │   │
│ │ 长桥    $45,800    -$890  (-1.9%)      │   │
│ │ 富途    $12,300    +$450  (+3.8%)      │   │
│ │ ─────────────────────────────────────  │   │
│ │ 合计   $182,600   +$2,760 (+1.5%)      │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ [⚙️ 设置]  [📊 打开 Dashboard]  [退出]      │
└──────────────────────────────────────────────┘
```

### 通知策略

| 场景 | 通知内容 | 频率控制 |
|------|----------|----------|
| 新 🔴 conviction signal | "BSX: 聪明钱建仓 12月67.5call" | 每小时最多1次 |
| Alpha Picks 新买入 | "Alpha Picks: PLTR 新买入信号" | 实时 |
| 持仓大幅波动 | "AAPL 持仓 -5%" | 每15分钟最多1次 |
| 系统错误 | "长桥 API 连接失败" | 每小时最多1次 |

---

## 2. 券商 API 对接

### 2.1 Interactive Brokers (IBKR)

**API：Client Portal API v1.0**
- 文档：https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi-v1
- 比 TWS API 简单，不需要跑 TWS 软件
- 需要启动 **Client Portal Gateway**（本地代理，监听 localhost:5000）

**关键端点：**
```
GET /iserver/account/summary         # 账户汇总（快速）
GET /portfolio/accounts              # 账户列表
GET /portfolio/{accountId}/positions # 持仓明细
POST /iserver/marketdata/snapshot    # 实时行情快照
```

**认证（两阶段）：**
1. 用户访问 `https://localhost:5000` → 登录 IB 账户
2. Gateway 建立 session，返回 authenticated session
3. 后续 API 请求带 session cookie
4. Session 过期后需重新登录（通常 24h）

**Python SDK：**
- `interactive-broker-python-web-api`（PyPI，非官方）
- `ibind`（REST + WebSocket，推荐）
- 或直接 `requests` 调用本地 Gateway

### 2.2 长桥 (Longbridge)

**OpenAPI v2**
- 文档：https://open.longbridge.com/docs
- GitHub：https://github.com/longbridge/openapi
- **MCP 支持**：`https://openapi.longbridge.com/mcp`
- 认证：App Key + App Secret + Access Token

**Python SDK：** `pip install longbridge`
```python
from longport import TradeContext, Config

config = Config.from_env()
trade_ctx = TradeContext(config)

# 持仓
resp = trade_ctx.stock_positions()

# 账户资产
balance = trade_ctx.account_balance()
```

**特性：**
- WebSocket 实时推送（行情、订单状态）
- 支持美股、港股、A 股
- 有官方 MCP Server（可直接接入 Claude）

### 2.3 富途 (Futu)

**OpenAPI v10.6**
- 文档：https://openapi.futunn.com/futu-api-doc/en
- GitHub：https://github.com/FutunnOpen/py-futu-api
- 认证：Futu ID + RSA 私钥签名
- Python SDK：`pip install futu-api`

**关键端点：**
```python
from futu import *

trd_ctx = OpenSecTradeContext(filter_trdmarket=TrdMarket.US)
ret, data = trd_ctx.position_list_query()
```

**注意：**
- 非香港用户可能受限（需确认 Futu HK 账户权限）
- 提供 MCP Server（2025 年新增）
- 支持 Python, Java, C#, C++, JavaScript

### 2.4 多券商聚合层

```python
# src/brokers/aggregator.py
class PortfolioAggregator:
    """Aggregate positions across multiple brokers."""

    def __init__(self):
        self.brokers: dict[str, BrokerClient] = {
            "ibkr": IBKRClient(),
            "longbridge": LongbridgeClient(),
            "futu": FutuClient(),
        }

    async def get_all_positions(self) -> list[Position]:
        """Fetch positions from all connected brokers."""
        results = await asyncio.gather(
            *[b.get_positions() for b in self.brokers.values()],
            return_exceptions=True
        )
        # Flatten and deduplicate by symbol
        ...

    def get_total_pnl(self) -> dict:
        """Aggregated P&L across all brokers."""
        ...
```

---

## 3. Seeking Alpha Alpha Picks 集成

### 数据获取策略

Alpha Picks 是付费订阅，**无公开 API**。可选方案：

| 方案 | 可行性 | 稳定性 | 合法性 |
|------|--------|--------|--------|
| **邮件解析** ⭐ | 高 | 中 | 合法（自己的订阅） |
| 网页抓取 | 中 | 低 | 灰色 |
| RSS Feed | 低 | 低 | 灰色 |
| 反向工程 App API | 低 | 极低 | 违规 |

**推荐：邮件解析**

```
Alpha Picks 邮件格式:
Subject: "Alpha Picks: New Buy - PLTR"
Body:
  - Ticker: PLTR
  - Action: BUY
  - Price: $28.50
  - Target: $35.00
  - Date: 2026-05-29
```

**实现：**
- 配置 IMAP/Gmail API 读取邮件
- 正则解析邮件主题和正文
- 存储到 SQLite `alpha_picks` 表
- 与 FlowHawk 信号合并展示

```sql
CREATE TABLE alpha_picks (
    id INTEGER PRIMARY KEY,
    ticker TEXT NOT NULL,
    action TEXT NOT NULL,      -- 'BUY', 'SELL', 'HOLD'
    entry_price REAL,
    target_price REAL,
    published_at TIMESTAMP,
    source TEXT DEFAULT 'seeking_alpha',
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Gateway（中转站）

### 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      FlowHawk API Gateway                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Router     │  │   Cache     │  │  Circuit Breaker    │  │
│  │  (FastAPI)  │  │  (Redis)    │  │  (per service)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────────▼──────────┐  │
│  │  Rate       │  │  Key        │  │  Request            │  │
│  │  Limiter    │  │  Manager    │  │  Deduplicator       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │
    ┌────┴────┬────────┬────────┬────────┐
    ▼         ▼        ▼        ▼        ▼
 Theta    FMP     IBKR   长桥    富途
 Data
```

### 核心功能

#### 4.1 多 Key 管理

```yaml
# config/gateway.yaml
keys:
  theta_data:
    - key: "td_key_1"
      quota: 1000/hour
      used: 0
      reset_at: "2026-06-01T00:00:00Z"
    - key: "td_key_2"
      quota: 1000/hour
      used: 0
      reset_at: "2026-06-01T00:00:00Z"

  fmp:
    - key: "fmp_key_1"
      quota: 250/day
      used: 0
```

#### 4.2 负载均衡（Round Robin + 健康检查）

```python
class KeyPool:
    def __init__(self, keys: list[APIKey]):
        self.keys = keys
        self.index = 0

    def next(self) -> APIKey:
        """Return next available key with quota remaining."""
        for _ in range(len(self.keys)):
            key = self.keys[self.index]
            self.index = (self.index + 1) % len(self.keys)
            if key.has_quota():
                return key
        raise QuotaExceeded("All keys exhausted")
```

#### 4.3 缓存策略

| 数据类型 | TTL | 示例 |
|----------|-----|------|
| 实时价格 | 1 min | AAPL last price |
| 期权链 | 5 min | AAPL options snapshot |
| 基本面 | 1 hour | Market cap, sector |
| 历史 K 线 | 24 hour | Daily OHLCV |
| 静态数据 | 7 days | Symbol list, holidays |

#### 4.4 请求去重

```python
# 同一秒内相同请求合并
@lru_cache(maxsize=128)
def get_options_chain(symbol: str, date: date) -> DataFrame:
    ...
```

#### 4.5 实现：FastAPI Middleware

```python
# api/middleware/gateway.py
class GatewayMiddleware:
    def __init__(self, app):
        self.app = app
        self.cache = RedisCache()  # or SQLite fallback
        self.circuits = CircuitBreakerManager()

    async def __call__(self, scope, receive, send):
        request = Request(scope, receive)

        # 1. Check cache
        cached = await self.cache.get(request.url.path)
        if cached:
            return cached

        # 2. Check circuit breaker
        if self.circuits.is_open(request.url.path):
            return FallbackResponse()

        # 3. Route to backend
        response = await self.app(scope, receive, send)

        # 4. Cache successful response
        if response.status_code == 200:
            ttl = self.get_ttl(request.url.path)
            await self.cache.set(request.url.path, response, ttl)

        return response
```

---

## 5. 实施路线图

### Phase 1：API Gateway（1-2 周）

**Week 1**
- [ ] 设计 Gateway 中间件接口
- [ ] 实现多 Key 管理 + 轮询负载均衡
- [ ] 实现 Redis 缓存层（本地开发用 SQLite fallback）
- [ ] 接入 Theta Data 和 FMP

**Week 2**
- [ ] 实现熔断器 + 降级策略
- [ ] 请求去重（并发相同请求合并）
- [ ] 用量监控 Dashboard（各 key 的剩余额度）
- [ ] 性能测试（缓存命中率 > 80%）

### Phase 2：券商对接（2-3 周）

**Week 3**
- [ ] IBKR Client Portal API 对接
- [ ] 持仓数据模型 + 聚合层
- [ ] 长桥 OpenAPI 对接
- [ ] 多券商持仓合并展示

**Week 4**
- [ ] 富途 OpenAPI 对接（确认权限）
- [ ] 实时 P&L 计算
- [ ] 持仓变动通知
- [ ] 券商连接状态监控

**Week 5**
- [ ] 券商数据缓存（减少 API 调用）
- [ ] 错误处理 + 重连逻辑
- [ ] 安全：API key 加密存储（macOS Keychain）

### Phase 3：Seeking Alpha 集成（1 周）

**Week 6**
- [ ] Gmail API / IMAP 邮件读取
- [ ] Alpha Picks 邮件解析器
- [ ] SQLite 存储 + 与 FlowHawk 信号合并
- [ ] 前端 Alpha Picks 展示面板

### Phase 4：macOS Menu Bar（2-3 周）

**Week 7-8**
- [ ] Tauri 项目初始化
- [ ] 复用 React 组件（Dashboard 卡片、Signal 列表）
- [ ] 菜单栏图标 + Badge 计数
- [ ] 下拉面板 UI

**Week 9**
- [ ] 本地通知（macOS Notification Center）
- [ ] 自动启动设置
- [ ] 设置面板（API key 配置、通知偏好）
- [ ] 打包 `.app`

### Phase 5：整合与分发（1 周）

**Week 10**
- [ ] Gateway + Menu Bar 联调
- [ ] 端到端测试
- [ ] 签名 + Notarization（macOS）
- [ ] 内测分发

**总计：约 10 周**

---

## 6. 新增目录结构

```
flowhawk/
├── ...existing...
├── gateway/                    # NEW: API Gateway
│   ├── __init__.py
│   ├── middleware.py           # 缓存、熔断、限流
│   ├── key_manager.py          # 多 Key 管理
│   ├── cache.py                # Redis/SQLite 缓存
│   ├── circuit_breaker.py      # 熔断器
│   └── monitors/
│       └── usage_dashboard.py  # 用量监控
│
├── brokers/                    # NEW: 券商对接
│   ├── __init__.py
│   ├── base.py                 # BrokerClient 抽象基类
│   ├── ibkr.py                 # IBKR Client Portal
│   ├── longbridge.py           # 长桥 OpenAPI
│   ├── futu.py                 # 富途 OpenAPI
│   └── aggregator.py           # 多券商聚合
│
├── alpha_picks/                # NEW: Seeking Alpha
│   ├── __init__.py
│   ├── mail_parser.py          # 邮件解析
│   ├── models.py               # AlphaPick dataclass
│   └── sync.py                 # 定期同步
│
├── tray/                       # NEW: macOS Menu Bar (Tauri)
│   ├── src-tauri/              # Rust backend
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── menu.rs         # 菜单栏逻辑
│   │   │   └── notify.rs       # 本地通知
│   │   └── Cargo.toml
│   ├── src/                    # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SignalBadge.tsx
│   │   │   ├── PortfolioSummary.tsx
│   │   │   └── AlphaPicksList.tsx
│   │   └── api.ts              # 调用本地 Gateway
│   └── package.json
│
└── docs/
    ├── PHASE2_PLAN.md          # 本文档
    └── BROKER_API.md           # 各券商 API 详细文档
```

---

## 7. 待确认事项

1. **券商权限确认**
   - [ ] IBKR：是否有 Client Portal 权限？
   - [ ] 长桥：OpenAPI 已申请？
   - [ ] 富途：OpenAPI 权限（非香港用户可能受限）

2. **Seeking Alpha**
   - [ ] Alpha Picks 订阅确认
   - [ ] 邮件示例（发我一封邮件内容，我帮你写解析器）

3. **优先级**
   - [ ] Gateway 先做？还是券商先做？
   - [ ] macOS Tray 可以等前端稳定后再做？

4. **QuantDinger**
   - [x] 已调研 — 见下方第 8 节

---

## 8. QuantDinger 参考

**官网：** https://www.quantdinger.com
**GitHub：** https://github.com/quantdinger/quantdinger (6.9k ⭐)
**定位：** 本地优先（local-first）AI 量化交易平台

### 核心特性

| 特性 | QuantDinger | FlowHawk 对比 |
|------|-------------|---------------|
| **架构** | Tauri + Python | Next.js + FastAPI + Python |
| **AI Agent** | 内置多 agent 研究 | 远期规划（信号分析 agent） |
| **回测** | 内置 | ✅ 已有 Backtest 页面 |
| **实盘** | 内置 | 远期（Live Trading 页面） |
| **数据源** | 集成多源 | Theta Data + FMP |
| **MCP** | ✅ 支持 | 长桥/富途 MCP 可用 |
| **自托管** | ✅ | ✅ FastAPI 后端 |
| **移动** | 计划中 | 远期（Tauri v2 支持） |

### 可借鉴的设计

1. **Tauri + Python 架构** — QuantDinger 用 Tauri 做前端 + Rust 系统层，Python 做核心业务。FlowHawk 可用同样模式：Tauri（菜单栏）+ FastAPI（后端）+ React（Web Dashboard）。

2. **MCP 集成** — QuantDinger 支持 MCP Server，Claude/Cursor 可直接调用。FlowHawk 的长桥 MCP + 富途 MCP 已配置，可直接复用。

3. **AI Agent 研究流** — QuantDinger 的多 agent 协作（研究 → 策略 → 回测 → 执行）。FlowHawk 可借鉴：信号检测 → 新闻验证 → 评分 → 推荐。

4. **本地优先** — 数据存本地，API 仅用于获取。FlowHawk 的 SQLite + Parquet 架构一致。

### 差异定位

| | QuantDinger | FlowHawk |
|---|-------------|----------|
| **目标用户** | 量化开发者 | 期权交易者 |
| **核心能力** | 策略开发 + AI 生成代码 | 信号发现 + 新闻验证 |
| **数据重点** | 价格数据 + 技术指标 | 期权 Greeks + 异常检测 |
| **交互方式** | IDE + 代码 | Dashboard + 菜单栏 |

**结论：** 不是竞品，是互补。QuantDinger 擅长策略开发和回测，FlowHawk 擅长信号发现和持仓监控。可借鉴其 Tauri 架构和 MCP 集成模式。
