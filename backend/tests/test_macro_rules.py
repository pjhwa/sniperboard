import pytest
from core.macro_rules import (
    compute_volatility_signal,
    compute_breadth_signal,
    compute_credit_signal,
    compute_rates_signal,
    compute_commodities_signal,
    compute_sectors_signal,
    compute_overall,
    compute_macro_signals,
)


def _item(symbol, price=None, chg1d=0.0, chg5d=0.0,
          above_ema21=True, rsi14=50.0, market_structure="UPTREND"):
    return {
        "symbol": symbol, "name": symbol,
        "price": price, "change_pct_1d": chg1d, "change_pct_5d": chg5d,
        "above_ema8": above_ema21, "above_ema21": above_ema21,
        "ema8": None, "ema21": None,
        "market_structure": market_structure, "rsi14": rsi14,
    }


# --- 변동성 ---
def test_vix_below_20_is_green():
    assert compute_volatility_signal([_item("^VIX", price=18.0)])["signal"] == "green"

def test_vix_20_to_25_is_yellow():
    assert compute_volatility_signal([_item("^VIX", price=22.0)])["signal"] == "yellow"

def test_vix_above_25_is_red():
    assert compute_volatility_signal([_item("^VIX", price=28.0)])["signal"] == "red"

def test_vix_missing_defaults_red():
    assert compute_volatility_signal([])["signal"] == "red"


# --- 시장 폭 ---
def test_breadth_both_above_ema21_is_green():
    items = [_item("SPY", above_ema21=True), _item("RSP", above_ema21=True)]
    assert compute_breadth_signal(items)["signal"] == "green"

def test_breadth_both_below_ema21_is_red():
    items = [_item("SPY", above_ema21=False), _item("RSP", above_ema21=False)]
    assert compute_breadth_signal(items)["signal"] == "red"

def test_breadth_one_above_is_yellow():
    items = [_item("SPY", above_ema21=True), _item("RSP", above_ema21=False)]
    assert compute_breadth_signal(items)["signal"] == "yellow"


# --- 신용 ---
def test_credit_both_above_is_green():
    items = [_item("HYG", above_ema21=True), _item("JNK", above_ema21=True)]
    assert compute_credit_signal(items)["signal"] == "green"

def test_credit_both_below_is_red():
    items = [_item("HYG", above_ema21=False), _item("JNK", above_ema21=False)]
    assert compute_credit_signal(items)["signal"] == "red"


# --- 달러·금리 ---
def test_rates_tlt_above_ema21_is_green():
    items = [_item("TLT", above_ema21=True), _item("^TNX", rsi14=50.0)]
    assert compute_rates_signal(items)["signal"] == "green"

def test_rates_tlt_below_ema21_and_tnx_rsi_high_is_red():
    items = [_item("TLT", above_ema21=False), _item("^TNX", rsi14=70.0)]
    assert compute_rates_signal(items)["signal"] == "red"


# --- 원자재 ---
def test_commodities_both_5d_positive_is_green():
    items = [_item("GLD", chg5d=1.0), _item("CL=F", chg5d=0.5)]
    assert compute_commodities_signal(items)["signal"] == "green"

def test_commodities_both_5d_negative_is_red():
    items = [_item("GLD", chg5d=-1.0), _item("CL=F", chg5d=-0.5)]
    assert compute_commodities_signal(items)["signal"] == "red"


# --- 섹터 ETF ---
def test_sectors_4_above_ema21_is_green():
    syms = ["SMH", "XLE", "XLY", "XHB", "ITA"]
    items = [_item(s, above_ema21=(i < 4)) for i, s in enumerate(syms)]
    assert compute_sectors_signal(items)["signal"] == "green"

def test_sectors_2_above_ema21_is_red():
    syms = ["SMH", "XLE", "XLY", "XHB", "ITA"]
    items = [_item(s, above_ema21=(i < 2)) for i, s in enumerate(syms)]
    assert compute_sectors_signal(items)["signal"] == "red"


# --- 종합 판정 ---
def test_overall_risk_on_when_4_green():
    groups = {k: {"signal": "green", "direction": "stable"} for k in ["volatility", "breadth", "credit", "rates"]}
    groups.update({k: {"signal": "yellow", "direction": "stable"} for k in ["commodities", "sectors"]})
    result = compute_overall(groups)
    assert result["judgment"] == "RISK_ON"
    assert result["green_count"] == 4

def test_overall_risk_off_when_4_red():
    groups = {k: {"signal": "red", "direction": "stable"} for k in ["volatility", "breadth", "credit", "rates"]}
    groups.update({k: {"signal": "green", "direction": "stable"} for k in ["commodities", "sectors"]})
    result = compute_overall(groups)
    assert result["judgment"] == "RISK_OFF"

def test_overall_mixed_when_neither():
    groups = {k: {"signal": "yellow", "direction": "stable"} for k in
              ["volatility", "breadth", "credit", "rates", "commodities", "sectors"]}
    assert compute_overall(groups)["judgment"] == "MIXED"


# --- 통합 ---
def test_compute_macro_signals_returns_all_keys():
    items = [
        _item("^VIX", price=18.0),
        _item("SPY"), _item("RSP"),
        _item("HYG"), _item("JNK"),
        _item("TLT"), _item("^TNX"),
        _item("GLD", chg5d=1.0), _item("CL=F", chg5d=1.0),
        _item("SMH"), _item("XLE"), _item("XLY"), _item("XHB"), _item("ITA"),
    ]
    result = compute_macro_signals(items)
    assert set(result["groups"].keys()) == {"volatility", "breadth", "credit", "rates", "commodities", "sectors"}
    assert result["overall"]["judgment"] in ("RISK_ON", "RISK_OFF", "MIXED")


# --- direction 테스트 ---
def test_direction_improving_when_5d_and_1d_positive():
    result = compute_volatility_signal([_item("^VIX", price=18.0, chg1d=0.5, chg5d=1.0)])
    assert result["direction"] in ("improving", "deteriorating", "stable")
