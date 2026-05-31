# Branch Strategy

We follow **GitHub Flow with a develop branch** (a lightweight variant of Git Flow).

```
main ──────────────────────────────────────────────▶
  ▲                                                    │
  │    merge via PR (CI pass + review required)       │
  │                                                    │
  └── develop ───────────────────────────────────────▶
         ▲  ▲  ▲                                         │
         │  │  │                                         │
    feature/A  feature/B  hotfix/X                      │
```

## Branch Types

| Branch | Purpose | Created From | Merges Into | Protection |
|--------|---------|--------------|-------------|------------|
| `main` | Production-ready code | — | — | ☑️ Required PR, ☑️ CI pass, ☑️ Code owner review |
| `develop` | Integration branch for features | `main` | `main` | ☑️ Required PR, ☑️ CI pass |
| `feature/*` | New features or refactors | `develop` | `develop` | — |
| `hotfix/*` | Urgent production fixes | `main` | `main` + `develop` | — |

## Workflow

### 1. Start a Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/options-screener-page
```

### 2. Develop & Commit

```bash
git add .
git commit -m "feat: add options screener page with V/OI heatmap"
```

Commit convention: `type: description`

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `chore` | Build process or auxiliary tool changes |

### 3. Push & Create PR

```bash
git push -u origin feature/options-screener-page
# Open PR on GitHub, targeting `develop`
```

PR requirements:
- Fill the PR template
- CI checks must pass
- At least 1 code owner approval

### 4. Merge

Use **Squash and merge** for clean history:

```bash
# GitHub UI: Squash and merge
# Result: single commit on develop with PR title
```

### 5. Release to Production

When `develop` is stable, create a PR to `main`:

```bash
# On GitHub: PR from develop → main
# Use Merge commit (not squash) to preserve feature history
```

## Hotfix Process

For urgent production fixes:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-iv-calculation
git add .
git commit -m "fix: correct IV percentile calculation"
git push -u origin hotfix/fix-iv-calculation
# Open PR targeting main AND another PR targeting develop
```

## Rules

1. **Never push directly to `main` or `develop`** — always via PR
2. **Delete feature branches after merge**
3. **Keep PRs small and focused** — one feature per PR
4. **Rebase feature branches on develop** before merging if there are conflicts
