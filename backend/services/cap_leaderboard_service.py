"""
cap_leaderboard_service.py — Market Cap 글로벌 TOP 15 리더보드.

companiesmarketcap.com 글로벌 랭킹을 스크래핑하여 순위·시총·가격·등락을 가져오고,
yfinance 1y 히스토리로 스파크라인·52W·시장구조를 보완. 1시간 인메모리 캐시.
"""
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional

import requests
import yfinance as yf
from bs4 import BeautifulSoup

from core.cap_rank_tracker import CapRankItem, save_ranks, get_previous_ranks

logger = logging.getLogger(__name__)

# ── 스크래핑 설정 ──────────────────────────────────────────────────────────────

_SCRAPE_URL = "https://companiesmarketcap.com/"
_SCRAPE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
_SCRAPE_TOP_N = 30   # 버퍼를 위해 상위 30개 스크래핑 후 yfinance 실패분 제외
_LEADERBOARD_SIZE = 15

CACHE_TTL = 3600  # 1시간

_cache: Optional[dict] = None
_cache_ts: float = 0.0


# ── 파싱 헬퍼 ─────────────────────────────────────────────────────────────────

def _parse_market_cap(s: str) -> float:
    """'$5.145 T' → 5145000000000.0"""
    s = s.replace("$", "").replace(",", "").strip()
    if s.endswith(" T"):
        return float(s[:-2]) * 1e12
    if s.endswith(" B"):
        return float(s[:-2]) * 1e9
    if s.endswith(" M"):
        return float(s[:-2]) * 1e6
    return float(s)


def _parse_price(s: str) -> float:
    return float(s.replace("$", "").replace(",", "").strip())


def _parse_change(s: str) -> float:
    return float(s.replace("%", "").replace("+", "").strip())


# ── 스크래핑 ──────────────────────────────────────────────────────────────────

def _scrape_global_rankings() -> list[dict]:
    """companiesmarketcap.com 글로벌 랭킹 상위 _SCRAPE_TOP_N 개 반환."""
    resp = requests.get(_SCRAPE_URL, headers=_SCRAPE_HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results: list[dict] = []
    for row in soup.select("tr"):
        tds = row.find_all("td")
        if len(tds) < 6:
            continue
        try:
            rank = int(tds[1].get_text(strip=True))
        except (ValueError, IndexError):
            continue

        name_td = tds[2]
        company_el = name_td.select_one(".company-name")
        code_el = name_td.select_one(".company-code")
        if not company_el or not code_el:
            continue

        company_name = company_el.get_text(strip=True)
        # span.rank 제거 후 순수 티커만 추출
        for span in code_el.find_all("span"):
            span.decompose()
        ticker = code_el.get_text(strip=True)

        try:
            market_cap  = _parse_market_cap(tds[3].get_text(strip=True))
            price       = _parse_price(tds[4].get_text(strip=True))
            change_pct  = _parse_change(tds[5].get_text(strip=True))
        except (ValueError, IndexError):
            continue

        results.append({
            "rank":         rank,
            "symbol":       ticker,
            "company_name": company_name,
            "market_cap":   market_cap,
            "price":        price,
            "change_pct_1d": change_pct,
        })

        if len(results) >= _SCRAPE_TOP_N:
            break

    return results


# ── yfinance 보완 ─────────────────────────────────────────────────────────────

def _market_structure(price: float, closes: list[float]) -> str:
    if len(closes) < 50 or not price:
        return "NEUTRAL"
    fifty_day_avg = sum(closes[-50:]) / 50
    ratio = price / fifty_day_avg
    if ratio > 1.02:
        return "UPTREND"
    if ratio < 0.98:
        return "DOWNTREND"
    return "NEUTRAL"


def _enrich_with_yfinance(item: dict) -> Optional[dict]:
    """1y 히스토리로 스파크라인·52W·시장구조 추가. 실패 시 None."""
    symbol = item["symbol"]
    try:
        hist = yf.Ticker(symbol).history(period="1y")
        if hist.empty or "Close" not in hist.columns:
            return None

        closes = [round(float(v), 2) for v in hist["Close"].dropna().tolist()]
        spark       = closes[-30:] if len(closes) >= 30 else closes
        week52_high = max(closes) if closes else 0.0
        week52_low  = min(closes) if closes else 0.0

        return {
            **item,
            "spark":            spark,
            "week52_high":      week52_high,
            "week52_low":       week52_low,
            "market_structure": _market_structure(item["price"], closes),
        }
    except Exception as exc:
        logger.warning("cap_leaderboard: yfinance failed for %s — %s", symbol, exc)
        return None


# ── 메인 ─────────────────────────────────────────────────────────────────────

def fetch_leaderboard(force: bool = False) -> dict:
    """TOP 15 리더보드 반환. 캐시 유효 시 즉시 반환."""
    global _cache, _cache_ts
    now = time.monotonic()

    if not force and _cache and (now - _cache_ts) < CACHE_TTL:
        return {**_cache, "cached": True}

    # 1. 글로벌 랭킹 스크래핑
    try:
        scraped = _scrape_global_rankings()
    except Exception as exc:
        logger.error("cap_leaderboard: scrape failed — %s", exc)
        if _cache:
            logger.warning("cap_leaderboard: returning stale cache after scrape error")
            return {**_cache, "cached": True}
        raise

    if not scraped:
        if _cache:
            return {**_cache, "cached": True}
        raise RuntimeError("companiesmarketcap.com returned no data")

    # 2. 병렬 yfinance 보완 (TOP _SCRAPE_TOP_N → 성공한 것만)
    enriched: list[dict] = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(_enrich_with_yfinance, item): item for item in scraped}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                enriched.append(result)

    # 스크래핑 순위(site rank) 기준 정렬 → TOP 15
    enriched.sort(key=lambda x: x["rank"])
    top15 = enriched[:_LEADERBOARD_SIZE]

    # 3. 로컬 순위 배정 + 순위변동 계산
    prev_ranks = get_previous_ranks()
    items: list[dict] = []
    for i, item in enumerate(top15, start=1):
        sym = item["symbol"]
        rank_change: Optional[int] = None
        if sym in prev_ranks:
            rank_change = prev_ranks[sym] - i
        items.append({**item, "rank": i, "rank_change": rank_change})

    # 4. SQLite 스냅샷 저장
    save_ranks([
        CapRankItem(symbol=it["symbol"], rank=it["rank"], market_cap=it["market_cap"])
        for it in items
    ])

    generated_at = datetime.now(timezone.utc).isoformat()
    payload = {"items": items, "generated_at": generated_at}
    _cache = payload
    _cache_ts = now
    return {**payload, "cached": False}
