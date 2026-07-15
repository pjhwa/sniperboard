"""Phase B4 — divergence classifier."""
from core.divergence import build_divergence_list, classify_divergence


def test_bullish_divergence():
    assert classify_divergence(0.8, -3.0) == "bullish_divergence"


def test_bearish_divergence():
    assert classify_divergence(-0.8, 3.0) == "bearish_divergence"


def test_aligned():
    assert classify_divergence(0.9, 2.0) == "aligned_bull"
    assert classify_divergence(-0.9, -2.0) == "aligned_bear"


def test_neutral_none():
    assert classify_divergence(0.1, 0.2) is None


def test_build_list_filters():
    syms = [
        {"symbol": "NVDA", "composite_score": 0.7, "sentiment": "optimistic"},
        {"symbol": "AAPL", "composite_score": -0.8, "sentiment": "fearful"},
        {"symbol": "MSFT", "composite_score": 0.1, "sentiment": "neutral"},
    ]
    prices = {"NVDA": -4.0, "AAPL": 3.5, "MSFT": 0.1}
    out = build_divergence_list(syms, prices, only_divergences=True)
    labels = {r["symbol"]: r["divergence"] for r in out}
    assert labels["NVDA"] == "bullish_divergence"
    assert labels["AAPL"] == "bearish_divergence"
    assert "MSFT" not in labels
