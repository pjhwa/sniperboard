# Mobile Insight Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일에서 투자자에게 핵심 인사이트(AI 브리핑 → 섹터 → 워치리스트)를 스크롤 없이 명확하게 전달하도록 네비게이션·카드 순서·폰트를 재설계한다.

**Architecture:** 백엔드/API 변경 없이 프론트엔드 6개 파일만 수정. MorningBriefingBoard의 결정적 버그(isMobile early return이 전체 AI 콘텐츠를 숨김)를 제거하고, CSS mob-order 클래스로 모바일 카드 순서를 제어. 워치리스트 탭을 하단 네비에 추가하고, WatchlistBoard에 모바일 전용 2줄 카드 뷰를 추가.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind v4, CSS custom properties, Zustand

---

## File Map

| 파일 | 변경 내용 |
|------|---------|
| `frontend/app/globals.css` | mob-order-9/10 추가, 모바일 폰트 상향, .mob-hero/.mob-watchlist-cards 클래스 |
| `frontend/hooks/useStore.ts` | 기본 board: `'overview'` → `'briefing'` |
| `frontend/components/shell/BottomTabs.tsx` | 탭 순서 변경 + watchlist 탭 추가 |
| `frontend/components/boards/OverviewBoard.tsx` | mob-order 재배치 + 보조 카드에 mob-collapse 추가 |
| `frontend/components/boards/MorningBriefingBoard.tsx` | isMobile 제거 + 히어로 카드 + mob-order 재배치 |
| `frontend/components/boards/WatchlistBoard.tsx` | 모바일 2줄 카드 뷰 추가 |

---

## Task 1: CSS 기반 클래스 추가 (globals.css)

**Files:**
- Modify: `frontend/app/globals.css` (모바일 미디어쿼리 블록, ~line 975)

- [ ] **Step 1: mob-order-9, mob-order-10 추가**

`globals.css`의 `.mob-order-8 { order: 8; }` 바로 다음에 추가:

```css
  .mob-order-9  { order: 9; }
  .mob-order-10 { order: 10; }
```

- [ ] **Step 2: 모바일 폰트 상향 규칙 추가**

`@media (max-width: 767px)` 블록 끝(`.mob-macro-groups` 규칙 다음)에 추가:

```css
  /* ── 모바일 폰트 상향 ─────────────────────────────────────── */
  .card__hd h3 { font-size: 15px; }
  .card__bd { font-size: 14px; }
  .badge { font-size: 13px; }

  /* 카드 내 행 텍스트 (mob-order 섹션들) */
  .board > * { font-size: 14px; }
```

- [ ] **Step 3: .mob-hero 클래스 추가**

동일 블록에 추가:

```css
  /* ── 브리핑 히어로 카드 (모바일 전용) ───────────────────── */
  .mob-hero {
    padding: 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .mob-hero__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .mob-hero__tone {
    font-size: 15px;
    padding: 6px 14px;
  }
  .mob-hero__date {
    font-size: 12px;
    color: var(--fg-subtle);
  }
  .mob-hero__headline {
    font-size: 17px;
    line-height: 1.65;
    font-weight: 600;
    margin: 0 0 8px;
    color: var(--fg);
  }
```

- [ ] **Step 4: .mob-watchlist-cards 클래스 추가**

동일 블록에 추가:

```css
  /* ── 워치리스트 모바일 카드 뷰 ────────────────────────────── */
  .mob-watchlist-cards { display: flex; flex-direction: column; gap: 0; }
  .mob-watchlist-card {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 13px 14px;
    border-bottom: 1px solid var(--border-soft);
  }
  .mob-watchlist-card:last-child { border-bottom: none; }
  .mob-watchlist-card__row1 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
  }
  .mob-watchlist-card__sym {
    font-weight: 700;
    font-family: var(--font-mono);
    min-width: 52px;
  }
  .mob-watchlist-card__price {
    font-family: var(--font-mono);
    flex: 1;
  }
  .mob-watchlist-card__row2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .mob-watchlist-card__dist {
    min-width: 70px;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .mob-watchlist-card__bar {
    flex: 1;
    height: 6px;
    background: var(--bg-subtle);
    border-radius: var(--r-pill);
    overflow: hidden;
  }
  .mob-watchlist-card__bar-fill {
    height: 100%;
    border-radius: var(--r-pill);
    transition: width 0.4s;
  }
```

- [ ] **Step 5: 데스크톱에서 mob-hero 숨김 확인**

`@media (min-width: 768px)` 블록에 이미 `.mob-show { display: none !important; }` 규칙이 있음을 확인. mob-hero는 `mob-show` 클래스와 함께 사용되므로 추가 작업 불필요.

- [ ] **Step 6: 커밋**

```bash
git add frontend/app/globals.css
git commit -m "style: add mob-order-9/10, mob-hero, mob-watchlist-card, mobile font overrides"
```

---

## Task 2: useStore 기본 board 변경

**Files:**
- Modify: `frontend/hooks/useStore.ts:34`

- [ ] **Step 1: 변경 전 확인**

`frontend/hooks/useStore.ts` line 34:
```ts
board: 'overview' as Board,
```

- [ ] **Step 2: briefing으로 변경**

```ts
board: 'briefing' as Board,
```

**주의**: Zustand `persist` 미들웨어가 localStorage `'sniperboard'` 키에 board 값을 저장함. 기존 사용자는 localStorage에 저장된 값이 우선 적용되므로 기본값 변경이 즉시 영향을 주지 않음 — 새 방문자 또는 localStorage 초기화 후 적용됨. 이는 의도된 동작.

- [ ] **Step 3: 커밋**

```bash
git add frontend/hooks/useStore.ts
git commit -m "feat: change default mobile board to briefing"
```

---

## Task 3: BottomTabs 탭 재구성

**Files:**
- Modify: `frontend/components/shell/BottomTabs.tsx`

- [ ] **Step 1: 현재 탭 배열 확인**

`BottomTabs.tsx`의 TABS 배열:
```ts
const TABS = [
  { id: 'overview',  label: { en: 'Overview',  ko: '시장'   }, Icon: Crosshair },
  { id: 'deepdive',  label: { en: 'Analysis',  ko: '분석'   }, Icon: Layers },
  { id: 'macro',     label: { en: 'Macro',     ko: '매크로' }, Icon: Globe },
  { id: 'sentiment', label: { en: 'Sentiment', ko: '심리'   }, Icon: Heart },
  { id: 'briefing',  label: { en: 'Briefing',  ko: '브리핑' }, Icon: Newspaper },
];
```

- [ ] **Step 2: import에 Eye 추가**

파일 상단 import:
```ts
import { Crosshair, Layers, Globe, Heart, Newspaper, Eye } from '@/components/ui/Icons';
```

- [ ] **Step 3: TABS 배열 교체**

```ts
const TABS: { id: Board; label: { en: string; ko: string }; Icon: () => React.ReactElement }[] = [
  { id: 'briefing',  label: { en: 'Briefing', ko: '브리핑' }, Icon: Newspaper },
  { id: 'overview',  label: { en: 'Market',   ko: '시장'   }, Icon: Crosshair },
  { id: 'watchlist', label: { en: 'Watch',    ko: '워치'   }, Icon: Eye },
  { id: 'sentiment', label: { en: 'Sentiment',ko: '심리'   }, Icon: Heart },
  { id: 'deepdive',  label: { en: 'Analysis', ko: '분석'   }, Icon: Layers },
];
```

- [ ] **Step 4: 시각적 확인**

개발 서버 실행 후 모바일 뷰(375px)에서:
- 하단 탭 5개: 브리핑·시장·워치·심리·분석 순서 확인
- 앱 진입 시 브리핑 탭이 활성화(em-500 색상) 확인
- 워치 탭 클릭 시 WatchlistBoard 렌더링 확인

```bash
cd frontend && npm run dev
# 브라우저 개발자도구 → 기기 시뮬레이터 → iPhone 14 (390px)
```

- [ ] **Step 5: 커밋**

```bash
git add frontend/components/shell/BottomTabs.tsx
git commit -m "feat: reorder mobile tabs - briefing first, add watchlist tab, remove macro"
```

---

## Task 4: OverviewBoard mob-order 재배치

**Files:**
- Modify: `frontend/components/boards/OverviewBoard.tsx`

목표 순서 (모바일):
1. AI Insight (현재 mob-order-6 → **mob-order-1**)
2. Risk Regime (현재 mob-order-1 → **mob-order-2**)
3. Sector Momentum (현재 mob-order-3 → **mob-order-3** 유지)
4. Entry Radar (현재 mob-order-4 → **mob-order-4** 유지)
5. Market Breadth + VIX (현재 mob-order-2 → **mob-order-5**)
6. Credit Stress → **mob-order-7 + mob-collapse**
7. Distribution Days → **mob-order-7 + mob-collapse**
8. Earnings Calendar → **mob-order-8 + mob-collapse**
9. Conviction Leaderboard → **mob-order-8 + mob-collapse**
10. Watchlist Top3 → **mob-order-8 + mob-collapse**

- [ ] **Step 1: AI Insight 섹션 mob-order 변경**

AI Insight `<div style={{ gridColumn: 'span 2' }} className="mob-order-6">` 를:
```tsx
<div style={{ gridColumn: 'span 2' }} className="mob-order-1">
```

- [ ] **Step 2: Risk Regime 카드 mob-order 변경**

```tsx
// 변경 전
<Card title={...} ... className="mob-order-1">
// 변경 후
<Card title={...} ... className="mob-order-2">
```

- [ ] **Step 3: Market Breadth mob-order 변경**

```tsx
// 변경 전
<Card title={t(S.mktBreadthTitle, locale)} ... className="mob-order-2">
// 변경 후
<Card title={t(S.mktBreadthTitle, locale)} ... className="mob-order-5">
```

- [ ] **Step 4: VIX mob-order 변경**

```tsx
// 변경 전
<Card title={t(S.vixTitle, locale)} ... className="mob-order-2">
// 변경 후
<Card title={t(S.vixTitle, locale)} ... className="mob-order-5">
```

- [ ] **Step 5: Credit Stress에 mob-collapse 추가**

```tsx
// 변경 전
<Card title={t(S.creditTitle, locale)} action={t(S.creditAction, locale)} ... className="mob-order-7">
  {/* 내용 */}
</Card>

// 변경 후
<details className="mob-collapse mob-order-7" style={{ gridColumn: undefined }}>
  <summary>{t(S.creditTitle, locale)}</summary>
  <div className="mob-collapse-body">
    <Card title={t(S.creditTitle, locale)} action={t(S.creditAction, locale)} ...>
      {/* 기존 내용 유지 */}
    </Card>
  </div>
</details>
```

**주의**: 데스크톱에서는 `details.mob-collapse > summary { display: none; }` CSS가 적용되어 summary가 숨겨지고 Card가 그대로 표시됨.

- [ ] **Step 6: Distribution Days에 mob-collapse 추가**

```tsx
// 변경 전
<Card title="Distribution Days" ... className="mob-order-7">
  {/* 내용 */}
</Card>

// 변경 후
<details className="mob-collapse mob-order-7">
  <summary>Distribution Days</summary>
  <div className="mob-collapse-body">
    <Card title="Distribution Days" ...>
      {/* 기존 내용 유지 */}
    </Card>
  </div>
</details>
```

- [ ] **Step 7: Earnings Calendar에 mob-collapse 추가**

```tsx
// 변경 전
<Card title={t(S.earningsTitle, locale)} ... className="mob-order-7">
  {/* 내용 */}
</Card>

// 변경 후
<details className="mob-collapse mob-order-8">
  <summary>{t(S.earningsTitle, locale)}</summary>
  <div className="mob-collapse-body">
    <Card title={t(S.earningsTitle, locale)} ...>
      {/* 기존 내용 유지 */}
    </Card>
  </div>
</details>
```

- [ ] **Step 8: Conviction Leaderboard에 mob-collapse 추가**

```tsx
// 변경 전
<Card title={t(S.convictionTitle, locale)} ... className="mob-order-5">
  {/* 내용 */}
</Card>

// 변경 후
<details className="mob-collapse mob-order-8">
  <summary>{t(S.convictionTitle, locale)}</summary>
  <div className="mob-collapse-body">
    <Card title={t(S.convictionTitle, locale)} ...>
      {/* 기존 내용 유지 */}
    </Card>
  </div>
</details>
```

- [ ] **Step 9: Watchlist Top3에 mob-collapse 추가**

```tsx
// 변경 전
<Card title={t(S.watchlistTitle, locale)} ... className="mob-order-8">
  {/* 내용 */}
</Card>

// 변경 후
<details className="mob-collapse mob-order-8">
  <summary>{t(S.watchlistTitle, locale)}</summary>
  <div className="mob-collapse-body">
    <Card title={t(S.watchlistTitle, locale)} ...>
      {/* 기존 내용 유지 */}
    </Card>
  </div>
</details>
```

- [ ] **Step 10: 모바일 시각 확인**

개발 서버에서 모바일 뷰 → 시장(Overview) 탭:
- 최상단: AI Insight (접혔다 펼쳐지는 details 형태) 확인
- 2번째: Risk Regime 가이지 확인
- 3번째: Sector Momentum 확인
- 4번째: Entry Radar 확인
- 5번째: Market Breadth + VIX (같은 순서) 확인
- Credit/DD/Earnings/Conviction/Watchlist Top3: 접힌 상태 확인

- [ ] **Step 11: 커밋**

```bash
git add frontend/components/boards/OverviewBoard.tsx
git commit -m "feat: reorder overview board mob-order, collapse secondary cards on mobile"
```

---

## Task 5: MorningBriefingBoard 모바일 재설계 (핵심)

**Files:**
- Modify: `frontend/components/boards/MorningBriefingBoard.tsx`

**변경 요약:**
1. `isMobile` useState + useEffect 제거
2. `if (isMobile) { ... }` early return 블록 제거 (lines ~722-739)
3. 히어로 카드(mob-hero) 신규 추가 — 데스크톱 숨김
4. 각 섹션 wrapper에 mob-order 클래스 추가
5. 보조 섹션을 mob-collapse로 감싸기
6. ShareSection을 mob-order-10으로 최하단 배치

- [ ] **Step 1: isMobile 상태와 useEffect 제거**

제거할 코드 블록 (MorningBriefingBoard 함수 내):
```ts
// 제거
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

`useState` import에서 이 컴포넌트 내 다른 useState 사용 여부 확인 — 없으면 import에서도 제거.

- [ ] **Step 2: isMobile early return 블록 제거**

제거할 코드 블록:
```tsx
// 제거 — if (isMobile) { ... } 전체
if (isMobile) {
  const shareText = buildShareText(d, locale);
  const dateStr = ...
  return (
    <div className="board fade-in" style={{ alignContent: 'start' }}>
      <div className="card" ...>...</div>
      <ShareSection text={shareText} locale={locale} forceOpen />
    </div>
  );
}
```

- [ ] **Step 3: 히어로 카드 추가**

메인 return의 `<div className="board fade-in" ...>` 열린 태그 바로 다음(헤드라인 ai-card 앞)에 삽입:

```tsx
{/* ── 모바일 히어로 카드 (데스크톱에서는 mob-show CSS로 숨김) ── */}
{mood && (
  <div
    className="mob-hero mob-show mob-order-1"
    style={{
      background: mood.traffic_light === 'green'
        ? 'var(--bull-soft)'
        : mood.traffic_light === 'red'
        ? 'var(--bear-soft)'
        : 'var(--warn-soft)',
    }}
  >
    <div className="mob-hero__top">
      <span className={`badge mob-hero__tone ${
        mood.traffic_light === 'green' ? 'bull'
        : mood.traffic_light === 'red' ? 'bear'
        : 'warn'
      }`}>
        {tField(mood.label_en, mood.label_ko, '', locale)}
      </span>
      <span className="mob-hero__date">
        {dateStr}
        {briefingMeta && <AgeBadge minutes={briefingMeta.age_minutes} />}
      </span>
    </div>
    <p className="mob-hero__headline">
      {tField(d.headline_en, d.headline_ko, '', locale)}
    </p>
  </div>
)}
```

- [ ] **Step 4: 헤드라인 ai-card에 mob-hide 추가**

```tsx
// 변경 전
<div style={{ gridColumn: 'span 4' }}>
  <div className="ai-card">...</div>
</div>

// 변경 후
<div style={{ gridColumn: 'span 4' }} className="mob-hide">
  <div className="ai-card">...</div>
</div>
```

- [ ] **Step 5: 핵심 요약(highlights)에 mob-order-2 추가**

```tsx
// 변경 전
<div style={{ gridColumn: 'span 2' }}>
  <Card title={t(S.highlights, locale)}>...</Card>
</div>

// 변경 후
<div style={{ gridColumn: 'span 2' }} className="mob-order-2">
  <Card title={t(S.highlights, locale)}>...</Card>
</div>
```

- [ ] **Step 6: 시장 분위기(mood)에 mob-hide 추가**

모바일에서는 히어로 카드가 mood 정보를 포함하므로 mood 카드는 숨김:

```tsx
// 변경 전
{mood && (
  <div style={{ gridColumn: 'span 2' }}>
    <Card title={t(S.moodTitle, locale)}>...</Card>
  </div>
)}

// 변경 후
{mood && (
  <div style={{ gridColumn: 'span 2' }} className="mob-hide">
    <Card title={t(S.moodTitle, locale)}>...</Card>
  </div>
)}
```

- [ ] **Step 7: 섹터 분석에 mob-order-3 추가**

```tsx
// 변경 전
{sa && (
  <Card title={t(S.sectors, locale)}>...</Card>
)}

// 변경 후
{sa && (
  <div className="mob-order-3">
    <Card title={t(S.sectors, locale)}>
      {/* 기존 내용 유지 — leaders/laggards/rotation */}
      {/* 섹터 행 폰트: 기존 fontSize 12.5 → 14px로 변경 */}
    </Card>
  </div>
)}
```

섹터 카드 내부의 `fontSize: 12.5` → `fontSize: 14`로 변경:
```tsx
// 변경 전
<p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65 }}>
// 변경 후
<p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>
```

- [ ] **Step 8: Spotlight에 mob-order-4 추가**

```tsx
// 변경 전
{d.spotlight.length > 0 && (
  <>
    <SectionDivider label={...} ... />
    <div style={{ gridColumn: 'span 4', ... }}>
      {d.spotlight.map(...)}
    </div>
  </>
)}

// 변경 후
{d.spotlight.length > 0 && (
  <div className="mob-order-4" style={{ gridColumn: 'span 4' }}>
    <SectionDivider label={`⚡ ${t(S.spotlight, locale)}`} color="var(--em-500)" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
      {d.spotlight.map(item => <SpotlightCard key={item.symbol} item={item} locale={locale} />)}
    </div>
  </div>
)}
```

- [ ] **Step 9: 주의사항(checkpoints)를 mob-collapse mob-order-5로 감싸기**

```tsx
// 변경 전
<Card title={t(S.checkpoints, locale)}>
  {/* 내용 */}
</Card>

// 변경 후
<details className="mob-collapse mob-order-5">
  <summary>{t(S.checkpoints, locale)}</summary>
  <div className="mob-collapse-body">
    <Card title={t(S.checkpoints, locale)}>
      {/* 기존 내용 유지 */}
    </Card>
  </div>
</details>
```

- [ ] **Step 10: 글로벌 컨텍스트를 mob-collapse mob-order-6로 감싸기**

```tsx
// 변경 전
{d.global_context && !d.global_context.fallback && (
  <GlobalContextSection ctx={d.global_context} locale={locale} />
)}

// 변경 후
{d.global_context && !d.global_context.fallback && (
  <details className="mob-collapse mob-order-6" style={{ gridColumn: 'span 4' }}>
    <summary>🌐 {locale === 'ko' ? '글로벌 매크로 · 리스크' : 'Global Macro & Risk'}</summary>
    <div className="mob-collapse-body">
      <GlobalContextSection ctx={d.global_context} locale={locale} />
    </div>
  </details>
)}
```

- [ ] **Step 11: Big Picture를 mob-collapse mob-order-7로 감싸기**

```tsx
// 변경 전
{bp && (
  <div style={{ gridColumn: 'span 2' }}>
    <Card title={t(S.bigPicture, locale)}>...</Card>
  </div>
)}

// 변경 후
{bp && (
  <details className="mob-collapse mob-order-7" style={{ gridColumn: 'span 2' }}>
    <summary>{t(S.bigPicture, locale)}</summary>
    <div className="mob-collapse-body">
      <Card title={t(S.bigPicture, locale)}>
        {/* 기존 내용 유지 */}
      </Card>
    </div>
  </details>
)}
```

- [ ] **Step 12: TIER1을 mob-collapse mob-order-8로 감싸기**

```tsx
// 변경 전
<SectionDivider label={t(S.tier1Sec, locale)} color="var(--info)" />
<div style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
  {tier1.map(item => <Tier1Card key={item.symbol} item={item} locale={locale} />)}
</div>

// 변경 후
<details className="mob-collapse mob-order-8" style={{ gridColumn: 'span 4' }}>
  <summary>{t(S.tier1Sec, locale)}</summary>
  <div className="mob-collapse-body">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {tier1.map(item => <Tier1Card key={item.symbol} item={item} locale={locale} />)}
    </div>
  </div>
</details>
```

데스크톱의 `SectionDivider`는 mob-hide 처리:
```tsx
<SectionDivider label={t(S.tier1Sec, locale)} color="var(--info)" className="mob-hide" />
```

SectionDivider가 className prop을 받지 않는다면 `<div className="mob-hide"><SectionDivider ... /></div>`로 감싸기.

- [ ] **Step 13: TIER2를 mob-collapse mob-order-9로 감싸기**

```tsx
// 변경 전
<SectionDivider label={t(S.tier2Sec, locale)} color="var(--purple)" />
<div style={{ gridColumn: 'span 4' }}>
  <div className="card">
    {/* tier2 rows */}
  </div>
</div>

// 변경 후
<details className="mob-collapse mob-order-9" style={{ gridColumn: 'span 4' }}>
  <summary>{t(S.tier2Sec, locale)}</summary>
  <div className="mob-collapse-body">
    <div className="card">
      {/* 기존 tier2 rows 유지 */}
    </div>
  </div>
</details>
```

- [ ] **Step 14: GlossarySection을 모바일에서 숨김**

```tsx
// 변경 전
<GlossarySection locale={locale} />

// 변경 후
<div className="mob-hide" style={{ gridColumn: 'span 4' }}>
  <GlossarySection locale={locale} />
</div>
```

- [ ] **Step 15: ShareSection을 mob-order-10으로 최하단 배치**

```tsx
// 변경 전
<ShareSection text={shareText} locale={locale} />

// 변경 후
<div className="mob-order-10" style={{ gridColumn: 'span 4' }}>
  <ShareSection text={shareText} locale={locale} />
</div>
```

ShareSection은 `forceOpen` 없이 `<details>` 형태로 렌더링됨. 모바일에서 기본 닫힘, 탭으로 열어 복사 가능.

- [ ] **Step 16: 모바일 시각 확인**

개발 서버 → 브리핑 탭 (모바일 뷰):
- 히어로 카드: 톤 배지(대형) + 헤드라인(17px) + 날짜 확인
- 순서: 히어로 → 핵심요약 → 섹터 → Spotlight → (접힌) 주의사항 → (접힌) 글로벌 → (접힌) Big Picture → (접힌) TIER1 → (접힌) TIER2 → 공유
- 데스크톱(768px+): 기존 4열 레이아웃 변화 없음 확인

- [ ] **Step 17: 커밋**

```bash
git add frontend/components/boards/MorningBriefingBoard.tsx
git commit -m "feat: rebuild mobile briefing board - hero card, mob-order reflow, remove isMobile shortcut"
```

---

## Task 6: WatchlistBoard 모바일 2줄 카드 뷰

**Files:**
- Modify: `frontend/components/boards/WatchlistBoard.tsx`

- [ ] **Step 1: useBrief import 추가**

파일 상단에 추가:
```ts
import { useBrief } from '@/hooks/useBrief';
```

- [ ] **Step 2: useBrief 훅 호출 추가**

컴포넌트 함수 내 기존 `useWatchlist()` 아래에:
```ts
const { briefData } = useBrief();
```

- [ ] **Step 3: briefMap 계산 추가**

```ts
const briefMap = new Map(
  (briefData?.symbol_briefs ?? []).map(sb => [sb.symbol, sb])
);
```

- [ ] **Step 4: 모바일 카드 목록 렌더링 추가**

기존 테이블 Card 컴포넌트를 감싸는 부모 div 또는 board div 내에, 테이블 Card 앞에 삽입:

```tsx
{/* ── 모바일 전용: 2줄 카드 뷰 ────────────────────────────── */}
<div className="card mob-show">
  <div className="card__hd">
    <h3>{t(S.tableTitle, locale)}</h3>
    <small>{t(S.tableAction, locale).replace('{n}', String(watchlist.length))}</small>
  </div>
  <div className="card__bd card__bd--flush mob-watchlist-cards">
    {[...watchlist]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map(w => {
        const sb = briefMap.get(w.symbol);
        const entryDist = w.entry > 0 ? (w.entry - w.price) / w.price * 100 : null;
        const inZone = entryDist !== null && entryDist > 0 && entryDist <= 5;
        const broken = entryDist !== null && entryDist <= 0;
        const conviction = w.conviction_score ?? 0;
        const convColor = conviction >= 65 ? 'var(--bull)' : conviction >= 50 ? 'var(--teal)' : conviction >= 35 ? 'var(--warn)' : 'var(--bear)';
        const actionCls = sb?.action_bias === 'buy' ? 'bull' : sb?.action_bias === 'avoid' ? 'bear' : sb?.action_bias === 'hold' ? 'teal' : 'neutral';
        const actionLabel = sb?.action_bias === 'buy' ? (locale === 'ko' ? '매수' : 'BUY')
          : sb?.action_bias === 'avoid' ? (locale === 'ko' ? '회피' : 'AVOID')
          : sb?.action_bias === 'hold' ? (locale === 'ko' ? '보유' : 'HOLD')
          : (locale === 'ko' ? '관망' : 'WATCH');
        const gradeColor = sb?.setup_quality === 'A+' || sb?.setup_quality === 'A' ? 'var(--bull)'
          : sb?.setup_quality === 'B' ? 'var(--teal)'
          : sb?.setup_quality === 'C' ? 'var(--warn)' : 'var(--fg-subtle)';

        return (
          <div
            key={w.symbol}
            className="mob-watchlist-card"
            style={{
              background: broken ? 'var(--bull-soft)' : inZone ? 'var(--em-soft)' : 'transparent',
            }}
          >
            {/* 1행: 심볼 + 가격 + Action Bias + Setup Quality */}
            <div className="mob-watchlist-card__row1">
              <span className="mob-watchlist-card__sym">{w.symbol}</span>
              <span className="mob-watchlist-card__price">${w.price.toFixed(2)}</span>
              {sb && (
                <span className={`badge ${actionCls}`} style={{ fontSize: 13 }}>
                  {actionLabel}
                </span>
              )}
              {sb?.setup_quality && (
                <span style={{ fontWeight: 700, fontSize: 14, color: gradeColor }}>
                  {sb.setup_quality}
                </span>
              )}
            </div>
            {/* 2행: 진입 거리 + Conviction 바 + 점수 */}
            <div className="mob-watchlist-card__row2">
              <span
                className="mob-watchlist-card__dist"
                style={{
                  color: broken ? 'var(--bull)' : inZone ? 'var(--em-500)' : entryDist && entryDist > 15 ? 'var(--fg-subtle)' : 'var(--fg)',
                }}
              >
                {broken
                  ? (locale === 'ko' ? '✓ 돌파' : '✓ Break')
                  : entryDist !== null
                  ? `+${entryDist.toFixed(1)}%`
                  : '—'}
              </span>
              <div className="mob-watchlist-card__bar">
                <div
                  className="mob-watchlist-card__bar-fill"
                  style={{ width: `${conviction}%`, background: convColor }}
                />
              </div>
              <ConvictionBadge score={w.conviction_score ?? undefined} locale={locale} size="sm" />
            </div>
          </div>
        );
      })}
  </div>
</div>
```

- [ ] **Step 5: 기존 데스크톱 테이블에 mob-hide 추가**

WatchlistBoard에서 메인 테이블 Card를 감싸는 최상위 wrapper에 `mob-hide` 클래스 추가. 구조에 따라:

```tsx
// wrapper div가 있는 경우
<div className="mob-hide">
  <Card title={t(S.tableTitle, locale)} ...>
    {/* 기존 테이블 */}
  </Card>
</div>
```

데스크톱에서는 `.mob-hide { display: none !important; }` CSS가 적용되지 않으므로 정상 표시.  
모바일에서는 데스크톱 테이블이 숨겨지고 위에서 추가한 mob-show 카드 뷰가 표시.

- [ ] **Step 6: 모바일 시각 확인**

개발 서버 → 워치 탭 (모바일 뷰):
- 2줄 카드 목록 확인
- 진입 가능(≤5%) 종목: em-soft 배경 확인
- 돌파 종목: bull-soft 배경 + "✓ 돌파" 텍스트 확인
- Action Bias 뱃지, Setup Quality, Conviction 바 확인
- 데스크톱: 기존 테이블 정상 표시 확인

- [ ] **Step 7: 커밋**

```bash
git add frontend/components/boards/WatchlistBoard.tsx
git commit -m "feat: add mobile 2-row watchlist card view with action bias and conviction"
```

---

## Task 7: 최종 통합 검증 및 커밋

- [ ] **Step 1: 전체 모바일 플로우 확인**

개발 서버 → 모바일 뷰(390px):

1. **진입**: 브리핑 탭이 기본 활성화 확인
2. **브리핑 탭**: 히어로 카드(큰 폰트) → 핵심요약 → 섹터 → Spotlight → 접힌 섹션들 → 공유버튼 순서 확인
3. **시장 탭**: AI Insight 최상단 → Risk Regime → Sector → Entry Radar → Breadth/VIX → 접힌 보조 카드들 확인
4. **워치 탭**: 2줄 카드 뷰 목록 확인
5. **공유 섹션**: 브리핑 최하단에서 탭 → 텍스트 확인 → 복사 버튼 동작 확인

- [ ] **Step 2: 데스크톱 회귀 확인**

브라우저 창 너비 1200px로 확대:
1. Rail 표시 확인
2. 브리핑 탭: 4열 그리드 레이아웃 유지 확인 (히어로 카드 숨김, 기존 ai-card 표시)
3. 시장 탭: 기존 그리드 레이아웃 유지 확인
4. 워치 탭: 데스크톱 테이블 표시 확인

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: mobile insight redesign - briefing-first nav, hero card, watchlist tab, font improvements"
```

---

## 구현 시 주의사항

1. **SectionDivider className prop**: SectionDivider 컴포넌트가 className을 받지 않으면 `<div className="mob-hide">` 로 감싸기
2. **mob-collapse 데스크톱 동작**: `@media (min-width: 768px)` 에 `details.mob-collapse > summary { display: none; }` + `details.mob-collapse { display: flex !important; flex-direction: column; }` 이미 존재 — 추가 작업 불필요
3. **briefMap이 빈 경우**: sb가 undefined일 때 Action Bias/Setup Quality 없이도 2줄 구조 동작하도록 조건부 렌더링 처리됨
4. **WatchlistBoard의 정확한 wrapper 구조**: 파일을 읽어 Card와 나머지 카드(RS Score, Heatmap, R:R)의 배치 확인 후 mob-hide 대상 결정
