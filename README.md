# Quant Research

量化选股 + 长期/波段交易信号研究与回测。

## 数据源

| 源 | 用途 | 状态 |
|----|------|------|
| Longbridge | 实时行情、持仓、港股/A股 | 已配置 |
| Yahoo Finance | 美股历史数据 | 已配置 |
| FMP | 基本面数据、财报 | 已配置 |

## 目录结构

```
quantResearch/
├── data/                # 数据存储
│   ├── raw/            # 原始下载
│   ├── processed/      # 清洗后
│   └── cache/          # API 缓存
├── data_sources/       # 数据源适配器
├── signals/            # 信号生成
│   ├── technical/      # 技术面
│   ├── fundamental/    # 基本面
│   └── macro/          # 宏观（扩展）
├── models/             # 选股模型
├── backtest/           # 回测引擎
├── notebooks/          # 研究笔记本
└── config.yaml         # 全局配置
```

## Quick Start

```bash
cd ~/projects/quantResearch
pip install -r requirements.txt
```
