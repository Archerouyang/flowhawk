"""Tracker database operations — CRUD + snapshots for watched contracts."""

from src.storage.db import get_conn


def add_tracked_contract(
    contract_code: str,
    underlying: str,
    option_type: str,
    strike: float,
    expiration: str,
    notes: str = "",
    alert_threshold: float | None = None,
) -> dict:
    """Add a contract to the tracker. Returns the created record."""
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO tracked_contracts (contract_code, underlying, option_type, strike, expiration, notes, alert_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(contract_code) DO UPDATE SET
                status = 'active',
                notes = excluded.notes,
                alert_threshold = excluded.alert_threshold
            """,
            (
                contract_code,
                underlying,
                option_type,
                strike,
                expiration,
                notes,
                alert_threshold,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM tracked_contracts WHERE contract_code = ?",
            (contract_code,),
        ).fetchone()
        return dict(row) if row else {}


def remove_tracked_contract(contract_code: str) -> bool:
    """Remove a contract from the tracker. Returns True if deleted."""
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM tracked_contracts WHERE contract_code = ?",
            (contract_code,),
        )
        conn.commit()
        return cur.rowcount > 0


def update_tracked_contract(
    contract_code: str,
    notes: str | None = None,
    status: str | None = None,
    alert_threshold: float | None = None,
) -> dict | None:
    """Update notes/status/alert_threshold. Returns updated record."""
    updates = []
    params = []
    if notes is not None:
        updates.append("notes = ?")
        params.append(notes)
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if alert_threshold is not None:
        updates.append("alert_threshold = ?")
        params.append(alert_threshold)

    with get_conn() as conn:
        if not updates:
            row = conn.execute(
                "SELECT * FROM tracked_contracts WHERE contract_code = ?",
                (contract_code,),
            ).fetchone()
            return dict(row) if row else None
        conn.execute(
            f"UPDATE tracked_contracts SET {', '.join(updates)} WHERE contract_code = ?",
            (*params, contract_code),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM tracked_contracts WHERE contract_code = ?",
            (contract_code,),
        ).fetchone()
        return dict(row) if row else None


def get_tracked_contracts(status: str | None = None) -> list[dict]:
    """Get all tracked contracts, optionally filtered by status."""
    with get_conn() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM tracked_contracts WHERE status = ? ORDER BY added_at DESC",
                (status,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM tracked_contracts ORDER BY added_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def get_tracked_contract(contract_code: str) -> dict | None:
    """Get a single tracked contract."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM tracked_contracts WHERE contract_code = ?",
            (contract_code,),
        ).fetchone()
        return dict(row) if row else None


# ── Snapshots ──


def save_tracker_snapshot(
    contract_code: str,
    snapshot_date: str,
    last_price: float,
    volume: int,
    open_interest: int,
    oi_change: int,
    iv: float,
    iv_change_pct: float,
    delta: float,
    gamma: float,
    theta: float,
    vega: float,
    premium: float,
    volume_vs_avg: float,
) -> None:
    """Save a daily snapshot for a tracked contract."""
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO tracker_snapshots
                (contract_code, snapshot_date, last_price, volume, open_interest, oi_change,
                 iv, iv_change_pct, delta, gamma, theta, vega, premium, volume_vs_avg)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(contract_code, snapshot_date) DO UPDATE SET
                last_price = excluded.last_price,
                volume = excluded.volume,
                open_interest = excluded.open_interest,
                oi_change = excluded.oi_change,
                iv = excluded.iv,
                iv_change_pct = excluded.iv_change_pct,
                delta = excluded.delta,
                gamma = excluded.gamma,
                theta = excluded.theta,
                vega = excluded.vega,
                premium = excluded.premium,
                volume_vs_avg = excluded.volume_vs_avg
            """,
            (
                contract_code,
                snapshot_date,
                last_price,
                volume,
                open_interest,
                oi_change,
                iv,
                iv_change_pct,
                delta,
                gamma,
                theta,
                vega,
                premium,
                volume_vs_avg,
            ),
        )
        conn.commit()


def get_tracker_history(contract_code: str, limit: int = 30) -> list[dict]:
    """Get historical snapshots for a contract, newest first."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM tracker_snapshots
            WHERE contract_code = ?
            ORDER BY snapshot_date DESC
            LIMIT ?
            """,
            (contract_code, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def get_latest_snapshots(contract_codes: list[str]) -> dict[str, dict]:
    """Get the most recent snapshot for each contract code."""
    if not contract_codes:
        return {}
    placeholders = ",".join("?" * len(contract_codes))
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT s.* FROM tracker_snapshots s
            INNER JOIN (
                SELECT contract_code, MAX(snapshot_date) as max_date
                FROM tracker_snapshots
                WHERE contract_code IN ({placeholders})
                GROUP BY contract_code
            ) latest ON s.contract_code = latest.contract_code AND s.snapshot_date = latest.max_date
            """,
            tuple(contract_codes),
        ).fetchall()
        return {r["contract_code"]: dict(r) for r in rows}


def get_previous_day_snapshots(contract_codes: list[str]) -> dict[str, dict]:
    """Get the second-most-recent snapshot for each contract (for day-over-day comparison)."""
    if not contract_codes:
        return {}
    placeholders = ",".join("?" * len(contract_codes))
    with get_conn() as conn:
        # For each contract, get the 2 most recent snapshots, then pick the older one
        rows = conn.execute(
            f"""
            SELECT s.* FROM tracker_snapshots s
            INNER JOIN (
                SELECT contract_code, snapshot_date FROM (
                    SELECT contract_code, snapshot_date,
                        ROW_NUMBER() OVER (PARTITION BY contract_code ORDER BY snapshot_date DESC) as rn
                    FROM tracker_snapshots
                    WHERE contract_code IN ({placeholders})
                ) ranked
                WHERE rn = 2
            ) prev ON s.contract_code = prev.contract_code AND s.snapshot_date = prev.snapshot_date
            """,
            tuple(contract_codes),
        ).fetchall()
        return {r["contract_code"]: dict(r) for r in rows}


def cleanup_old_tracker_snapshots(days: int = 90) -> int:
    """Remove snapshots older than N days. Returns rows deleted."""
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM tracker_snapshots WHERE snapshot_date < date('now', '-{} days')".format(
                days
            )
        )
        conn.commit()
        return cur.rowcount


def get_30d_high_oi(contract_codes: list[str]) -> dict[str, int]:
    """Get the highest open_interest in the last 30 days for each contract."""
    if not contract_codes:
        return {}
    placeholders = ",".join("?" * len(contract_codes))
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT contract_code, MAX(open_interest) as max_oi
            FROM tracker_snapshots
            WHERE contract_code IN ({placeholders})
              AND snapshot_date >= date('now', '-30 days')
            GROUP BY contract_code
            """,
            tuple(contract_codes),
        ).fetchall()
        return {r["contract_code"]: r["max_oi"] for r in rows}
