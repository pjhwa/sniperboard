# Sentiment Trend Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SentimentBoard의 종목 카드 클릭 시 주가 라인 + 심리 composite_score 오버레이 차트를 인라인으로 펼친다.

**Architecture:** 백엔드에 `/api/sentiment/history` 엔드포인트를 추가해 history 파일에서 N일치 심리 포인트를 반환한다. 프론트엔드는 `SentimentTrendChart` 컴포넌트를 `lightweight-charts`로 구현하고, `SentimentBoard`의 종목 카드 클릭 시 expand/collapse로 노출한다. 주가는 기존 `useDaily` 훅을 재사용한다.

**Tech Stack:** Python/FastAPI (backend), Next.js/TypeScript (frontend), lightweight-charts v4, React Query v5, existing DailyChart.tsx pattern

---

## File Map

| 파일 | 변경 |
|------|------|
| `backend/services/sentiment_service.py` | `fetch_sentiment_history()` 추가 |
| `backend/api/schemas.py` | `SentimentHistoryPoint`, `SentimentHistoryResponse` 추가 |
| `backend/api/endpoints.py` | `GET /api/sentiment/history` 엔드포인트 추가 |
| `backend/tests/test_sentiment_service.py` | `TestFetchSentimentHistory` 클래스 추가 |
| `frontend/app/types.ts` | `SentimentHistoryPoint`, `SentimentHistoryData` 인터페이스 추가 |
| `frontend/hooks/useSentimentHistory.ts` | 신규 생성 |
| `frontend/components/boards/SentimentTrendChart.tsx` | 신규 생성 |
| `frontend/components/boards/SentimentBoard.tsx` | expand 상태 + `SentimentTrendChart` 삽입 |

---

## Task 1: Backend — `fetch_sentiment_history()` 함수

**Files:**
- Modify: `backend/services/sentiment_service.py`
- Test: `backend/tests/test_sentiment_service.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_sentiment_service.py` 파일 끝에 추가:

```python
class TestFetchSentimentHistory(unittest.TestCase):
    def _make_snapshot(self, slot: str, as_of: str, sym_score: float, mkt_score: float):
        return {
            "generated_at": as_of,
            "slot": slot,
            "market": {
                "as_of": as_of,
                "sentiment": "neutral",
                "composite_score": mkt_score,
                "sentiment_score": 0,
            },
            "symbols": [
                {
                    "symbol": "TSLA",
                    "as_of": as_of,
                    "sentiment": "optimistic",
                    "composite_score": sym_score,
                    "sentiment_score": 1,
                }
            ],
        }

    def test_returns_points_for_symbol(self):
        pre  = self._make_snapshot("pre_open",  "2026-05-27T14:30:00Z", 0.3, -0.5)
        post = self._make_snapshot("post_close", "2026-05-27T21:00:00Z", 0.8, -0.1)

        def side_effect(url, headers=None, timeout=None):
            if "pre_open" in url:
                return _make_resp(pre)
            if "post_close" in url:
                return _make_resp(post)
            r = MagicMock()
            r.raise_for_status.side_effect = Exception("not found")
            return r

        with patch("requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.fetch_sentiment_history("TSLA", 1)

        self.assertEqual(result["symbol"], "TSLA")
        self.assertEqual(result["days"], 1)
        self.assertEqual(len(result["points"]), 2)
        self.assertEqual(result["points"][0]["slot"], "pre_open")
        self.assertAlmostEqual(result["points"][0]["score"], 0.3)
        self.assertEqual(result["points"][1]["slot"], "post_close")
        self.assertAlmostEqual(result["points"][1]["score"], 0.8)

    def test_returns_market_points(self):
        snap = self._make_snapshot("post_close", "2026-05-27T21:00:00Z", 0.3, -0.5)

        def side_effect(url, headers=None, timeout=None):
            if "post_close" in url:
                return _make_resp(snap)
            r = MagicMock()
            r.raise_for_status.side_effect = Exception("not found")
            return r

        with patch("requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.fetch_sentiment_history("MARKET", 1)

        self.assertEqual(len(result["points"]), 1)
        self.assertAlmostEqual(result["points"][0]["score"], -0.5)

    def test_returns_empty_when_no_env(self):
        env = {k: v for k, v in os.environ.items() if k != "SENTIMENT_DATA_HISTORY_BASE"}
        with patch.dict("os.environ", env, clear=True):
            result = svc.fetch_sentiment_history("TSLA", 7)
        self.assertEqual(result["points"], [])

    def test_skips_missing_symbol(self):
        snap = self._make_snapshot("post_close", "2026-05-27T21:00:00Z", 0.3, -0.5)
        # Remove AAPL from symbols list — AAPL not present
        snap["symbols"] = [s for s in snap["symbols"] if s["symbol"] != "AAPL"]

        def side_effect(url, headers=None, timeout=None):
            if "post_close" in url:
                return _make_resp(snap)
            r = MagicMock()
            r.raise_for_status.side_effect = Exception("not found")
            return r

        with patch("requests.get", side_effect=side_effect):
            with patch.dict("os.environ", {"SENTIMENT_DATA_HISTORY_BASE": "https://example.com/history"}):
                result = svc.fetch_sentiment_history("AAPL", 1)

        self.assertEqual(result["points"], [])
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_sentiment_service.py::TestFetchSentimentHistory -v
```

예상: `AttributeError: module ... has no attribute 'fetch_sentiment_history'`

- [ ] **Step 3: `fetch_sentiment_history()` 구현**

`backend/services/sentiment_service.py` 끝에 추가:

```python
_history_cache: dict[str, Any] = {}
_HISTORY_TTL = 300  # 5분


def fetch_sentiment_history(symbol: str, days: int) -> dict:
    """최근 days일치 pre_open/post_close 심리 포인트를 반환.

    symbol: 종목 코드("TSLA" 등) 또는 "MARKET"
    days: 조회할 일수 (7 또는 30)
    반환: {"symbol": str, "days": int, "points": [{"time", "score", "slot", "sentiment"}]}
    """
    cache_key = f"{symbol}:{days}"
    now = time.monotonic()
    cached = _history_cache.get(cache_key)
    if cached and (now - cached["ts"]) < _HISTORY_TTL:
        return cached["data"]

    history_base = os.environ.get("SENTIMENT_DATA_HISTORY_BASE", "")
    if not history_base:
        return {"symbol": symbol, "days": days, "points": []}

    base = history_base.rstrip("/")
    points: list[dict] = []
    today = datetime.now(timezone.utc).date()

    for day_offset in range(days - 1, -1, -1):
        target_date = today - timedelta(days=day_offset)
        date_str = target_date.strftime("%Y-%m-%d")

        for slot in ("pre_open", "post_close"):
            data = _fetch_json(f"{base}/{date_str}_{slot}.json")
            if data is None and slot == "pre_open":
                # 레거시 포맷 (날짜만, 슬롯 없음)
                data = _fetch_json(f"{base}/{date_str}.json")
            if data is None:
                continue

            if symbol == "MARKET":
                obj: dict | None = data.get("market")
            else:
                obj = next(
                    (s for s in data.get("symbols", []) if s.get("symbol") == symbol),
                    None,
                )

            if obj is None:
                continue

            score = obj.get("composite_score")
            if score is None:
                score = obj.get("sentiment_score")
            if score is None:
                continue

            points.append({
                "time": obj.get("as_of") or data.get("generated_at", date_str),
                "score": round(float(score), 2),
                "slot": data.get("slot", slot),
                "sentiment": obj.get("sentiment", "neutral"),
            })

    result = {"symbol": symbol, "days": days, "points": points}
    _history_cache[cache_key] = {"data": result, "ts": now}
    return result
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_sentiment_service.py::TestFetchSentimentHistory -v
```

예상: `4 passed`

- [ ] **Step 5: 기존 테스트도 통과하는지 확인**

```bash
cd /Users/jerry/dev/sniperboard/backend && python -m pytest tests/test_sentiment_service.py -v
```

예상: 모든 테스트 통과

- [ ] **Step 6: 커밋**

```bash
cd /Users/jerry/dev/sniperboard
git add backend/services/sentiment_service.py backend/tests/test_sentiment_service.py
git commit -m "feat: add fetch_sentiment_history() with N-day history aggregation"
```

---

## Task 2: Backend — Schema + Endpoint

**Files:**
- Modify: `backend/api/schemas.py`
- Modify: `backend/api/endpoints.py`

- [ ] **Step 1: Schema 추가**

`backend/api/schemas.py` 파일에서 마지막 클래스 아래에 추가:

```python
class SentimentHistoryPoint(BaseModel):
    time: str
    score: float
    slot: str
    sentiment: str

class SentimentHistoryResponse(BaseModel):
    symbol: str
    days: int
    points: List[SentimentHistoryPoint]
```

`from typing import List`가 이미 임포트되어 있는지 확인. 없으면 파일 상단에 추가.

- [ ] **Step 2: Endpoint 추가**

`backend/api/endpoints.py`에서 기존 `get_sentiment_endpoint` 함수 아래에 추가:

```python
@router.get("/sentiment/history", response_model=SentimentHistoryResponse)
async def get_sentiment_history_endpoint(
    symbol: str = Query(..., description="종목 코드 또는 MARKET"),
    days: int = Query(7, ge=1, le=30, description="조회 일수 (1-30)"),
):
    """N일치 심리 history 포인트 반환."""
    from services.sentiment_service import fetch_sentiment_history
    try:
        return fetch_sentiment_history(symbol, days)
    except Exception as e:
        logger.error(f"Error in /sentiment/history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="심리 히스토리 조회 중 오류 발생")
```

- [ ] **Step 3: 백엔드 실행 후 수동 확인**

```bash
cd /Users/jerry/dev/sniperboard/backend && python main.py &
curl "http://localhost:5001/api/sentiment/history?symbol=TSLA&days=7" | python3 -m json.tool | head -30
```

예상: `{"symbol": "TSLA", "days": 7, "points": [...]}` — points 배열이 있거나 빈 배열(SENTIMENT_DATA_HISTORY_BASE 미설정 시)

백그라운드 서버 종료: `kill %1`

- [ ] **Step 4: 커밋**

```bash
cd /Users/jerry/dev/sniperboard
git add backend/api/schemas.py backend/api/endpoints.py
git commit -m "feat: add GET /api/sentiment/history endpoint"
```

---

## Task 3: Frontend — Types + Hook

**Files:**
- Modify: `frontend/app/types.ts`
- Create: `frontend/hooks/useSentimentHistory.ts`

- [ ] **Step 1: `types.ts`에 타입 추가**

`frontend/app/types.ts`의 `// --- Sentiment (소셜 심리) ---` 섹션 아래에 추가:

```typescript
export interface SentimentHistoryPoint {
  time: string;        // ISO 8601 타임스탬프
  score: number;       // composite_score (-2 ~ +2)
  slot: string;        // "pre_open" | "post_close"
  sentiment: string;   // "fearful" | "neutral" | "optimistic" 등
}

export interface SentimentHistoryData {
  symbol: string;
  days: number;
  points: SentimentHistoryPoint[];
}
```

- [ ] **Step 2: `useSentimentHistory.ts` 생성**

```typescript
import { useQuery } from '@tanstack/react-query';
import { API_BASE, SentimentHistoryData } from '../app/types';

async function fetchSentimentHistory(symbol: string, days: number): Promise<SentimentHistoryData> {
  const res = await fetch(`${API_BASE}/api/sentiment/history?symbol=${encodeURIComponent(symbol)}&days=${days}`);
  if (!res.ok) throw new Error(`sentiment history fetch error: ${res.status}`);
  return res.json();
}

export function useSentimentHistory(symbol: string | null, days: number) {
  return useQuery<SentimentHistoryData>({
    queryKey: ['sentimentHistory', symbol, days],
    queryFn: () => fetchSentimentHistory(symbol!, days),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/jerry/dev/sniperboard/frontend && npx tsc --noEmit 2>&1 | head -20
```

예상: 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/app/types.ts frontend/hooks/useSentimentHistory.ts
git commit -m "feat: add SentimentHistoryData types and useSentimentHistory hook"
```

---

## Task 4: Frontend — `SentimentTrendChart` 컴포넌트

**Files:**
- Create: `frontend/components/boards/SentimentTrendChart.tsx`

DailyChart.tsx (`frontend/components/charts/DailyChart.tsx`)의 `createChart` 패턴을 그대로 따른다.

- [ ] **Step 1: 컴포넌트 생성**

`frontend/components/boards/SentimentTrendChart.tsx` 신규 생성:

```typescript
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, Time, LineStyle } from 'lightweight-charts';
import { useSentimentHistory } from '@/hooks/useSentimentHistory';
import { useDaily } from '@/hooks/useDaily';

interface Props {
  symbol: string;
}

// compositeColor와 동일한 로직 — SentimentBoard와 색상 통일
function scoreColor(score: number): string {
  if (score >= 1.5) return '#10b981';  // emerald
  if (score >= 0.5) return '#14b8a6';  // teal
  if (score > -0.5) return '#71717a';  // zinc
  if (score > -1.5) return '#f97316';  // orange
  return '#ef4444';                    // red
}

export function SentimentTrendChart({ symbol }: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  const { data: historyData, isLoading: histLoading } = useSentimentHistory(symbol, days);
  const { dailyData, isLoading: priceLoading } = useDaily(symbol);

  const isLoading = histLoading || priceLoading;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (isLoading) return;

    // 기존 차트 정리
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(63,63,70,0.4)' },
        horzLines: { color: 'rgba(63,63,70,0.4)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { visible: true, borderColor: 'rgba(63,63,70,0.6)' },
      leftPriceScale: { visible: true, borderColor: 'rgba(63,63,70,0.6)' },
      timeScale: { timeVisible: true, borderColor: 'rgba(63,63,70,0.6)' },
    });
    chartRef.current = chart;

    // 주가 라인 (좌측 Y축)
    if (dailyData?.candles?.length) {
      const cutoff = days === 7 ? 7 : 30;
      const sliced = dailyData.candles.slice(-cutoff);
      const priceSeries = chart.addLineSeries({
        priceScaleId: 'left',
        color: '#a1a1aa',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: symbol,
      });
      priceSeries.setData(
        sliced.map((c) => ({ time: c.time as Time, value: c.close }))
      );
    }

    // 심리 점수 라인 (우측 Y축 고정 -2 ~ +2)
    if (historyData?.points?.length) {
      const lastScore = historyData.points[historyData.points.length - 1]?.score ?? 0;
      const sentimentSeries = chart.addLineSeries({
        priceScaleId: 'right',
        color: scoreColor(lastScore),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'Score',
      });

      // 데이터 설정
      sentimentSeries.setData(
        historyData.points.map((p) => ({
          time: p.time as Time,
          value: p.score,
        }))
      );

      // pre_open / post_close 마커
      sentimentSeries.setMarkers(
        historyData.points.map((p) => ({
          time: p.time as Time,
          position: 'aboveBar' as const,
          color: scoreColor(p.score),
          shape: p.slot === 'pre_open' ? ('arrowUp' as const) : ('circle' as const),
          size: 0.5,
        }))
      );

      // 중립선 (score=0) — 기준선 표시용 더미 시리즈
      const zeroSeries = chart.addLineSeries({
        priceScaleId: 'right',
        color: 'rgba(113,113,122,0.3)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      });
      const times = historyData.points.map((p) => p.time as Time);
      if (times.length >= 2) {
        zeroSeries.setData([
          { time: times[0], value: 0 },
          { time: times[times.length - 1], value: 0 },
        ]);
      }
    }

    // 반응형 리사이즈
    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [isLoading, historyData, dailyData, days, symbol]);

  return (
    <div style={{ marginTop: 12, padding: '10px 0 0' }}>
      {/* 7일 / 30일 토글 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }}>
        {([7, 30] as const).map((d) => (
          <button
            key={d}
            onClick={(e) => { e.stopPropagation(); setDays(d); }}
            style={{
              fontSize: 10,
              fontWeight: days === d ? 700 : 400,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: days === d ? 'var(--em-500, #6366f1)' : 'var(--border, rgba(63,63,70,0.6))',
              background: days === d ? 'var(--em-soft, rgba(99,102,241,0.1))' : 'transparent',
              color: days === d ? 'var(--em-500, #6366f1)' : 'var(--fg-subtle, #71717a)',
              cursor: 'pointer',
            }}
          >
            {d}일
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 11 }}>
          차트 로딩 중...
        </div>
      ) : (
        <div ref={chartContainerRef} style={{ width: '100%', height: 220 }} />
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: 'var(--fg-subtle)' }}>
        <span>── 주가 (좌축)</span>
        <span style={{ color: '#a78bfa' }}>── 심리점수 (우축 −2~+2)</span>
        <span>▲ pre_open &nbsp; ● post_close</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/jerry/dev/sniperboard/frontend && npx tsc --noEmit 2>&1 | head -20
```

예상: 에러 없음 (lightweight-charts Time 타입 관련 에러 시: `p.time as Time` 캐스팅으로 해결됨)

- [ ] **Step 3: 커밋**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/components/boards/SentimentTrendChart.tsx
git commit -m "feat: add SentimentTrendChart with price+sentiment dual-axis"
```

---

## Task 5: Frontend — SentimentBoard에 expand/collapse 연결

**Files:**
- Modify: `frontend/components/boards/SentimentBoard.tsx`

- [ ] **Step 1: import 추가**

`SentimentBoard.tsx` 상단 import 목록에 추가:

```typescript
import { useState } from 'react';
import { SentimentTrendChart } from './SentimentTrendChart';
```

- [ ] **Step 2: expandedSymbol 상태 추가**

`SentimentBoard` 함수 내부, `const { symbol, setSymbol } = useStore();` 바로 아래에 추가:

```typescript
const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
```

- [ ] **Step 3: 카드 onClick 수정**

현재 종목 카드의 `onClick`:
```typescript
onClick={() => setSymbol(it.symbol)}
```

변경 후:
```typescript
onClick={() => {
  setSymbol(it.symbol);
  setExpandedSymbol(prev => prev === it.symbol ? null : it.symbol);
}}
```

- [ ] **Step 4: 카드 하단에 차트 삽입**

종목 카드 `<div key={it.symbol} ...>` 내부의 마지막 `</div>` 바로 전 (메타 정보 div 아래)에 추가:

```typescript
{expandedSymbol === it.symbol && (
  <SentimentTrendChart symbol={it.symbol} />
)}
```

- [ ] **Step 5: 카드 grid를 단일 컬럼으로 변경 (expand 시 차트 공간 확보)**

현재:
```typescript
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
```

변경 후 (expandedSymbol이 있을 때 단일 컬럼):
```typescript
<div style={{
  display: 'grid',
  gridTemplateColumns: expandedSymbol ? '1fr' : 'repeat(2, 1fr)',
  gap: 10,
  transition: 'grid-template-columns 0.2s ease',
}}>
```

- [ ] **Step 6: TypeScript 컴파일 확인**

```bash
cd /Users/jerry/dev/sniperboard/frontend && npx tsc --noEmit 2>&1 | head -20
```

예상: 에러 없음

- [ ] **Step 7: 커밋**

```bash
cd /Users/jerry/dev/sniperboard
git add frontend/components/boards/SentimentBoard.tsx
git commit -m "feat: expand sentiment card on click to show SentimentTrendChart"
```

---

## Task 6: 통합 확인

- [ ] **Step 1: 백엔드 실행**

```bash
cd /Users/jerry/dev/sniperboard/backend && python main.py
```

- [ ] **Step 2: 프론트엔드 실행 (별도 터미널)**

```bash
cd /Users/jerry/dev/sniperboard/frontend && npm run dev
```

- [ ] **Step 3: 브라우저에서 확인**

1. `http://localhost:3000` 접속
2. SentimentBoard 탭으로 이동
3. 종목 카드(예: TSLA) 클릭 → 차트가 카드 아래 펼쳐지는지 확인
4. "7일" / "30일" 버튼 클릭 → 쿼리 파라미터 변경되는지 확인
5. 같은 카드 다시 클릭 → collapse 확인
6. 다른 카드 클릭 → 이전 카드 collapse + 새 카드 expand 확인

- [ ] **Step 4: SENTIMENT_DATA_HISTORY_BASE 없는 경우 확인**

환경변수 없이 실행 시: 차트에 심리 라인 없이 주가 라인만 보여야 함 (에러 없이 조용히 처리)

- [ ] **Step 5: 최종 커밋 (필요 시)**

이상 없으면 완료. 추가 수정이 있었다면:
```bash
cd /Users/jerry/dev/sniperboard
git add -p
git commit -m "fix: sentiment trend chart integration adjustments"
```
