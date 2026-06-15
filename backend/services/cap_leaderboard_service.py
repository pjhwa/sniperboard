"""
cap_leaderboard_service.py — Market Cap TOP 15 leaderboard.

CAP20 풀에서 yfinance ticker.info + 1mo 히스토리를 병렬로 패치,
market_cap 기준 상위 15개 반환. 1시간 인메모리 캐시.
"""
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional

import yfinance as yf

from core.cap_rank_tracker import CapRankItem, save_ranks, get_previous_ranks

logger = logging.getLogger(__name__)

# ── 종목 풀 ────────────────────────────────────────────────────────────────────

CAP20_SYMBOLS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
    "META", "TSLA", "BRK-B", "AVGO", "LLY",
    "TSM",  "JPM",  "V",    "WMT",  "XOM",
    "UNH",  "MA",   "HD",   "PLTR", "CRWD",
    "SPCX",
]

CAP20_COMPANY_NAMES: dict[str, str] = {
    "AAPL":  "Apple Inc.",
    "MSFT":  "Microsoft Corp.",
    "NVDA":  "NVIDIA Corp.",
    "AMZN":  "Amazon.com Inc.",
    "GOOGL": "Alphabet Inc.",
    "META":  "Meta Platforms Inc.",
    "TSLA":  "Tesla Inc.",
    "BRK-B": "Berkshire Hathaway",
    "AVGO":  "Broadcom Inc.",
    "LLY":   "Eli Lilly & Co.",
    "TSM":   "Taiwan Semiconductor",
    "JPM":   "JPMorgan Chase & Co.",
    "V":     "Visa Inc.",
    "WMT":   "Walmart Inc.",
    "XOM":   "Exxon Mobil Corp.",
    "UNH":   "UnitedHealth Group",
    "MA":    "Mastercard Inc.",
    "HD":    "Home Depot Inc.",
    "PLTR":  "Palantir Technologies",
    "CRWD":  "CrowdStrike Holdings",
    "SPCX":  "SpaceX",
}

CACHE_TTL = 3600  # 1시간

_cache: Optional[dict] = None
_cache_ts: float = 0.0


def _market_structure(price: float, fifty_day_avg: float) -> str:
    if not fifty_day_avg or not price:
        return "NEUTRAL"
    ratio = price / fifty_day_avg
    if ratio > 1.02:
        return "UPTREND"
    if ratio < 0.98:
        return "DOWNTREND"
    return "NEUTRAL"


def _fetch_one(symbol: str) -> Optional[dict]:
    """단일 심볼의 info + 1mo 히스토리 패치. 실패 시 None 반환."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        hist = ticker.history(period="1mo")

        market_cap = info.get("marketCap")
        if not market_cap:
            return None

        price = float(info.get("regularMarketPrice") or info.get("currentPrice") or 0.0)
        change_pct = float(info.get("regularMarketChangePercent") or 0.0)
        week52_high = float(info.get("fiftyTwoWeekHigh") or 0.0)
        week52_low  = float(info.get("fiftyTwoWeekLow")  or 0.0)
        fifty_day   = float(info.get("fiftyDayAverage")  or 0.0)

        spark: list[float] = []
        if not hist.empty and "Close" in hist.columns:
            spark = [round(float(v), 2) for v in hist["Close"].dropna().tolist()]

        return {
            "symbol":           symbol,
            "company_name":     CAP20_COMPANY_NAMES.get(symbol, symbol),
            "market_cap":       float(market_cap),
            "price":            price,
            "change_pct_1d":    change_pct,
            "spark":            spark,
            "week52_high":      week52_high,
            "week52_low":       week52_low,
            "market_structure": _market_structure(price, fifty_day),
        }
    except Exception as exc:
        logger.warning("cap_leaderboard: failed to fetch %s — %s", symbol, exc)
        return None


def fetch_leaderboard(force: bool = False) -> dict:
    """TOP 15 리더보드 반환. 캐시 유효 시 즉시 반환."""
    global _cache, _cache_ts
    now = time.monotonic()

    if not force and _cache and (now - _cache_ts) < CACHE_TTL:
        return {**_cache, "cached": True}

    # 병렬 패치
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(_fetch_one, sym): sym for sym in CAP20_SYMBOLS}
        for fut in as_completed(futures):
            item = fut.result()
            if item:
                results.append(item)

    # 시가총액 내림차순 → TOP 15
    results.sort(key=lambda x: x["market_cap"], reverse=True)
    top15 = results[:15]

    # 순위 배정 + 순위변동 계산
    prev_ranks = get_previous_ranks()
    items: list[dict] = []
    for i, item in enumerate(top15, start=1):
        sym = item["symbol"]
        rank_change: Optional[int] = None
        if sym in prev_ranks:
            rank_change = prev_ranks[sym] - i  # 양수 = 순위 상승
        items.append({**item, "rank": i, "rank_change": rank_change})

    # SQLite 스냅샷 저장
    save_ranks([CapRankItem(symbol=it["symbol"], rank=it["rank"], market_cap=it["market_cap"]) for it in items])

    generated_at = datetime.now(timezone.utc).isoformat()
    payload = {"items": items, "generated_at": generated_at}
    _cache = payload
    _cache_ts = now
    return {**payload, "cached": False}
