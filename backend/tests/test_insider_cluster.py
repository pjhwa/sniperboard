"""Insider Form 4 cluster-buy: 2+ distinct buyers within 7 days."""
from core.insider_cluster import cluster_buy, annotate_trades


def test_cluster_buy_two_executives_within_window():
    trades = [
        {"owner": "Alice CEO", "txn_type": "P-Purchase", "date": "2026-09-01", "shares": 1000},
        {"owner": "Bob CFO", "txn_type": "P-Purchase", "date": "2026-09-05", "shares": 500},
    ]
    assert cluster_buy(trades, window_days=7, min_buyers=2) is True


def test_same_person_is_not_a_cluster():
    trades = [
        {"owner": "Alice CEO", "txn_type": "P-Purchase", "date": "2026-09-01", "shares": 1000},
        {"owner": "Alice CEO", "txn_type": "P-Purchase", "date": "2026-09-03", "shares": 500},
    ]
    assert cluster_buy(trades, window_days=7, min_buyers=2) is False


def test_sales_do_not_count_as_buys():
    trades = [
        {"owner": "Alice CEO", "txn_type": "S-Sale", "date": "2026-09-01", "shares": 1000},
        {"owner": "Bob CFO", "txn_type": "S-Sale", "date": "2026-09-02", "shares": 500},
    ]
    assert cluster_buy(trades, window_days=7, min_buyers=2) is False


def test_outside_window_not_cluster():
    trades = [
        {"owner": "Alice CEO", "txn_type": "P-Purchase", "date": "2026-09-01", "shares": 1000},
        {"owner": "Bob CFO", "txn_type": "P-Purchase", "date": "2026-09-20", "shares": 500},
    ]
    assert cluster_buy(trades, window_days=7, min_buyers=2) is False


def test_annotate_adds_flag():
    trades = [
        {"owner": "A", "txn_type": "P-Purchase", "date": "2026-09-01", "shares": 1},
        {"owner": "B", "txn_type": "P-Purchase", "date": "2026-09-02", "shares": 1},
    ]
    out = annotate_trades(trades)
    assert out["cluster_buy"] is True
    assert len(out["trades"]) == 2
