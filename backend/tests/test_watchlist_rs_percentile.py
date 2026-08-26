"""Cross-sectional rs_score_percentile ranking (Task 4 of the gs-quant-inspired
quant enhancements). Verifies build_watchlist_result() ranks symbols by
rs_excess_63d across the watchlist universe, without touching rs_score/rs_strong.
"""
import pandas as pd
import pytest


def _fake_stage2(rs_excess: float, score: int = 6):
    return {
        "score": score, "rs_score": 50.0 + rs_excess, "rs_excess_63d": rs_excess,
        "beta_63d": 1.0, "pct_from_52w_high": -5.0,
        "checks": {k: True for k in [
            "price_above_emas", "ema200_rising", "near_52w_high", "above_52w_low",
            "pullback_shallow", "rs_strong", "volume_contracting",
        ]},
        "entry": 100.0, "stop": 90.0, "target": 130.0, "latest_atr": 2.0,
        "pivot_high": 99.5, "monthly_phase": "CONFIRMED_UPTREND",
        "monthly_uptrend_confirmed": True,
    }


def test_rs_score_percentile_ranks_across_universe(monkeypatch):
    import api.endpoints as endpoints_mod

    symbols = ["AAA", "BBB", "CCC"]
    excess_by_sym = {"AAA": -10.0, "BBB": 0.0, "CCC": 10.0}

    idx = pd.date_range("2023-01-01", periods=260, freq="B")

    def _fake_df(sym: str) -> pd.DataFrame:
        df = pd.DataFrame({"close": [100.0] * 260}, index=idx)
        df.attrs["sym"] = sym
        return df

    def _fake_get_multi_daily(syms, period="2y"):
        return {s: _fake_df(s) for s in syms}

    monkeypatch.setattr(endpoints_mod, "WATCHLIST_SYMS", symbols)
    monkeypatch.setattr(endpoints_mod, "SYMBOL_TIER", {s: 1 for s in symbols})
    monkeypatch.setattr(endpoints_mod, "get_multi_daily", _fake_get_multi_daily)
    monkeypatch.setattr(endpoints_mod, "compute_regime", lambda dfs: {"total": 50.0, "regime": "MIXED"})
    monkeypatch.setattr(endpoints_mod, "add_daily_indicators", lambda df: df)
    monkeypatch.setattr(
        endpoints_mod, "calculate_stage2_analysis",
        lambda df, spy, rsp: _fake_stage2(excess_by_sym[df.attrs["sym"]]),
    )
    monkeypatch.setattr(endpoints_mod, "_load_sentiment_for_conviction", lambda: (None, {}))
    monkeypatch.setattr(
        endpoints_mod, "calculate_conviction",
        lambda **kw: {"score": 50, "label": "NEUTRAL", "reliability": "medium", "notes": []},
    )

    result, _ = endpoints_mod.build_watchlist_result()
    by_sym = {r["symbol"]: r for r in result}

    assert by_sym["CCC"]["rs_score_percentile"] > by_sym["BBB"]["rs_score_percentile"]
    assert by_sym["BBB"]["rs_score_percentile"] > by_sym["AAA"]["rs_score_percentile"]
    # rs_score/rs_strong stay on the per-symbol formula, unaffected by the
    # cross-sectional pass
    assert by_sym["AAA"]["rs_score"] == pytest.approx(40.0)
    assert by_sym["CCC"]["rs_score"] == pytest.approx(60.0)
