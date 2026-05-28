# SniperBoard Dashboard Dedup & Redesign Spec
**Date**: 2026-05-28  
**Scope**: 5가지 중복 제거 + 카드 교체 + 컴포넌트 통일

---

## 목표

이전 분석에서 도출된 5가지 개선을 구현한다:
1. DeepDive Zone 0 인트라데이 KPI 추가 (스파크라인 제거)
2. Overview 카드 2개 교체 (종목 종속 → 시장 전체 관점)
3. DeepDive Row 3L 세력 참여도 분석 카드로 교체
4. ConvictionBadge 컴포넌트 통일 (6군데 일관성)
5. DeepDive Zone 0 종목 버튼 패딩 축소

API 변경 없음. 기존 훅 재활용. 신규 파일 1개(`ConvictionBadge.tsx`).

---

## Change 1 — DeepDive Zone 0 재설계

### 현재 상태
```
[종목버튼 6개] | [가격($) + RSI/EMA21 + 스파크라인(180×36) + PRE/POST] | [배지들]
```
스파크라인은 MarketStrip에 이미 있어 순수 중복.

### 변경 후
```
[종목버튼 - 패딩 축소] | [가격($) + PRE/POST + RSI/EMA21] | [KPI 3개] | [배지들]
```

### KPI 3개 상세

**① 1D 변화율**
- 계산: `(dailyData.candles[-1].close - dailyData.candles[-2].close) / dailyData.candles[-2].close * 100`
- 표시: `+1.8%` (bull) / `-2.1%` (bear)
- dailyData 없으면 숨김

**② 일중 위치 (Intraday Range %)**
- 계산: `(lastCandle.close - dayLow) / (dayHigh - dayLow) * 100`
- dayHigh/dayLow: `ohlcvData.candles` 전체의 max(high) / min(low)
- 표시: `68%` + 미니 수평 바 (5px 높이)
- 해석 힌트: ≥70% = "상단 유지", ≤30% = "하단 압박"
- ohlcvData 없으면 숨김

**③ 상대 거래량 (Rel. Vol)**
- 계산: `lastCandle.volume / indicators.vol_avg20[lastIdx]`
- 표시: `1.4×` (color: ≥2.0 = bull, ≥1.0 = fg, <0.5 = fg-muted)
- 라벨: ≥2.0 = "급증", ≥1.2 = "활발", <0.8 = "조용"

### 레이아웃
```tsx
// KPI 3개는 flex row, 각 tile: padding 7px 10px, borderRadius 8, bg card-elev
[1D 변화율 tile] [일중 위치 tile] [Rel.Vol tile]
// 스파크라인 제거 (해당 블록 완전 삭제)
```

---

## Change 2 — Overview 카드 2개 교체

### 제거 카드
- `Symbol Intraday` (선택 종목 단기 차트 — 시장 전체 목적과 불일치)
- `Daily Heat · 60d` (선택 종목 히트맵 — 동일 문제 + DeepDive에 중복)

### 추가 카드 A: Watchlist 진입 레이더

**목적**: "지금 당장 어떤 종목이 진입 가능 구간에 있는가"

**데이터**: `useWatchlist()` — 이미 Overview에서 호출 중. 추가 API 불필요.

**계산**:
```typescript
const entryDist = (w.entry - w.price) / w.price * 100;
// 양수 = 아직 진입가 미달, 음수 = 이미 초과
```

**정렬**: `entryDist` 오름차순 (진입에 가장 가까운 종목이 위)

**각 행 구성**:
```
[종목] [ScorePill] [진입까지 +2.3%] [활성신호배지 있으면]
```

**강조 규칙**:
- `entryDist ≤ 5%`: 행 배경 `var(--em-soft)` + 거리 텍스트 `var(--em-500)`
- `entryDist ≤ 0` (이미 돌파): `badge bull "돌파"` 표시
- `entryDist > 15%`: 거리 텍스트 `var(--fg-subtle)` (흐리게)

**카드 헤더**: `title="진입 레이더"`, `action="Entry 근접순"`

### 추가 카드 B: Conviction 리더보드

**목적**: "같은 Stage2 점수여도 Conviction이 높은 종목이 더 신뢰도 높은 후보"

**데이터**: `useWatchlist()` — `conviction_score`, `conviction_label` 포함.

**정렬**: `conviction_score` 내림차순

**각 행 구성**:
```
[종목] [점수 숫자] [라벨] [가로 바 (conviction_score/100)]
```

**바 색상**:
- ≥65: `var(--bull)`
- ≥50: `var(--teal)`
- ≥35: `var(--warn)`
- <35: `var(--bear)`

**카드 헤더**: `title="Conviction 리더보드"`, `action="확신도 순"`

---

## Change 3 — DeepDive Row 3L: Daily Heat → 세력 참여도 분석

### 현재 상태
`Daily Heat 60d` — Overview와 동일한 코드/데이터 완전 중복.

### 새 카드: 세력 참여도 분석

**데이터**: `dailyData.candles` (252봉 일봉, 각 캔들에 volume 포함). API 변경 없음.

### 계산 로직 (모두 프론트엔드에서 처리)

```typescript
const recent20 = dailyData.candles.slice(-20);
const recent10 = dailyData.candles.slice(-10);
const recent5  = dailyData.candles.slice(-5);

// Up/Down Volume (20일)
const upVol   = recent20.filter(c => c.close >= c.open).reduce((s,c) => s + c.volume, 0);
const downVol = recent20.filter(c => c.close < c.open).reduce((s,c) => s + c.volume, 0);
const udRatio = downVol > 0 ? upVol / downVol : upVol > 0 ? 99 : 1;

// Volume Trend (5일/20일 평균)
const vol20avg = recent20.reduce((s,c) => s + c.volume, 0) / 20;
const vol5avg  = recent5.reduce((s,c) => s + c.volume, 0) / 5;
const volTrendRatio = vol20avg > 0 ? vol5avg / vol20avg : 1;

// Accumulation/Distribution Days (최근 10일, 큰 거래량 기준 = vol > vol20avg)
const accDays  = recent10.filter(c => c.volume > vol20avg && c.close >= c.open).length;
const distDays = recent10.filter(c => c.volume > vol20avg && c.close < c.open).length;

// 종합 세력 점수 (0~100)
const udScore    = Math.min(50, Math.max(0, (udRatio - 0.5) / 1.5 * 50));   // 0~50
const accScore   = Math.min(30, Math.max(0, (accDays - distDays + 5) / 10 * 30)); // 0~30
const trendScore = volTrendRatio < 0.8 ? 20 : volTrendRatio < 1.0 ? 12 : volTrendRatio < 1.3 ? 8 : 4; // 수축이 VCP 선행 신호
const forceScore = Math.round(udScore + accScore + trendScore); // 0~100
```

**세력 점수 라벨**:
- ≥70: `집중 매수` (bull)
- ≥50: `매수 우위` (teal)
- ≥30: `혼조` (warn)
- <30: `분산 매도` (bear)

### 카드 레이아웃 (4섹션)

**섹션 1: 거래량 스파크라인 (20봉)**
- 20개 세로 바, 너비 고정(flex), 높이 = `(volume / maxVol) * 48px`
- 상승일(close ≥ open): `var(--bull)` opacity 0.7
- 하락일: `var(--bear)` opacity 0.7
- 평균선: 점선 수평선 (`vol20avg` 위치)

**섹션 2: 핵심 지표 3개 (그리드 3열)**

| 지표 | 값 | 색상 규칙 |
|------|-----|----------|
| Up/Down Vol | `1.8×` | >1.3=bull, 0.7~1.3=fg, <0.7=bear |
| 거래량 추세 | `▽ 0.72×` | <0.8=bull(수축良), 0.8~1.2=fg, >1.2=warn |
| 세력 집중일 | `4acc / 2dist` | accDays>distDays=bull, 역전=bear |

**섹션 3: 세력 점수 바**
```
세력 점수  [████████░░]  72 · 집중 매수
```
- `div.bar + div.bar__fill` 기존 CSS 클래스 재활용
- 너비: `forceScore%`
- 색상: 점수 기반

**섹션 4: 최근 10일 시각 미니 그리드**
- 10개 칸, 각 14×14px, gap 2px
- `accDays` 해당 일 = bull, `distDays` 해당 일 = bear, 나머지 = border(neutral)
- 왼쪽이 과거, 오른쪽이 최근

---

## Change 4 — ConvictionBadge 컴포넌트 통일

### 신규 파일: `frontend/components/ui/ConvictionBadge.tsx`

```typescript
interface ConvictionBadgeProps {
  score: number | null | undefined;
  label?: string | null;
  size?: 'sm' | 'md';
}
```

**색상 매핑**:
```typescript
function convColor(s: number) {
  if (s >= 65) return { color: 'var(--bull)', bg: 'var(--bull-soft)' };
  if (s >= 50) return { color: 'var(--teal)', bg: 'rgba(20,184,166,0.12)' };
  if (s >= 35) return { color: 'var(--warn)', bg: 'var(--warn-soft)' };
  return { color: 'var(--bear)', bg: 'var(--bear-soft)' };
}
```

**렌더 구조**:
```tsx
<div style={{ display:'inline-flex', alignItems:'center', gap: size==='sm'?4:5,
  padding: size==='sm'?'2px 6px':'3px 9px', borderRadius: 20,
  background: bg, border: `1px solid ${color}` }}>
  <span style={{ fontSize: size==='sm'?11:13, fontWeight:700, color }}>{score}</span>
  {label && <span style={{ fontSize: size==='sm'?9:10, color, opacity:0.75 }}>{label}</span>}
</div>
```

**score=null 처리**: `null | undefined`이면 렌더링 안 함 (컴포넌트가 null 반환)

### 적용 위치 6곳

| 파일 | 현재 코드 패턴 | 교체 |
|------|--------------|------|
| `DeepDiveBoard.tsx` Zone 0 | border circle div + C:{cv} | `<ConvictionBadge score={cv} label={dailyData?.conviction_label} size="md" />` |
| `DeepDiveBoard.tsx` Stage2 헤더 | C:{cv} span + label span | `<ConvictionBadge score={cv} label={...} size="md" />` |
| `DailyBoard.tsx` 차트 헤더 | badge div with bg | `<ConvictionBadge score={s} size="md" />` |
| `DailyBoard.tsx` Stage2 카드 내부 | background box div | `<ConvictionBadge score={s} label={dailyData.conviction_label} size="md" />` |
| `WatchlistBoard.tsx` 테이블 td | inline-flex div | `<ConvictionBadge score={w.conviction_score} label={w.conviction_label} size="sm" />` |
| `OverviewBoard.tsx` Watchlist Top 3 | plain 텍스트 C:{score} | `<ConvictionBadge score={w.conviction_score} size="sm" />` |

---

## Change 5 — DeepDive Zone 0 버튼 패딩 축소

```tsx
// 변경 전
padding: '5px 13px', fontSize: 12

// 변경 후
padding: '4px 9px', fontSize: 11.5
```

버튼 기능 (종목 전환 + `setShowSentTrend(false)`) 유지.
공간 절약 ~30px → KPI 영역 여유 확보.

---

## 파일 변경 목록

| 파일 | 변경 유형 | 관련 Change |
|------|----------|------------|
| `frontend/components/ui/ConvictionBadge.tsx` | **신규 생성** | #4 |
| `frontend/components/boards/DeepDiveBoard.tsx` | 수정 | #1, #3, #4, #5 |
| `frontend/components/boards/OverviewBoard.tsx` | 수정 | #2, #4 |
| `frontend/components/boards/DailyBoard.tsx` | 수정 | #4 |
| `frontend/components/boards/WatchlistBoard.tsx` | 수정 | #4 |

API, 백엔드, 훅, 타입 변경 없음.

---

## 구현 순서 (의존성 기준)

1. `ConvictionBadge.tsx` 생성 (다른 모든 파일이 의존)
2. `WatchlistBoard.tsx` 적용 (단순 교체, 의존 없음)
3. `DailyBoard.tsx` 적용 (단순 교체)
4. `OverviewBoard.tsx` 수정 (카드 교체 + ConvictionBadge)
5. `DeepDiveBoard.tsx` 수정 (Zone 0 + Row 3L + ConvictionBadge + 버튼)
