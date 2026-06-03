# Mobile Insight Redesign — Design Spec
**Date**: 2026-06-03  
**Status**: Approved

---

## Problem Statement

모바일에서 투자자가 앱을 열었을 때 두 가지 핵심 통증이 있다:
1. **스크롤 과다** — 중요한 정보를 찾으려면 너무 많이 스크롤해야 함
2. **결론 불명확** — 숫자와 지표가 많아서 "지금 어떻게 행동해야 하나"라는 결론이 바로 안 보임

추가로 결정적 버그: MorningBriefingBoard의 `isMobile` 분기(line 722-739)가 모든 풍부한 AI 콘텐츠를 숨기고 제목+공유 텍스트박스만 노출한다.

---

## User Priorities (확인됨)

1. **1순위**: 오늘 시장에 무슨 일이 일어나고 있나? (AI 브리핑 + 매크로)
2. **2순위**: 섹터 로테이션 파악
3. **3순위**: 워치리스트 종목의 진입 거리 + Conviction + Setup Quality + Action Bias
4. **모바일 불필요**: Backtest, Track (DeepDive는 유지)
5. **UX**: 큰 폰트, 직관적, 복잡하지 않게

---

## Architecture

변경 대상 파일 6개:
1. `hooks/useStore.ts` — 기본 board 값 변경
2. `components/shell/BottomTabs.tsx` — 탭 구성 변경
3. `components/boards/MorningBriefingBoard.tsx` — isMobile 분기 제거 + 모바일 카드 재배치 + 히어로 섹션
4. `components/boards/WatchlistBoard.tsx` — 모바일 2줄 카드 뷰 추가
5. `components/boards/OverviewBoard.tsx` — mob-order 재배치
6. `app/globals.css` — 모바일 폰트 상향 + .mob-hero 클래스

---

## Section 1: Navigation

### 하단 탭 순서 변경

| 순서 | 현재 | 변경 후 |
|------|------|---------|
| 1 | 시장 (overview) | 브리핑 (briefing) ← 기본 진입 |
| 2 | 분석 (deepdive) | 시장 (overview) |
| 3 | 매크로 (macro) | 워치 (watchlist) ← 신규 |
| 4 | 심리 (sentiment) | 심리 (sentiment) |
| 5 | 브리핑 (briefing) | 분석 (deepdive) |

- `매크로` 탭 제거 (MacroBoard는 Rail에서 데스크톱 접근 유지)
- `워치리스트` 탭 신규 추가
- `useStore.ts` 기본값: `'overview'` → `'briefing'`

---

## Section 2: MorningBriefingBoard 모바일 재설계

### 핵심 변경: isMobile 분기 제거

현재 `isMobile === true`일 때 전체 콘텐츠를 숨기고 제목+공유 텍스트박스만 렌더링.  
→ **이 early return을 제거**하고 단일 렌더 함수에서 CSS mob-order로 모바일 순서 제어.

### 모바일 카드 순서 (mob-order)

```
order 1: [히어로 카드] AI 결론 — tone 뱃지(대형) + headline(큰 폰트) + 날짜/freshness
order 2: 핵심 요약 (executive_bullets) — bullet 3개
order 3: 섹터 분석 (sector_analysis) — 강세/약세/로테이션 한눈에
order 4: 주목 종목 (spotlight) — 오늘 주시할 종목 + 레벨
order 5: 글로벌 매크로/리스크 (global_context) — mob-collapse 기본 닫힘
order 6: Big Picture Macro — mob-collapse 기본 닫힘
order 7: TIER 1 분석 — mob-collapse 기본 닫힘
order 8: TIER 2 분석 — mob-collapse 기본 닫힘
order 9: 주의사항 (checkpoints) — mob-collapse 기본 닫힘
order 10: 전체 브리핑 복사/공유 (ShareSection) — 항상 열림, 최하단
```

데스크톱은 기존 4열 그리드 레이아웃 유지 (변경 없음).

### 히어로 카드 (.mob-hero)

```
┌──────────────────────────────────────────┐
│  🟢 BULLISH                   Jun 3      │  ← tone badge(대형) + 날짜
│                                          │
│  "오늘 시장은 강세 흐름 지속.            │  ← headline 17px
│   반도체·방산 섹터 주도"                 │
│                                          │
│  ⏱ 2h ago                               │  ← freshness
└──────────────────────────────────────────┘
```

스타일:
- 배경: tone에 따라 `bull-soft` / `bear-soft` / `warn-soft`
- tone 뱃지: `font-size: 16px`, `padding: 6px 14px`
- headline: `font-size: 17px`, `line-height: 1.65`, `font-weight: 600`
- 데스크톱: `display: none` (기존 ai-card가 커버)

### 섹터 카드 모바일 최적화

```
▲ 강세 업종   SMH +3.2%  ITA +1.8%
▼ 약세 업종   XLE -0.9%
↔ 자금 이동   반도체→방산
```

- 각 항목: 심볼 + % 변화를 colored badge로 표시
- font-size 14px, 행간 충분히

---

## Section 3: Watchlist 탭 모바일 뷰

WatchlistBoard에 모바일 전용 2줄 카드 뷰 추가.  
`isMobile` 감지는 CSS 클래스로 처리 (JS matchMedia 사용 안 함).

### 2줄 카드 행 구조

```
┌──────────────────────────────────────────┐
│ NVDA          $134.20    [BUY]  A+       │  ← 1행: 16px bold
│ 진입까지 +2.3%  ████░░  확신도 72 HIGH  │  ← 2행: 14px
└──────────────────────────────────────────┘
```

**1행** (font-size 16px):
- 종목 심볼 (font-weight 700, mono)
- 현재가 (mono)
- Action Bias 뱃지 (bull/bear/warn/neutral)
- Setup Quality (A+/A/B/C colored)

**2행** (font-size 14px):
- 진입까지 거리 (%): 진입 가능(≤5%) → `em-500` 강조색
- Conviction 진행 바 (compact, height 6px)
- 확신도 점수 + ConvictionBadge

**행 배경**:
- 진입 가능(≤5%): `background: var(--em-soft)`
- 돌파(entryDist ≤ 0): `background: var(--bull-soft)`
- 일반: 투명

**모바일 전용 클래스**: `.mob-watchlist-card` (max-width 767px에서만 활성화)

데스크톱은 기존 테이블 레이아웃 유지.

---

## Section 4: OverviewBoard mob-order 재배치

| 카드 | 현재 order | 변경 후 order | 비고 |
|------|-----------|--------------|------|
| AI Insight (ai-card) | 6 | 1 | 최상단으로 |
| Risk Regime | 1 | 2 | |
| Sector Momentum | 3 | 3 | 유지 |
| Entry Radar | 4 | 4 | 유지 |
| Market Breadth | 2 | 5 | |
| VIX | 2 | 5 | Breadth와 같은 order (나란히) |
| Credit Stress | 7 | 7 | mob-collapse 추가 |
| Distribution Days | 7 | 7 | mob-collapse 추가 |
| Earnings Calendar | 7 | 8 | mob-collapse 추가 |
| Conviction Leaderboard | 5 | 8 | mob-collapse 추가 (워치탭에서 커버) |
| Watchlist Top3 | 8 | 8 | mob-collapse 추가 |

---

## Section 5: 모바일 폰트/스타일 상향 (globals.css)

`@media (max-width: 767px)` 블록에 추가:

```css
/* 카드 제목 */
.card__hd h3 { font-size: 15px; }

/* 카드 본문 행 텍스트 */
.card__bd { font-size: 14px; }

/* 뱃지 */
.badge { font-size: 13px; }

/* 히어로 카드 (브리핑 전용) */
.mob-hero {
  padding: 16px;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
}
.mob-hero__tone { font-size: 16px; padding: 6px 14px; }
.mob-hero__headline { font-size: 17px; line-height: 1.65; font-weight: 600; margin: 12px 0 8px; }
.mob-hero__date { font-size: 12px; color: var(--fg-subtle); }

/* 워치리스트 2줄 카드 */
.mob-watchlist-card { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px;
  border-bottom: 1px solid var(--border-soft); }
.mob-watchlist-card__row1 { display: flex; align-items: center; gap: 8px; font-size: 16px; }
.mob-watchlist-card__row2 { display: flex; align-items: center; gap: 8px; font-size: 14px; }
```

데스크톱(min-width: 768px): `.mob-hero { display: none; }`, `.mob-watchlist-card` 숨김.

---

## 공유 섹션 (ShareSection) 모바일 확인

- 현재: `forceOpen` prop으로 항상 열린 상태로 표시 (textarea 340px)
- 변경 후: isMobile early return 제거로 인해 `forceOpen` 없이 `<details>` 형태로 최하단(order 10)에 배치
- 모바일에서 기본 닫힘, 탭 한 번으로 전체 텍스트 확인 후 복사 가능
- `gridColumn: 'span 4'` → 모바일에서는 단일 컬럼이므로 자동 처리됨

---

## Non-Goals

- MacroBoard 자체 변경 없음 (탭에서 제거되어도 Rail로 데스크톱 접근 가능)
- Intraday / Daily / Backtest / Track 변경 없음
- 백엔드/API 변경 없음
- 새 컴포넌트 파일 생성 없음 (기존 파일 내 수정만)
