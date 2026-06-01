# FlowHawk Development Guide

> Coding standards, testing requirements, and development workflow.

---

## Code Style

- **Python**: PEP 8, type hints (`list[str]`), Google-style docstrings
- **TypeScript**: Explicit return types on public APIs, avoid `any`
- **Imports**: stdlib → third-party → local (absolute preferred)

## Toolchain

```bash
# Format
uv run ruff format src/ api/ tests/

# Lint
uv run ruff check src/ api/ tests/

# Type check
uv run mypy src/ api/ --ignore-missing-imports

# Test
uv run pytest tests/ -v --cov=src --cov-report=term-missing
```

## Testing Strategy

### Unit Tests (`tests/unit/`)
- One test file per module
- Mock external dependencies (API calls, DB)
- Target: 80%+ coverage

### Integration Tests (`tests/integration/`)
- Test API routes end-to-end
- Use `TestClient` from FastAPI
- Mock data sources only (not the pipeline logic)

### Test Naming
```python
def test_{module}_{scenario}_{expected}:
    ...

def test_screener_high_voi_returns_anomaly():
    ...
```

## PR Workflow

1. Branch from `develop`: `git checkout -b feature/xxx`
2. Run full test suite locally
3. Push + create PR to `develop`
4. CI must pass (ruff + mypy + pytest + frontend build)
5. Self-review before requesting review

## Mock Data Rules

- Mock must be **reproducible** (fixed random seeds)
- Mock must cover **all categories** (big_cap / small_cap / etf)
- Mock metadata must be **realistic** (known symbols get fixed assignments)
