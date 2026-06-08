# FlowHawk

Options anomaly signal screener with LEAPS selector. Python backend + React/Next.js frontend.

## Architecture

- `src/` — Python core (data sources, screening pipeline, models, storage)
- `api/` — FastAPI REST layer (`/screen`, `/signals`, `/backtest`, `/health`)
- `frontend/` — Next.js App Router dashboard
- `dashboard/` — Legacy Streamlit (reference only)

See `README.md` for full architecture and `QUICKSTART.md` for setup.

## Key Constraints

- Python 3.11.x, package manager `uv`
- API keys via `.env`
- All changes via PR, CI pass required before merge
- Public GitHub repository

## Context Budget

- 对话 >15 轮 → 主动建议 `/compact`
- 单次读取代码 >500 行后 → 建议 `/compact`
- 跨 >5 个文件分析后 → 建议 `/compact`

## 第一性原理驱动开发

所有涉及 **≥3 个文件修改**、**新建模块**、或**架构决策**的任务，编码前必须先回答四问并记录：

| # | 问题 | 目的 |
|---|------|------|
| 1 | **本质是什么？** 这个功能/改动的根本目的？ | 防止把手段当目的 |
| 2 | **假设成立吗？** 当前方案基于什么假设？还成立吗？ | 防止在过时假设上堆代码 |
| 3 | **更简单的方式？** 删除什么会坏掉？最小改动是什么？ | 防止过度设计 |
| 4 | **表面 vs 根因？** 这是症状还是病因？修表面会复发吗？ | 防止反复修同一个坑 |

**输出要求：** 方案中必须包含对四问的回答，作为代码审查的必检项。记录到 `docs/decisions/` 或本项目 memory。

---

## 技术债管理

### 识别（提交前自查）

引入临时方案/变通时，回答：
- 这是权宜之计还是正确方案？
- 清偿代价是什么？
- 6 个月后会后悔吗？

### 记录（强制）

所有技术债必须在代码中标记：
```python
# TODO(debt): <问题描述> — 清偿条件:<什么条件下可以还> — <YYYY-MM-DD>
```

### 清偿规则

- 不允许"永久 debt"——超过 30 天无清偿计划的 debt，必须重新评估原方案
- 阻塞新功能的 debt 优先清偿
- 每两周运行一次审查：`grep -r "TODO(debt)" src/ api/ frontend/`

### 当前债务清单

| 文件 | 问题 | 清偿条件 | 日期 |
|------|------|----------|------|
| `api/routes/tracker.py` | OI/Greeks 为 None（yfinance 不提供）| 接入 Theta Data/Polygon/长桥 quote 权限 | 2026-06-04 |
| `src/data_sources/yfinance_ds.py` | OI 始终为 0，bid/ask 为 0 | 接入更可靠的期权数据源 | 2026-06-04 |
| `src/data_sources/longbridge_ds.py` | 账户无 option quote 权限；LEAPS 合约 chain 返回空 symbol | 升级账户权限或换数据源 | 2026-06-04 |
| `api/routes/signals.py` | Longbridge CLI 串行调用，每次 4s+ | 换 REST API 或批量接口 | 2026-06-04 |
| `frontend/lib/api.ts` | 前端 API 缓存 TTL 5min，无后台刷新 | 接入 SWR/React Query | 2026-06-04 |

---

## 活跃 Spec（Spec-Driven Development）

当前正在执行的 spec。任何涉及相关模块的开发必须先读对应 spec，开发完成后更新验收状态。

| Spec | 状态 | 路径 |
|------|------|------|
| Tracker MVP | 开发中 | `docs/specs/tracker-mvp.md` |

**Spec 变更流程：**
1. 开发前通读对应 spec
2. 如需调整范围，先更新 spec 再改代码
3. 验收项完成后在 spec 中打勾
4. 所有 spec 完成后归档到 `docs/specs/archive/`

---

## Domain Context

See `docs/CONTEXT.md` for glossary, data sources, strategy classification, and key constraints.

---

## Agent skills

### Issue tracker

GitHub Issues. Use `gh` CLI for all operations. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. Read `docs/CONTEXT.md` for domain glossary and `docs/adr/` for architectural decisions. See `docs/agents/domain.md`.
