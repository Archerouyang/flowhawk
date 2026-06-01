# FlowHawk Testing Strategy

## Test Pyramid

```
       /\
      /  \  E2E (frontend + backend)
     /----\
    /      \  Integration (API routes)
   /--------\
  /          \  Unit (modules)
 /------------\
```

## Unit Tests

| Module | Test File | Coverage Target |
|--------|-----------|-----------------|
| `src/factors/` | `tests/unit/test_factors.py` | 90% |
| `src/scoring/` | `tests/unit/test_scoring.py` | 90% |
| `src/ranking/` | `tests/unit/test_ranking.py` | 90% |
| `src/data_sources/mock.py` | `tests/unit/test_mock.py` | 80% |

## Integration Tests

| Endpoint | Test File | Scenario |
|----------|-----------|----------|
| `POST /ranking` | `tests/integration/test_ranking_api.py` | Returns 3 categories × top 30 |
| `POST /dashboard` | `tests/integration/test_dashboard_api.py` | Returns aggregate stats |
| `GET /health` | `tests/integration/test_health.py` | Returns ok |

## Fixtures

```python
# conftest.py
@pytest.fixture
def mock_snapshot() -> pl.DataFrame:
    """Reproducible mock options snapshot."""
    return generate_options_snapshot(
        symbols=["AAPL", "TSLA", "NVDA", "SPCE", "SMH"],
        snapshot_date=date(2026, 6, 1),
    )

@pytest.fixture
def mock_client() -> TestClient:
    """FastAPI test client."""
    from api.main import app
    return TestClient(app)
```

## Running Tests

```bash
# All tests
uv run pytest tests/ -v

# Unit only
uv run pytest tests/unit/ -v

# Integration only
uv run pytest tests/integration/ -v

# With coverage
uv run pytest tests/ --cov=src --cov-report=html
```
