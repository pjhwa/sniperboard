"""
cap_rank_tracker.py — SQLite persistence for daily market cap rank snapshots.
DB: backend/data/cap_ranks.db  (same directory as signal_log.db)
"""
import logging
import sqlite3
from dataclasses import dataclass
from datetime import date
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "data" / "cap_ranks.db"


@dataclass
class CapRankItem:
    symbol: str
    rank: int
    market_cap: float


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    return c


def init_db() -> None:
    """앱 시작 시 1회 호출. 테이블이 없으면 생성."""
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS cap_ranks (
                symbol        TEXT    NOT NULL,
                rank          INTEGER NOT NULL,
                market_cap    REAL,
                snapshot_date TEXT    NOT NULL,
                PRIMARY KEY (symbol, snapshot_date)
            )
        """)
        c.commit()
    logger.info("cap_rank_tracker: DB initialised at %s", DB_PATH)


def save_ranks(items: list[CapRankItem]) -> None:
    """오늘 날짜 스냅샷으로 upsert."""
    today = date.today().isoformat()
    with _conn() as c:
        c.executemany(
            """
            INSERT OR REPLACE INTO cap_ranks (symbol, rank, market_cap, snapshot_date)
            VALUES (?, ?, ?, ?)
            """,
            [(it.symbol, it.rank, it.market_cap, today) for it in items],
        )
        c.commit()


def get_previous_ranks() -> dict[str, int]:
    """오늘 이전 가장 최근 스냅샷에서 {symbol: rank} 반환. 없으면 {}."""
    today = date.today().isoformat()
    with _conn() as c:
        row = c.execute(
            "SELECT MAX(snapshot_date) AS max_date FROM cap_ranks WHERE snapshot_date < ?",
            (today,),
        ).fetchone()
        if not row or not row["max_date"]:
            return {}
        prev_date = row["max_date"]
        rows = c.execute(
            "SELECT symbol, rank FROM cap_ranks WHERE snapshot_date = ?",
            (prev_date,),
        ).fetchall()
        return {r["symbol"]: r["rank"] for r in rows}
