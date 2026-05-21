# ADR-0001: 技术栈选择

## 状态
Accepted — 2025-05-21

## 背景

搭建个人量化研究平台，需要选择：包管理工具、回测引擎、数据存储、指标计算库。

## 决策

### 包管理: `uv`

- **选择**: Astral 的 `uv`
- **替代**: poetry, pip + requirements.txt
- **理由**: 极速解析/安装、兼容 standards (pyproject.toml)、单工具链（不用 pip + venv + pip-tools）

### 回测: 自研轻量引擎 + 外部验证

- **选择**: 初期自研向量化回测 (`backtest/engine.py`)，后期引入 `vectorbt` 做参数扫描
- **替代**: backtrader（功能全但重）、zipline（维护停滞）
- **理由**: 先理解底层逻辑再引入框架；个人项目不需要事件驱动回测的复杂度

### 数据存储: 文件系统 (parquet) + DuckDB（预留）

- **选择**: pandas DataFrame → parquet 文件，缓存用 pickle/json
- **替代**: PostgreSQL/TimescaleDB、ClickHouse
- **理由**: 数据量不大（日 K 级别），文件系统足够；DuckDB 作为后续扩展选项

### 指标计算: `pandas-ta` / 自研

- **选择**: 核心指标自研（MA, RSI, MACD），扩展用 `pandas-ta`
- **替代**: TA-Lib（需编译，安装麻烦）
- **理由**: 自研指标逻辑透明、可调试；pandas-ta 纯 Python，uv 安装无问题

### 数据源优先序

1. Longbridge Skill（现成分析能力）
2. Longbridge CLI（实时数据、持仓）
3. Yahoo Finance（美股历史，免费）
4. FMP（基本面、财报）

## 后果

- **正**: 启动快、依赖少、学习曲线平缓
- **负**: 回测引擎功能有限，复杂策略（多标的、滑点模型）需后续升级
- **风险**: 数据一致性（多源拼接时的时间对齐、复权处理）需手动管理

## 参考

- [qlib](https://github.com/microsoft/qlib) — 微软量化平台，因子/模型/回测完整，但学习成本高，作为参考而非直接依赖
