"""Unusual-options classifier: volume vs OI and premium thresholds."""
from core.options_unusual import classify_contract, scan_unusual


def test_volume_vs_oi_flag():
    flags = classify_contract(volume=600, open_interest=100, last_price=1.0)
    assert flags["high_volume_vs_oi"] is True  # 6x > 5x
    miss = classify_contract(volume=400, open_interest=100, last_price=1.0)
    assert miss["high_volume_vs_oi"] is False


def test_absolute_volume_and_premium():
    flags = classify_contract(volume=20000, open_interest=20000, last_price=10.0)
    # premium = 10 * 20000 * 100 = 20_000_000
    assert flags["high_absolute_volume"] is True
    assert flags["high_premium"] is True
    assert flags["unusual"] is True


def test_not_unusual_when_quiet():
    flags = classify_contract(volume=10, open_interest=1000, last_price=0.5)
    assert flags["unusual"] is False
    assert flags["high_volume_vs_oi"] is False
    assert flags["high_absolute_volume"] is False
    assert flags["high_premium"] is False


def test_scan_unusual_keeps_only_flagged():
    contracts = [
        {"symbol": "TSLA", "type": "call", "strike": 200, "expiry": "2026-09-18",
         "volume": 6000, "open_interest": 100, "last_price": 2.0, "implied_volatility": 0.5},
        {"symbol": "TSLA", "type": "put", "strike": 180, "expiry": "2026-09-18",
         "volume": 5, "open_interest": 1000, "last_price": 0.1, "implied_volatility": 0.4},
    ]
    hits = scan_unusual(contracts)
    assert len(hits) == 1
    assert hits[0]["type"] == "call"
    assert hits[0]["unusual"] is True
