# Pre/After-Market Price Display — Design Spec

**Date:** 2026-05-28  
**Status:** Approved

---

## Summary

Add pre-market and after-market price display to SniperBoard in two locations: the MarketStrip (selected symbol cell) and the DeepDive Board (Row 1 price section). A new dedicated `/api/prepost` endpoint handles data fetching with a yfinance `ticker.info` → `history(prepost=True)` fallback strategy, polled every 60 seconds by a new `usePrePost` hook.

---

## Backend

### New Endpoint: `GET /api/prepost`

**Query parameter:** `symbol` (required, e.g. `AAPL`)

**Response schema (`PrePostResponse`):**

```json
{
  "symbol": "AAPL",
  "market_state": "PRE",
  "pre_market_price": 182.76,
  "pre_market_change_pct": 0.42,
  "post_market_price": null,
  "post_market_change_pct": null,
  "regular_close": 181.50
}
```

**`market_state` values:** `"PRE"` | `"POST"` | `"REGULAR"` | `"CLOSED"`

**Fetch logic (in order):**

1. Call `yf.Ticker(symbol).info`
2. Extract `preMarketPrice`, `postMarketPrice`, `regularMarketPrice`, `marketState`
3. If pre/post price is `None`, fall back to `ticker.history(period="1d", interval="1m", prepost=True)` and extract the last candle outside regular hours
4. Compute `change_pct = (prepost_price - regular_close) / regular_close * 100`
5. Return nulls gracefully — never raise on missing data

**Files changed:**
- `backend/api/schemas.py` — add `PrePostResponse` Pydantic model
- `backend/api/endpoints.py` — add `GET /prepost` route

---

## Frontend

### New Hook: `usePrePost(symbol: string)`

**File:** `frontend/hooks/usePrePost.ts`

- Calls `GET /api/prepost?symbol={symbol}`
- `refetchInterval: 60_000`
- `staleTime: 55_000`
- Returns `{ prePostData, isLoading, isError }`

### MarketStrip Changes

**File:** `frontend/components/shell/MarketStrip.tsx`

Add `usePrePost(symbol)` call. In the selected symbol cell, below the price line, show a compact pre/after-market row:

```
AAPL  ↑1.2%
$182.50
PRE $182.76  +0.42%    ← new line, bull/bear color
```

- Show only when `market_state === "PRE"` or `"POST"` and the relevant price is non-null
- Hide when `market_state === "REGULAR"` (redundant during trading hours)
- Font size: 11px, muted color for label, bull/bear color for change

### DeepDiveBoard Changes

**File:** `frontend/components/boards/DeepDiveBoard.tsx`

Add `usePrePost(symbol)` call. In Row 1 (symbol + price + badges), append a sub-line below the main price:

```
$182.50  ↑1.2%
PRE $182.76  +0.42%    ← new sub-line
```

- Same visibility rule: only when `market_state !== "REGULAR"` and price is non-null
- Font size: 12px

---

## Data Flow

```
usePrePost(symbol)
  └── GET /api/prepost?symbol={symbol}  [60s poll]
        └── yf.Ticker.info  →  preMarketPrice / postMarketPrice
              └── fallback: history(prepost=True) last off-hours candle
```

---

## Error Handling

- Backend: catch all yfinance exceptions, return nulls for price fields (never 500)
- Frontend: if `isError` or all price fields null, render nothing (no empty UI)

---

## Out of Scope

- Pre/after-market data for MarketStrip's macro symbols (SPY, QQQ, etc.) — only the selected symbol
- Historical pre/after-market charting
- Real-time (sub-60s) updates
