"""Tests for chart rendering functions."""
import pytest


def test_render_regime_gauge_returns_png_bytes():
    from services.charts import render_regime_gauge
    result = render_regime_gauge(score=72.0, regime_label="CONSTRUCTIVE")
    assert isinstance(result, bytes)
    assert result[:4] == b'\x89PNG', "Result must be PNG format"
    assert len(result) > 1000, "PNG should be non-trivial size"


def test_render_regime_gauge_accepts_edge_scores():
    from services.charts import render_regime_gauge
    lo = render_regime_gauge(score=0.0, regime_label="RISK_OFF")
    hi = render_regime_gauge(score=100.0, regime_label="RISK_ON")
    assert lo[:4] == b'\x89PNG'
    assert hi[:4] == b'\x89PNG'


def test_render_watchlist_sparklines_returns_png_bytes():
    from services.charts import render_watchlist_sparklines
    price_data = {
        "NVDA": [100.0 + i for i in range(30)],
        "META": [300.0 - i * 0.5 for i in range(30)],
        "TSLA": [200.0 + (i % 5) for i in range(30)],
    }
    items = [
        {"symbol": "NVDA", "stage2_score": 7, "conviction_label": "Very High"},
        {"symbol": "META", "stage2_score": 6, "conviction_label": "High"},
        {"symbol": "TSLA", "stage2_score": 5, "conviction_label": "Moderate"},
    ]
    result = render_watchlist_sparklines(price_data=price_data, items=items)
    assert isinstance(result, bytes)
    assert result[:4] == b'\x89PNG'
    assert len(result) > 2000


def test_render_watchlist_sparklines_handles_missing_symbol():
    from services.charts import render_watchlist_sparklines
    # symbol in items but not in price_data — should not crash
    price_data = {"NVDA": [100.0 + i for i in range(30)]}
    items = [
        {"symbol": "NVDA", "stage2_score": 7, "conviction_label": "Very High"},
        {"symbol": "MISSING", "stage2_score": 3, "conviction_label": "Low"},
    ]
    result = render_watchlist_sparklines(price_data=price_data, items=items)
    assert result[:4] == b'\x89PNG'


def test_render_macro_bar_returns_png_bytes():
    from services.charts import render_macro_bar
    groups = {
        "volatility": {"signal": "GREEN"},
        "breadth": {"signal": "GREEN"},
        "credit": {"signal": "YELLOW"},
        "rates": {"signal": "RED"},
        "commodities": {"signal": "YELLOW"},
        "sectors": {"signal": "GREEN"},
    }
    result = render_macro_bar(groups=groups)
    assert isinstance(result, bytes)
    assert result[:4] == b'\x89PNG'
    assert len(result) > 500


def test_render_macro_bar_handles_empty_groups():
    from services.charts import render_macro_bar
    result = render_macro_bar(groups={})
    assert result[:4] == b'\x89PNG'
