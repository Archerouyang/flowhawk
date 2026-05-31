# 贡献指南

## 开发流程

1. **Fork** 本仓库
2. **创建分支**: `git checkout -b feature/your-feature-name`
3. **开发**: 遵循代码风格（ruff + mypy）
4. **测试**: `uv run pytest`
5. **提交 PR**: 使用 PR 模板，等待 CI 通过
6. **代码审查**: 至少 1 个 approve 后才能合并

## 代码风格

- 使用 `ruff` 进行 lint 和 format
- 使用 `mypy` 进行类型检查
- 函数必须添加类型注解
- 公共 API 必须添加 docstring

## 提交规范

```
feat: 新功能
test: 测试相关
fix: bug 修复
docs: 文档更新
refactor: 代码重构
perf: 性能优化
```
