# Sentiment Trend Chart — Design Spec
Date: 2026-05-28

## Summary

SentimentBoard의 종목 카드 클릭 시 주가 라인 + 심리 composite_score 오버레이 차트를 인라인으로 펼친다. 현재 history는 ~7일치이며, 30일치 축적 후 고도화 여부를 재평가한다.

---

## Architecture

### Backend — 새 엔드포인트

`GET /api/sentiment/history?symbol=TSLA&days=7`

- `history/` 폴더에서 최근 N일 파일(pre_open, post_close) 순회
- 해당 symbol의 `composite_score`, `sentiment`, `as_of`, `slot` 추출
- `symbol=MARKET`이면 `market` 블록에서 추출

**응답**:
```json
{
  "symbol": "TSLA",
  "days": 7,
  "points": [
    {"time": "2026-05-21T14:30:00Z", "score": 0.3, "slot": "pre_open", "sentiment": "optimistic"},
    {"time": "2026-05-21T21:00:00Z", "score": 0.5, "slot": "post_close", "sentiment": "optimistic"}
  ]
}
```

### Backend — 주가 일봉

기존 `/api/ohlcv?symbol=TSLA&tf=1d` 재활용. 수정 없음.

---

## Frontend Components

### `useSentimentHistory(symbol, days)` hook

- React Query, `queryKey: ['sentimentHistory', symbol, days]`
- `staleTime: 5분`, `enabled: !!symbol`

### `SentimentTrendChart` 컴포넌트

```
SentimentTrendChart({ symbol, days, onDaysChange })
  ├── useSentimentHistory(symbol, days)
  ├── useOHLCV(symbol, '1d')          ← 기존 훅 재활용 (또는 직접 fetch)
  └── lightweight-charts 캔버스
```

**차트 구성**:
- 주가: `addLineSeries()`, 좌측 Y축, `var(--fg-muted)` 색상
- 심리: `addLineSeries()`, 우측 Y축 고정 `-2 ~ +2`, compositeColor() 동적 색상
- 슬롯 마커: pre_open(▲), post_close(●)
- 7일/30일 토글 버튼: 차트 우상단
- 30일이나 심리 데이터 없는 구간: 주가만 표시 (심리 라인 끊김)
- 높이: 220px

### `SentimentBoard` 변경

- 로컬 state `expandedSymbol: string | null` 추가
- 카드 클릭: 같은 symbol → collapse, 다른 symbol → expand
- 기존 `setSymbol()` 동작 유지
- 카드 하단에 `{expandedSymbol === it.symbol && <SentimentTrendChart symbol={it.symbol} />}` 삽입

---

## Constraints

- history 파일이 없는 날짜는 해당 포인트 생략 (조용히 처리)
- 30일 심리 데이터는 현재 미존재 → 주가만 표시
- 새 npm 패키지 추가 없음 (lightweight-charts 재활용)
