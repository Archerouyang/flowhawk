"""SQLite database initialization and connection management."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "flowhawk.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

INIT_SQL = """
-- Pipeline execution tracking
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stage       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'running',
    records_in  INTEGER,
    records_out INTEGER,
    error_msg   TEXT
);

-- Stage 1: Raw anomalies detected by options scanner
CREATE TABLE IF NOT EXISTS anomalies (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id            INTEGER NOT NULL,
    symbol            TEXT NOT NULL,
    option_type       TEXT NOT NULL,
    strike            REAL NOT NULL,
    expiration        TEXT NOT NULL,
    last_price        REAL NOT NULL,
    volume            INTEGER NOT NULL,
    open_interest     INTEGER NOT NULL,
    voi_ratio         REAL NOT NULL,
    delta             REAL NOT NULL,
    gamma             REAL,
    theta             REAL,
    vega              REAL,
    implied_volatility REAL NOT NULL,
    anomaly_score     REAL NOT NULL,
    detected_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(id)
);

-- Stage 3: Curated LEAPS signals with classification
CREATE TABLE IF NOT EXISTS signals (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id           INTEGER NOT NULL,
    anomaly_id       INTEGER,
    symbol           TEXT NOT NULL,
    option_type      TEXT NOT NULL,
    strike           REAL NOT NULL,
    expiration       TEXT NOT NULL,
    entry_price      REAL NOT NULL,
    delta            REAL NOT NULL,
    theta            REAL,
    leaps_score      REAL NOT NULL,
    confidence_score REAL NOT NULL,
    asset_type       TEXT,   -- 'ETF' | 'STOCK'
    cap_type         TEXT,   -- 'LARGE' | 'GROWTH'
    sector           TEXT,
    signal_type      TEXT,   -- 'SMART_MONEY' | 'FIRST_TIMER' | 'HEDGE' | 'GAMMA' | 'SECTOR_ROTATION'
    narrative        TEXT,
    rationale        TEXT,
    status           TEXT DEFAULT 'active',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(id),
    FOREIGN KEY (anomaly_id) REFERENCES anomalies(id)
);

-- News attached to symbols (both signal-related and macro)
CREATE TABLE IF NOT EXISTS news (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol       TEXT,          -- NULL for macro news
    title        TEXT NOT NULL,
    source       TEXT,
    url          TEXT,
    published_at TIMESTAMP,
    sentiment    REAL,          -- -1.0 to 1.0, NULL until LLM
    is_macro     INTEGER DEFAULT 0,
    fetched_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast symbol lookups
CREATE INDEX IF NOT EXISTS idx_anomalies_symbol ON anomalies(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_symbol   ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_type     ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_news_symbol      ON news(symbol);
CREATE INDEX IF NOT EXISTS idx_news_macro       ON news(is_macro);

-- Daily ranking snapshots (30-day rolling)
CREATE TABLE IF NOT EXISTS daily_rankings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,
    category      TEXT NOT NULL,  -- 'dragon_tiger' | 'individual' | 'etf' | 'premium'
    rank          INTEGER NOT NULL,
    contract_code TEXT NOT NULL,
    underlying    TEXT NOT NULL,
    option_type   TEXT NOT NULL,
    strike        REAL NOT NULL,
    expiration    TEXT NOT NULL,
    last_price    REAL,
    change_pct    REAL,
    volume        INTEGER,
    vs_avg        REAL,
    premium       REAL,
    oi_total      INTEGER,
    oi_change     INTEGER,
    iv            REAL,
    iv_change_pct REAL,
    delta         REAL,
    gamma         REAL,
    theta         REAL,
    vega          REAL,
    leap_cp_ratio REAL,
    narrative     TEXT,
    is_etf        INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date, category, contract_code)
);

CREATE INDEX IF NOT EXISTS idx_rankings_date ON daily_rankings(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_rankings_cat  ON daily_rankings(category);

-- Tracker: user-watched contracts
CREATE TABLE IF NOT EXISTS tracked_contracts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_code  TEXT NOT NULL UNIQUE,
    underlying     TEXT NOT NULL,
    option_type    TEXT NOT NULL,
    strike         REAL NOT NULL,
    expiration     TEXT NOT NULL,
    added_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes          TEXT,
    status         TEXT DEFAULT 'active',  -- 'active' | 'closed' | 'alerted'
    alert_threshold REAL                    -- OI change % to trigger alert
);

CREATE INDEX IF NOT EXISTS idx_tracked_code ON tracked_contracts(contract_code);
CREATE INDEX IF NOT EXISTS idx_tracked_status ON tracked_contracts(status);

-- Tracker snapshots: daily data for tracked contracts
CREATE TABLE IF NOT EXISTS tracker_snapshots (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_code      TEXT NOT NULL,
    snapshot_date      TEXT NOT NULL,
    last_price         REAL,
    volume             INTEGER,
    open_interest      INTEGER,
    oi_change          INTEGER,
    iv                 REAL,
    iv_change_pct      REAL,
    delta              REAL,
    gamma              REAL,
    theta              REAL,
    vega               REAL,
    premium            REAL,
    volume_vs_avg      REAL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_code, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_tracker_snap_date ON tracker_snapshots(contract_code, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_tracker_snap_code ON tracker_snapshots(contract_code);
"""


def init_db() -> None:
    """Create tables if they do not exist."""
    with get_conn() as conn:
        conn.executescript(INIT_SQL)


@contextmanager
def get_conn():
    """Yield a SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def save_ranking_snapshot(
    snapshot_date: str, category: str, entries: list[dict]
) -> None:
    """Save a daily ranking snapshot. Replaces existing entries for the same date + category."""
    with get_conn() as conn:
        # Delete existing entries for this date + category
        conn.execute(
            "DELETE FROM daily_rankings WHERE snapshot_date = ? AND category = ?",
            (snapshot_date, category),
        )
        # Insert new entries
        for entry in entries:
            conn.execute(
                """
                INSERT INTO daily_rankings (
                    snapshot_date, category, rank, contract_code, underlying,
                    option_type, strike, expiration, last_price, change_pct,
                    volume, vs_avg, premium, oi_total, oi_change,
                    iv, iv_change_pct, delta, gamma, theta, vega,
                    leap_cp_ratio, narrative, is_etf
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot_date,
                    category,
                    entry.get("rank", 0),
                    entry.get("contract_code", ""),
                    entry.get("underlying", ""),
                    entry.get("option_type", ""),
                    entry.get("strike", 0.0),
                    entry.get("expiration", ""),
                    entry.get("last_price", 0.0),
                    entry.get("change_pct", 0.0),
                    entry.get("volume", 0),
                    entry.get("vs_avg", 0.0),
                    entry.get("premium", 0.0),
                    entry.get("oi_total", 0),
                    entry.get("oi_change", 0),
                    entry.get("iv", 0.0),
                    entry.get("iv_change_pct", 0.0),
                    entry.get("delta", 0.0),
                    entry.get("gamma", 0.0),
                    entry.get("theta", 0.0),
                    entry.get("vega", 0.0),
                    entry.get("leap_cp_ratio", 0.0),
                    entry.get("narrative", ""),
                    1 if entry.get("is_etf", False) else 0,
                ),
            )
        conn.commit()


def get_ranking_by_date(snapshot_date: str, category: str) -> list[dict]:
    """Get ranking entries for a specific date and category."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM daily_rankings
            WHERE snapshot_date = ? AND category = ?
            ORDER BY rank ASC
            """,
            (snapshot_date, category),
        ).fetchall()
        return [dict(r) for r in rows]


def cleanup_old_rankings(days: int = 30) -> int:
    """Remove rankings older than N days. Returns number of rows deleted."""
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM daily_rankings WHERE snapshot_date < date('now', '-{} days')".format(
                days
            )
        )
        conn.commit()
        return cur.rowcount


def get_available_ranking_dates() -> list[str]:
    """Get all dates that have ranking snapshots."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT snapshot_date FROM daily_rankings ORDER BY snapshot_date DESC"
        ).fetchall()
        return [r["snapshot_date"] for r in rows]
