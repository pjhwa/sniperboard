# Pre/After-Market Price Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pre-market and after-market price display to MarketStrip and DeepDiveBoard via a new `/api/prepost` endpoint polled every 60 seconds.

**Architecture:** New `GET /api/prepost?symbol=X` endpoint fetches yfinance `ticker.info` (primary) with `history(prepost=True)` fallback. A new `usePrePost(symbol)` React hook polls this endpoint every 60 seconds. Both MarketStrip and DeepDiveBoard consume this hook and show a compact pre/post price line when market is not REGULAR.

**Tech Stack:** FastAPI, yfinance, Pydantic v2, TanStack Query v5, Next.js, TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/api/schemas.py` | Modify | Add `PrePostResponse` Pydantic model |
| `backend/api/endpoints.py` | Modify | Add `GET /prepost` route |
| `backend/tests/test_prepost.py` | Create | TDD tests for prepost endpoint logic |
| `frontend/app/types.ts` | Modify | Add `PrePostData` TypeScript interface |
| `frontend/hooks/usePrePost.ts` | Create | TanStack Query hook, 60s polling |
| `frontend/components/shell/MarketStrip.tsx` | Modify | Show pre/post price in selected symbol cell |
| `frontend/components/boards/DeepDiveBoard.tsx` | Modify | Show pre/post price below main price |

---

## Task 1: Backend Schema

**Files:**
- Modify: `backend/api/schemas.py`

- [ ] **Step 1: Add `PrePostResponse` to schemas.py**

Open `backend/api/schemas.py` and add after the `SentimentHistoryResponse` class at the end of the file:

```python
class PrePostResponse(BaseModel):
    symbol: str
    market_state: str  # "PRE" | "POST" | "REGULAR" | "CLOSED"
    pre_market_price: Optional[float] = None
    pre_market_change_pct: Optional[float] = None
    post_market_price: Optional[float] = None
    post_market_change_pct: Optional[float] = None
    regular_close: Optional[float] = None
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add backend/api/schemas.py
git commit -m "feat: add PrePostResponse schema for pre/after-market endpoint"
```

---

## Task 2: Backend Endpoint (TDD)

**Files:**
- Create: `backend/tests/test_prepost.py`
- Modify: `backend/api/endpoints.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_prepost.py`:

```python
"""Pre/after-market endpoint TDD

Run:
    cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_prepost.py -v
"""
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.endpoints import _fetch_prepost_data


def _make_ticker_info(pre=182.76, post=None, regular=181.50, state="PRE"):
    return {
        "preMarketPrice": pre,
        "postMarketPrice": post,
        "regularMarketPrice": regular,
        "marketState": state,
    }


def test_prepost_primary_path_pre_market():
    """ticker.info 가 preMarketPrice 반환하면 그것을 사용한다."""
    info = _make_ticker_info(pre=182.76, post=None, regular=181.50, state="PRE")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["market_state"] == "PRE"
    assert result["pre_market_price"] == pytest.approx(182.76)
    assert result["post_market_price"] is None
    assert result["regular_close"] == pytest.approx(181.50)
    assert result["pre_market_change_pct"] == pytest.approx((182.76 - 181.50) / 181.50 * 100, abs=0.01)


def test_prepost_primary_path_post_market():
    """ticker.info 가 postMarketPrice 반환하면 그것을 사용한다."""
    info = _make_ticker_info(pre=None, post=180.00, regular=181.50, state="POST")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["market_state"] == "POST"
    assert result["post_market_price"] == pytest.approx(180.00)
    assert result["pre_market_price"] is None
    assert result["post_market_change_pct"] == pytest.approx((180.00 - 181.50) / 181.50 * 100, abs=0.01)


def test_prepost_fallback_to_history_when_info_missing():
    """ticker.info 에 pre/post 가격이 없으면 history(prepost=True) 로 폴백한다."""
    info = _make_ticker_info(pre=None, post=None, regular=181.50, state="PRE")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    # history 반환값: 마지막 캔들이 장외 시간 (04:00)
    idx = pd.date_range("2025-01-10 04:00", periods=3, freq="1min", tz="America/New_York")
    df = pd.DataFrame({"Close": [181.0, 181.5, 182.0]}, index=idx)
    mock_ticker.history.return_value = df

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    mock_ticker.history.assert_called_once_with(period="1d", interval="1m", prepost=True)
    assert result["pre_market_price"] == pytest.approx(182.0)
    assert result["pre_market_change_pct"] is not None


def test_prepost_returns_nulls_on_exception():
    """yfinance 예외 발생 시 null 필드로 graceful 응답한다."""
    mock_ticker = MagicMock()
    mock_ticker.info = {}  # marketState 없음
    mock_ticker.history.side_effect = Exception("network error")

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["pre_market_price"] is None
    assert result["post_market_price"] is None
    assert result["market_state"] in ("CLOSED", "UNKNOWN")


def test_prepost_regular_market_returns_no_prepost_prices():
    """정규장 중에는 pre/post 가격이 null이다."""
    info = _make_ticker_info(pre=None, post=None, regular=181.50, state="REGULAR")
    mock_ticker = MagicMock()
    mock_ticker.info = info

    with patch("api.endpoints.yf.Ticker", return_value=mock_ticker):
        result = _fetch_prepost_data("AAPL")

    assert result["market_state"] == "REGULAR"
    assert result["pre_market_price"] is None
    assert result["post_market_price"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_prepost.py -v
```

Expected: All 5 tests FAIL with `ImportError: cannot import name '_fetch_prepost_data'`

- [ ] **Step 3: Implement `_fetch_prepost_data` and endpoint in `endpoints.py`**

Add `import yfinance as yf` at the top of `backend/api/endpoints.py` (after existing imports):

```python
import yfinance as yf
```

Add `PrePostResponse` to the schema import line:

```python
from api.schemas import (
    OHLCVResponse, LatestSignalResponse, DailyResponse, WatchlistResponse,
    MacroResponse, RegimeResponse, DistributionDayResponse, SentimentResponse,
    BriefResponse, EarningsResponse, SentimentHistoryResponse, PrePostResponse,
)
```

Add the helper function and endpoint **before** the `@router.get("/ohlcv")` line:

```python
def _fetch_prepost_data(symbol: str) -> dict:
    """Fetch pre/after-market price. Primary: ticker.info. Fallback: history(prepost=True)."""
    result = {
        "symbol": symbol.upper(),
        "market_state": "CLOSED",
        "pre_market_price": None,
        "pre_market_change_pct": None,
        "post_market_price": None,
        "post_market_change_pct": None,
        "regular_close": None,
    }
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}

        market_state = info.get("marketState", "CLOSED")
        result["market_state"] = market_state if market_state in ("PRE", "POST", "REGULAR", "CLOSED") else "CLOSED"

        regular_close = info.get("regularMarketPrice")
        result["regular_close"] = regular_close

        pre_price = info.get("preMarketPrice")
        post_price = info.get("postMarketPrice")

        # Fallback: history(prepost=True) when info fields are absent
        if pre_price is None and post_price is None and market_state in ("PRE", "POST"):
            try:
                hist = ticker.history(period="1d", interval="1m", prepost=True)
                if hist is not None and not hist.empty:
                    last_close = float(hist["Close"].iloc[-1])
                    if market_state == "PRE":
                        pre_price = last_close
                    else:
                        post_price = last_close
            except Exception:
                pass

        if pre_price is not None and regular_close:
            result["pre_market_price"] = float(pre_price)
            result["pre_market_change_pct"] = round(
                (float(pre_price) - float(regular_close)) / float(regular_close) * 100, 3
            )

        if post_price is not None and regular_close:
            result["post_market_price"] = float(post_price)
            result["post_market_change_pct"] = round(
                (float(post_price) - float(regular_close)) / float(regular_close) * 100, 3
            )

    except Exception:
        pass

    return result


@router.get("/prepost", response_model=PrePostResponse)
async def get_prepost(symbol: str = Query(..., description="주식 심볼")):
    data = _fetch_prepost_data(symbol)
    return data
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_prepost.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add backend/api/endpoints.py backend/tests/test_prepost.py
git commit -m "feat: add GET /api/prepost endpoint with yfinance info+history fallback"
```

---

## Task 3: Frontend Type

**Files:**
- Modify: `frontend/app/types.ts`

- [ ] **Step 1: Add `PrePostData` interface to `types.ts`**

Open `frontend/app/types.ts` and add after the last interface (near `API_BASE`):

```typescript
export interface PrePostData {
  symbol: string;
  market_state: 'PRE' | 'POST' | 'REGULAR' | 'CLOSED';
  pre_market_price: number | null;
  pre_market_change_pct: number | null;
  post_market_price: number | null;
  post_market_change_pct: number | null;
  regular_close: number | null;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/app/types.ts
git commit -m "feat: add PrePostData TypeScript interface"
```

---

## Task 4: `usePrePost` Hook

**Files:**
- Create: `frontend/hooks/usePrePost.ts`

- [ ] **Step 1: Create `usePrePost.ts`**

Create `frontend/hooks/usePrePost.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { API_BASE, PrePostData } from '../app/types';

const fetchPrePost = async (symbol: string): Promise<PrePostData> => {
  const res = await fetch(`${API_BASE}/api/prepost?symbol=${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch pre/post market data');
  return res.json();
};

export function usePrePost(symbol: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['prepost', symbol],
    queryFn: () => fetchPrePost(symbol),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  return { prePostData: data, isLoading, isError };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/hooks/usePrePost.ts
git commit -m "feat: add usePrePost hook with 60s polling"
```

---

## Task 5: MarketStrip — Pre/Post Price Display

**Files:**
- Modify: `frontend/components/shell/MarketStrip.tsx`

- [ ] **Step 1: Add `usePrePost` import and call in MarketStrip**

In `frontend/components/shell/MarketStrip.tsx`, add the import:

```typescript
import { usePrePost } from '@/hooks/usePrePost';
```

Inside the `MarketStrip` function body, after the existing `useIntraday` call (line 13), add:

```typescript
const { prePostData } = usePrePost(symbol);
```

- [ ] **Step 2: Add pre/post price line to the selected symbol cell**

In the selected symbol cell block (the `{lastCandle && (...)}` section), find the closing `</div>` of the price column (the div containing `$lastCandle.close.toFixed(2)`) and add the pre/post row right after the price `<div>`:

The current price column JSX looks like:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontWeight: 600, fontSize: 13 }}>{symbol}</span>
    {chg !== null && (
      <span className={'badge ' + (chg >= 0 ? 'bull' : 'bear')} style={{ fontSize: 10 }}>
        {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
      </span>
    )}
  </div>
  <div className="mono" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
    ${lastCandle.close.toFixed(2)}
  </div>
</div>
```

Replace it with:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontWeight: 600, fontSize: 13 }}>{symbol}</span>
    {chg !== null && (
      <span className={'badge ' + (chg >= 0 ? 'bull' : 'bear')} style={{ fontSize: 10 }}>
        {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
      </span>
    )}
  </div>
  <div className="mono" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
    ${lastCandle.close.toFixed(2)}
  </div>
  {prePostData && prePostData.market_state !== 'REGULAR' && (() => {
    const isPre = prePostData.market_state === 'PRE';
    const price = isPre ? prePostData.pre_market_price : prePostData.post_market_price;
    const chgPct = isPre ? prePostData.pre_market_change_pct : prePostData.post_market_change_pct;
    if (price == null) return null;
    const up = (chgPct ?? 0) >= 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
        <span style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isPre ? 'PRE' : 'POST'}
        </span>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
          ${price.toFixed(2)}
        </span>
        {chgPct != null && (
          <span style={{ fontSize: 10, color: up ? 'var(--bull)' : 'var(--bear)' }}>
            {up ? '+' : ''}{chgPct.toFixed(2)}%
          </span>
        )}
      </div>
    );
  })()}
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/components/shell/MarketStrip.tsx
git commit -m "feat: show pre/after-market price in MarketStrip selected symbol cell"
```

---

## Task 6: DeepDiveBoard — Pre/Post Price Display

**Files:**
- Modify: `frontend/components/boards/DeepDiveBoard.tsx`

- [ ] **Step 1: Add `usePrePost` import and call in DeepDiveBoard**

In `frontend/components/boards/DeepDiveBoard.tsx`, add the import after the existing hook imports:

```typescript
import { usePrePost } from '@/hooks/usePrePost';
```

Inside the `DeepDiveBoard` function body, after the existing hook calls (after `const { regimeData } = useRegime();` on line 111), add:

```typescript
const { prePostData } = usePrePost(symbol);
```

- [ ] **Step 2: Add pre/post price below the main price in Row 1**

In the Row 1 price section (the `{lastCandle ? (...) : ...}` block), find the `<div style={{ flexShrink: 0 }}>` that contains the main price. It currently ends after the RSI/EMA subline:

```tsx
<div style={{ flexShrink: 0 }}>
  <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
    ${lastCandle.close.toFixed(2)}
  </div>
  {indicators && lastIdx >= 0 && (() => {
    const rsi = indicators.rsi[lastIdx] ?? 0;
    return (
      <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2, whiteSpace: 'nowrap' }}>
        RSI{' '}
        <span className="mono" style={{ color: rsi >= 70 ? 'var(--warn)' : rsi <= 35 ? 'var(--bear)' : 'var(--fg)' }}>
          {rsi.toFixed(0)}
        </span>
        {' · '}EMA21{' '}
        <span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span>
      </div>
    );
  })()}
</div>
```

Replace it with:

```tsx
<div style={{ flexShrink: 0 }}>
  <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
    ${lastCandle.close.toFixed(2)}
  </div>
  {indicators && lastIdx >= 0 && (() => {
    const rsi = indicators.rsi[lastIdx] ?? 0;
    return (
      <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2, whiteSpace: 'nowrap' }}>
        RSI{' '}
        <span className="mono" style={{ color: rsi >= 70 ? 'var(--warn)' : rsi <= 35 ? 'var(--bear)' : 'var(--fg)' }}>
          {rsi.toFixed(0)}
        </span>
        {' · '}EMA21{' '}
        <span className="mono">${(indicators.ema21[lastIdx] ?? 0).toFixed(2)}</span>
      </div>
    );
  })()}
  {prePostData && prePostData.market_state !== 'REGULAR' && (() => {
    const isPre = prePostData.market_state === 'PRE';
    const price = isPre ? prePostData.pre_market_price : prePostData.post_market_price;
    const chgPct = isPre ? prePostData.pre_market_change_pct : prePostData.post_market_change_pct;
    if (price == null) return null;
    const up = (chgPct ?? 0) >= 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          padding: '1px 5px', borderRadius: 4,
          background: isPre ? 'var(--em-soft)' : 'var(--border)',
          color: isPre ? 'var(--em-500)' : 'var(--fg-muted)',
        }}>
          {isPre ? 'PRE' : 'POST'}
        </span>
        <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
          ${price.toFixed(2)}
        </span>
        {chgPct != null && (
          <span style={{ fontSize: 11, color: up ? 'var(--bull)' : 'var(--bear)' }}>
            {up ? '+' : ''}{chgPct.toFixed(2)}%
          </span>
        )}
      </div>
    );
  })()}
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/components/boards/DeepDiveBoard.tsx
git commit -m "feat: show pre/after-market price in DeepDiveBoard Row 1 price section"
```

---

## Task 7: Update PROJECT_CONTEXT.md and README.md

**Files:**
- Modify: `PROJECT_CONTEXT.md`
- Modify: `README.md`

- [ ] **Step 1: Update PROJECT_CONTEXT.md**

In `PROJECT_CONTEXT.md`, update the API endpoints table (Section 3) to add the new endpoint row:

```
| `GET /prepost` | `symbol` | 프리/애프터마켓 가격·변화율·market_state |
```

Update the hooks list (Section 2 frontend hooks) to add:

```
│       ├── usePrePost.ts             # GET /api/prepost (60초 폴링). prePostData: { market_state, pre/post price+chg_pct, regular_close }
```

Update the AUTO-GENERATED date to `2026-05-28`.

- [ ] **Step 2: Update README.md**

Add a note in the relevant section that the MarketStrip and DeepDiveBoard show pre/after-market price (PRE/POST label + price + change%) when the market is outside regular trading hours.

- [ ] **Step 3: Commit**

```bash
cd /Users/jerry/dev/sniperboard
git add PROJECT_CONTEXT.md README.md
git commit -m "docs: update PROJECT_CONTEXT + README for pre/after-market price feature"
```
