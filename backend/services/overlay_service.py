"""Yahoo/public overlay fetches. Display-only — never feeds Conviction.

Each fetch degrades to {available: False} on vendor failure. No fabricated rows.
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd
import requests
import yfinance as yf

from core.calendar_normalize import normalize_calendar_events
from core.correlation import correlation_matrix
from core.data_adapter import get_daily, get_multi_daily
from core.insider_cluster import annotate_trades
from core.options_unusual import scan_unusual
from core.rs_horizons import rs_horizons
from core.sector_quadrants import label_sectors

logger = logging.getLogger(__name__)

_CACHE: dict[str, tuple[float, Any]] = {}
_TTL = 15 * 60
_RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "overlay_alert_rules.json")

FF_CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

CORRELATION_SYMS = ["SPY", "QQQ", "GLD", "CL=F", "DX-Y.NYB", "^TNX", "^VIX"]
SECTOR_SYMS = [
    ("SMH", "Semis"),
    ("XLE", "Energy"),
    ("XLY", "Disc."),
    ("XHB", "Homebuilders"),
    ("ITA", "Aero/Def"),
    ("XLK", "Tech"),
    ("XLF", "Financials"),
    ("XLV", "Health"),
]


def _cached(key: str, fn, ttl: float = _TTL):
    now = time.monotonic()
    hit = _CACHE.get(key)
    if hit and (now - hit[0]) < ttl:
        return hit[1]
    val = fn()
    _CACHE[key] = (now, val)
    return val


def _fail(reason: str) -> dict:
    return {"available": False, "error": reason, "usage": "reference_only"}


def fetch_insider(symbol: str) -> dict:
    symbol = symbol.upper()

    def _load():
        try:
            tk = yf.Ticker(symbol)
            df = tk.insider_transactions
            if df is None or (hasattr(df, "empty") and df.empty):
                return {"available": True, "symbol": symbol, "cluster_buy": False, "trades": [], "usage": "reference_only"}
            trades = []
            for _, row in df.head(40).iterrows():
                owner = str(row.get("Insider") or row.get("insider") or row.get("Name") or "")
                txn = str(row.get("Transaction") or row.get("Text") or row.get("Start Date") or "")
                # yfinance columns: Insider, Position, Start Date, Transaction, Shares, Value
                date_v = row.get("Start Date") or row.get("startDate")
                if hasattr(date_v, "strftime"):
                    date_s = date_v.strftime("%Y-%m-%d")
                else:
                    date_s = str(date_v)[:10] if date_v is not None else ""
                shares = row.get("Shares") or row.get("shares") or 0
                trades.append({
                    "owner": owner,
                    "title": str(row.get("Position") or row.get("position") or ""),
                    "txn_type": txn,
                    "date": date_s,
                    "shares": int(shares) if pd.notna(shares) else 0,
                })
            annotated = annotate_trades(trades)
            return {
                "available": True,
                "symbol": symbol,
                "cluster_buy": annotated["cluster_buy"],
                "trades": annotated["trades"],
                "usage": "reference_only",
            }
        except Exception as e:
            logger.warning("insider fetch failed %s: %s", symbol, e)
            return _fail(str(e))

    return _cached(f"insider:{symbol}", _load)


def fetch_short_float(symbol: str) -> dict:
    symbol = symbol.upper()

    def _load():
        try:
            info = yf.Ticker(symbol).info or {}
            raw = info.get("shortPercentOfFloat")
            pct = None
            if raw is not None:
                val = float(raw)
                pct = val * 100 if val <= 1.5 else val
            return {
                "available": pct is not None,
                "symbol": symbol,
                "short_percent_of_float": round(pct, 2) if pct is not None else None,
                "shares_short": info.get("sharesShort"),
                "usage": "reference_only",
            }
        except Exception as e:
            logger.warning("short-float fetch failed %s: %s", symbol, e)
            return _fail(str(e))

    return _cached(f"short:{symbol}", _load)


def fetch_rs_horizons(symbol: str) -> dict:
    symbol = symbol.upper()

    def _load():
        try:
            stock = get_daily(symbol, period="2y")
            spy = get_daily("SPY", period="2y")
            if stock is None or spy is None or stock.empty or spy.empty:
                return _fail("insufficient price history")
            close_s = stock["close"] if "close" in stock.columns else stock["Close"]
            close_m = spy["close"] if "close" in spy.columns else spy["Close"]
            # align on date index
            aligned = pd.concat(
                [close_s.rename("s"), close_m.rename("m")], axis=1, join="inner"
            ).dropna()
            horizons = rs_horizons(aligned["s"], aligned["m"])
            return {
                "available": True,
                "symbol": symbol,
                "benchmark": "SPY",
                "horizons": horizons,
                "usage": "reference_only",
            }
        except Exception as e:
            logger.warning("rs-horizons fetch failed %s: %s", symbol, e)
            return _fail(str(e))

    return _cached(f"rs:{symbol}", _load)


def fetch_calendar() -> dict:
    def _load():
        try:
            resp = requests.get(FF_CALENDAR_URL, timeout=8)
            resp.raise_for_status()
            raw = resp.json()
            if not isinstance(raw, list):
                return _fail("calendar payload not a list")
            events = normalize_calendar_events(raw)
            return {
                "available": True,
                "events": events,
                "source": "forex_factory_week",
                "usage": "reference_only",
            }
        except Exception as e:
            logger.warning("calendar fetch failed: %s", e)
            return _fail(str(e))

    return _cached("calendar", _load, ttl=30 * 60)


def fetch_options_unusual(symbol: str) -> dict:
    symbol = symbol.upper()

    def _load():
        try:
            tk = yf.Ticker(symbol)
            expiries = list(tk.options or [])
            if not expiries:
                return {"available": True, "symbol": symbol, "contracts": [], "usage": "reference_only"}
            chain = tk.option_chain(expiries[0])
            contracts: list[dict] = []
            for kind, frame in (("call", chain.calls), ("put", chain.puts)):
                if frame is None or frame.empty:
                    continue
                for _, row in frame.iterrows():
                    contracts.append({
                        "symbol": symbol,
                        "type": kind,
                        "strike": float(row.get("strike") or 0),
                        "expiry": expiries[0],
                        "volume": float(row.get("volume") or 0),
                        "open_interest": float(row.get("openInterest") or 0),
                        "last_price": float(row.get("lastPrice") or 0),
                        "implied_volatility": float(row.get("impliedVolatility") or 0),
                    })
            hits = scan_unusual(contracts)
            return {
                "available": True,
                "symbol": symbol,
                "expiry": expiries[0],
                "contracts": hits[:30],
                "scanned": len(contracts),
                "usage": "reference_only",
            }
        except Exception as e:
            logger.warning("options fetch failed %s: %s", symbol, e)
            return _fail(str(e))

    return _cached(f"opt:{symbol}", _load)


def fetch_sector_quadrants() -> dict:
    def _load():
        try:
            symbols = [s for s, _ in SECTOR_SYMS]
            dfs = get_multi_daily(symbols, period="3mo")
            rows = []
            for sym, name in SECTOR_SYMS:
                df = dfs.get(sym)
                if df is None or df.empty or len(df) < 42:
                    continue
                close = df["close"] if "close" in df.columns else df["Close"]
                recent = float((close.iloc[-1] / close.iloc[-21] - 1) * 100)
                prior = float((close.iloc[-21] / close.iloc[-42] - 1) * 100)
                rows.append({"symbol": sym, "name": name, "ret_recent": recent, "ret_prior": prior})
            labeled = label_sectors(rows)
            return {"available": True, "sectors": labeled, "usage": "reference_only"}
        except Exception as e:
            logger.warning("sector quadrants failed: %s", e)
            return _fail(str(e))

    return _cached("sectors", _load)


def fetch_correlation() -> dict:
    def _load():
        try:
            dfs = get_multi_daily(CORRELATION_SYMS, period="6mo")
            series = {}
            for sym in CORRELATION_SYMS:
                df = dfs.get(sym)
                if df is None or df.empty:
                    series[sym] = None
                    continue
                close = df["close"] if "close" in df.columns else df["Close"]
                series[sym] = close
            mat = correlation_matrix(series)
            return {
                "available": bool(mat),
                "symbols": [s for s in CORRELATION_SYMS if s in mat],
                "matrix": mat,
                "usage": "reference_only",
            }
        except Exception as e:
            logger.warning("correlation failed: %s", e)
            return _fail(str(e))

    return _cached("corr", _load)


def load_alert_rules() -> list[dict]:
    path = os.path.abspath(_RULES_PATH)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except FileNotFoundError:
        return []
    except Exception as e:
        logger.warning("alert rules load failed: %s", e)
        return []


def save_alert_rules(rules: list[dict]) -> list[dict]:
    path = os.path.abspath(_RULES_PATH)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cleaned = []
    for i, r in enumerate(rules or []):
        if not isinstance(r, dict):
            continue
        cleaned.append({
            "id": str(r.get("id") or f"rule-{i+1}"),
            "type": str(r.get("type") or ""),
            "symbol": str(r.get("symbol") or "").upper(),
            "enabled": bool(r.get("enabled", True)),
            "condition": r.get("condition") or {},
        })
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2)
    return cleaned


def quotes_for_rules(symbols: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    uniq = list(dict.fromkeys(s.upper() for s in symbols if s))
    if not uniq:
        return out
    dfs = get_multi_daily(uniq, period="1mo")
    for sym in uniq:
        df = dfs.get(sym)
        if df is None or df.empty or len(df) < 2:
            continue
        close = df["close"] if "close" in df.columns else df["Close"]
        vol = df["volume"] if "volume" in df.columns else df.get("Volume")
        avg_vol = float(vol.tail(20).mean()) if vol is not None and len(vol) else 0
        out[sym] = {
            "previous": float(close.iloc[-2]),
            "current": float(close.iloc[-1]),
            "volume": float(vol.iloc[-1]) if vol is not None else 0,
            "avg_volume": avg_vol,
        }
    return out
