from typing import Any


def _get(items: list[dict], symbol: str) -> dict | None:
    return next((m for m in items if m.get("symbol") == symbol), None)


def _direction(item: dict | None) -> str:
    if item is None:
        return "stable"
    d5 = item.get("change_pct_5d") or 0
    d1 = item.get("change_pct_1d") or 0
    if d5 > 0.1 and d1 > 0:
        return "improving"
    if d5 < -0.1 and d1 < 0:
        return "deteriorating"
    return "stable"


def compute_volatility_signal(items: list[dict]) -> dict:
    vix = _get(items, "^VIX")
    price = (vix or {}).get("price") or 30.0
    if price < 20:
        signal = "green"
    elif price < 25:
        signal = "yellow"
    else:
        signal = "red"
    return {"signal": signal, "direction": _direction(vix)}


def compute_breadth_signal(items: list[dict]) -> dict:
    spy = _get(items, "SPY")
    rsp = _get(items, "RSP")
    above = sum(1 for m in [spy, rsp] if m and m.get("above_ema21"))
    signal = "green" if above == 2 else "red" if above == 0 else "yellow"
    return {"signal": signal, "direction": _direction(spy)}


def compute_credit_signal(items: list[dict]) -> dict:
    hyg = _get(items, "HYG")
    jnk = _get(items, "JNK")
    above = sum(1 for m in [hyg, jnk] if m and m.get("above_ema21"))
    signal = "green" if above == 2 else "red" if above == 0 else "yellow"
    return {"signal": signal, "direction": _direction(hyg)}


def compute_rates_signal(items: list[dict]) -> dict:
    tlt = _get(items, "TLT")
    tnx = _get(items, "^TNX")
    tlt_above = tlt and tlt.get("above_ema21")
    tnx_rsi = (tnx or {}).get("rsi14") or 50.0
    if tlt_above:
        signal = "green"
    elif not tlt_above and tnx_rsi > 65:
        signal = "red"
    else:
        signal = "yellow"
    return {"signal": signal, "direction": _direction(tlt)}


def compute_commodities_signal(items: list[dict]) -> dict:
    gld = _get(items, "GLD")
    cl = _get(items, "CL=F")
    positives = sum(1 for m in [gld, cl] if m and (m.get("change_pct_5d") or 0) > 0)
    signal = "green" if positives == 2 else "red" if positives == 0 else "yellow"
    return {"signal": signal, "direction": _direction(gld)}


def compute_sectors_signal(items: list[dict]) -> dict:
    sector_syms = ["SMH", "XLE", "XLY", "XHB", "ITA"]
    above = sum(1 for s in sector_syms if (m := _get(items, s)) and m.get("above_ema21"))
    signal = "green" if above >= 4 else "red" if above <= 2 else "yellow"
    return {"signal": signal, "direction": _direction(_get(items, "SMH"))}


def compute_overall(groups: dict[str, dict]) -> dict:
    signals = [g["signal"] for g in groups.values()]
    green_count = signals.count("green")
    red_count = signals.count("red")
    if green_count >= 4:
        judgment = "RISK_ON"
    elif red_count >= 4:
        judgment = "RISK_OFF"
    else:
        judgment = "MIXED"
    return {"judgment": judgment, "green_count": green_count, "red_count": red_count}


def compute_macro_signals(items: list[dict]) -> dict:
    groups = {
        "volatility":  compute_volatility_signal(items),
        "breadth":     compute_breadth_signal(items),
        "credit":      compute_credit_signal(items),
        "rates":       compute_rates_signal(items),
        "commodities": compute_commodities_signal(items),
        "sectors":     compute_sectors_signal(items),
    }
    return {"overall": compute_overall(groups), "groups": groups}
