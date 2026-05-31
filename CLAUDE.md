# Options Anomaly Screener

基于期权异常信号的 LEAPS 交易筛选系统。

## 数据源

| 源 | 用途 | 状态 |
|----|------|------|
| Theta Data | 期权 EOD 快照 + Greeks | 需订阅 (~$25/月) |
| FMP | 股票 K 线 + 新闻 | 需 API Key |

## 目录结构

```
quantResearch/
├── src/                  # 核心源码
│   ├── data_sources/    # 数据源适配器
│   ├── screening/       # 三层筛选引擎
│   ├── models/          # 数据模型
│   └── storage/         # Parquet 存储
├── dashboard/           # Streamlit 可视化
│   └── pages/           # 各功能页面
├── scripts/             # CLI 工具
├── data/                # 数据存储
└── docs/adr/            # 架构决策记录
```

## Agent Skills

### Issue Tracker
Issues tracked on GitHub. See `docs/agents/issue-tracker.md`.

### Triage Labels
Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain Docs
Single-context repo. Domain docs live at `CONTEXT.md` and `docs/adr/`.

## Quick Start

```bash
cd ~/projects/quantResearch
uv sync
cp .env.example .env
# 编辑 .env 填入 API Key
uv run streamlit run dashboard/app.py
```

## Development

- **Package manager**: `uv` (Astral)
- **Python version**: 3.11.9
- **Add dependency**: `uv add <package>`
- **Run script**: `uv run python <script.py>`
- **Lint**: `uv run ruff check src/`
- **Test**: `uv run pytest`

## CI / CD

- 所有变更通过 PR 提交
- CI: ruff + mypy + pytest
- CODEOWNERS: @archer
