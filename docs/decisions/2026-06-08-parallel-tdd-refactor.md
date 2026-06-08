# DEC-001: Parallel TDD Refactor of 5 Architecture Candidates

## Status
Accepted

## Context
Signal route (`api/routes/signals.py`) had grown to 200+ lines with domain logic
entangled in HTTP transport. Five structural improvements were identified:

1. Signal route business logic extraction
2. Unified contract code format (Python + TypeScript)
3. SignalClassifier price data injection
4. Frontend API separation (DataSource interface)
5. Config factory pattern (remove `__new__` singleton)

## 第一性原理四问

### 1. 本质是什么？
Route 过厚是症状，根本问题是**领域逻辑与传输层耦合**——同一份排序/分级/tag 逻辑既在 API 层写死，又无法单元测试。重构的本质不是"拆文件"，而是**建立可独立验证的领域层边界**。

### 2. 假设成立吗？
- **假设 A**: route 是唯一调用方 → 成立（当前只有 `/signals` 调用 SignalClassifier）
- **假设 B**: DataSource 双模式（mock/API）在前端需要 → 成立（tracker 页面需要 mock 支撑 CI）
- **假设 C**: 合约代码格式需要双端统一 → 成立（后端生成、前端展示、URL 路由共用）
- **假设 D**: yfinance 可做生产 price source → **不成立**（延迟高、无实时性，已标记 TODO(debt)）

### 3. 更简单的方式？
不提取 SignalBuilder，直接在 route 里写函数 → 测试仍然依赖 FastAPI TestClient，启动慢。
不统一合约代码 → 后端 f-string、前端正则各写一套，维护两份格式约定。
不做 Config 工厂 → 单例在测试间共享状态，并发测试会互相污染。
**结论：每个改动都是删除重复/耦合的最小必要操作。**

### 4. 表面 vs 根因？
- **表面**：route 太厚、代码难测
- **根因**：没有明确的"领域层 vs 传输层"边界，新增信号类型时习惯性往 route 里堆逻辑
- **是否会复发**：会，除非每次新增 route 功能时强制问自己"这属于领域逻辑吗？"

## Decision
采用 3 组 agent 并行 TDD，每组独立 worktree，完成后合并到 main。

| 候选 | 产出文件 | 测试数 |
|------|---------|--------|
| ① 业务逻辑下沉 | `src/screening/signal_builder.py` | 5 |
| ② 合约代码统一 | `src/utils/contract_code.py`, `frontend/lib/contractCode.ts` | 13 |
| ③ Price source 注入 | `src/screening/price_sources.py` | 2 |
| ④ 前端 API 分离 | `frontend/lib/data-source.ts`, `mock-adapter.ts`, `http-adapter.ts` | — |
| ⑤ Config 工厂 | `src/config.py` (`create_config`) | 7 |

## Consequences

### Positive
- Route 从 200+ 行降至 ~125 行，纯编排
- 44 个 Python 测试覆盖新增领域逻辑
- 前端 DataSource 接口支持 mock/API 无缝切换
- Config 实例隔离，测试不再互相污染

### Negative
- `YfinancePriceSource` 是权宜之计，非真实生产方案
- `SignalBuilder` 仍接收 raw dicts（未完全按理想 spec 注入 DataSource seam）——当前 route 数据流已足够薄，进一步注入会过度复杂化 builder
- `contract_code.py` 从 `models/` 移至 `utils/`（ADR-0002 冲突），已修复

## Related
- [[adr-0002-options-anomaly-screener]] — models/ 目录语义定义
- `CLAUDE.md` — 技术债清单（yfinance 替换计划）
