# Contributing Guide

## Development Workflow

1. **Fork** this repository
2. **Create branch**: `git checkout -b feature/your-feature-name`
3. **Develop**: Follow code style (ruff + mypy)
4. **Test**: `uv run pytest`
5. **Submit PR**: Use PR template, wait for CI pass
6. **Code Review**: At least 1 approval required before merge

## Code Style

- Use `ruff` for lint and format
- Use `mypy` for type checking
- Functions must have type annotations
- Public APIs must have docstrings

## Commit Convention

```
feat: new feature
test: test related
fix: bug fix
docs: documentation update
refactor: code refactoring
perf: performance optimization
```

## Branch Strategy

See [Branch Strategy](../docs/BRANCH_STRATEGY.md) for details.

Quick reference:
- `main` — production, protected
- `develop` — integration branch
- `feature/*` — new features
- `hotfix/*` — urgent fixes
