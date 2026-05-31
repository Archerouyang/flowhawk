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
