"""Form 4 cluster-buy: 2+ distinct buyers inside a 7-day window. Display-only."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional


def _parse_date(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value)[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        return None


def _is_buy(txn_type: Any) -> bool:
    t = str(txn_type or "").upper()
    return t.startswith("P") or "PURCHASE" in t or t in ("BUY", "P-PURCHASE")


def cluster_buy(
    trades: list[dict],
    *,
    window_days: int = 7,
    min_buyers: int = 2,
) -> bool:
    buys: list[tuple[datetime, str]] = []
    for t in trades or []:
        if not isinstance(t, dict) or not _is_buy(t.get("txn_type")):
            continue
        dt = _parse_date(t.get("date"))
        owner = str(t.get("owner") or "").strip()
        if dt is None or not owner:
            continue
        buys.append((dt, owner))
    if len(buys) < min_buyers:
        return False
    buys.sort(key=lambda x: x[0])
    window = timedelta(days=window_days)
    for i, (dt_i, _) in enumerate(buys):
        owners: set[str] = set()
        for dt_j, owner_j in buys:
            if dt_i <= dt_j <= dt_i + window:
                owners.add(owner_j)
        if len(owners) >= min_buyers:
            return True
    return False


def annotate_trades(trades: list[dict], *, window_days: int = 7, min_buyers: int = 2) -> dict:
    flag = cluster_buy(trades, window_days=window_days, min_buyers=min_buyers)
    return {"cluster_buy": flag, "trades": list(trades or [])}
