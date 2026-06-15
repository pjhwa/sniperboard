import pytest
import sqlite3
from datetime import date, timedelta
from unittest.mock import patch


@pytest.fixture(autouse=True)
def tmp_db(tmp_path):
    """Redirect DB_PATH to a temp file for every test."""
    db = tmp_path / "cap_ranks_test.db"
    with patch("core.cap_rank_tracker.DB_PATH", db):
        import core.cap_rank_tracker as tracker
        tracker.init_db()
        yield tracker


def test_init_db_creates_table(tmp_db):
    from core.cap_rank_tracker import DB_PATH
    with sqlite3.connect(str(DB_PATH)) as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='cap_ranks'"
        ).fetchall()
    assert len(rows) == 1


def test_save_and_get_previous_ranks(tmp_db):
    from core.cap_rank_tracker import CapRankItem, save_ranks, get_previous_ranks, DB_PATH
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    items = [
        CapRankItem(symbol="AAPL", rank=1, market_cap=3.5e12),
        CapRankItem(symbol="MSFT", rank=2, market_cap=3.0e12),
    ]
    with sqlite3.connect(str(DB_PATH)) as c:
        c.executemany(
            "INSERT OR REPLACE INTO cap_ranks (symbol, rank, market_cap, snapshot_date) VALUES (?,?,?,?)",
            [(it.symbol, it.rank, it.market_cap, yesterday) for it in items],
        )
        c.commit()

    prev = get_previous_ranks()
    assert prev == {"AAPL": 1, "MSFT": 2}


def test_get_previous_ranks_empty_when_no_prior_data(tmp_db):
    from core.cap_rank_tracker import get_previous_ranks
    assert get_previous_ranks() == {}


def test_save_ranks_today_not_returned_as_previous(tmp_db):
    from core.cap_rank_tracker import CapRankItem, save_ranks, get_previous_ranks
    items = [CapRankItem(symbol="NVDA", rank=1, market_cap=3.2e12)]
    save_ranks(items)
    prev = get_previous_ranks()
    assert prev == {}


def test_save_ranks_upserts(tmp_db):
    from core.cap_rank_tracker import CapRankItem, save_ranks, DB_PATH
    save_ranks([CapRankItem(symbol="AAPL", rank=1, market_cap=3.5e12)])
    save_ranks([CapRankItem(symbol="AAPL", rank=2, market_cap=3.4e12)])

    with sqlite3.connect(str(DB_PATH)) as c:
        rows = c.execute(
            "SELECT rank FROM cap_ranks WHERE symbol='AAPL'"
        ).fetchall()
    assert len(rows) == 1
    assert rows[0][0] == 2
