# SniperBoard i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add English/Korean language toggle to SniperBoard — Topbar EN/KO button, Zustand locale state, all UI strings bilingual, backend schemas accept bilingual data from market-sentiment-data v2.0.

**Architecture:** No i18n library. `BiLang` interface (`{ en: string; ko: string }`) in `i18n.ts`. `t(obj, locale)` helper resolves the right language. Zustand `locale` persisted via existing `persist` middleware. Backend schemas add `Optional` bilingual fields alongside legacy fields for backward compat with v1.x history files. Default locale is `'ko'` so existing users see no change until they toggle.

**Tech Stack:** Next.js, React 19, Zustand 5, TypeScript, Tailwind v4, FastAPI/Pydantic v2

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/app/i18n.ts` | Create | `Locale` type, `BiLang` interface, `t()` helper |
| `frontend/hooks/useStore.ts` | Modify | Add `locale: Locale` + `setLocale` to Zustand store |
| `frontend/app/types.ts` | Modify | `REGIME_META`, `DD_META`, `SIGNAL_META`, `STAGE2_META`, `SENTIMENT_META`, `TREND_META`, `VOLUME_META` → BiLang labels/descs; add bilingual fields to `TopNews`, `SymbolSentiment`, `MarketSentiment`, `MarketBrief`, `SymbolBrief` |
| `frontend/app/glossary.ts` | Modify | All 28 entries: `term` and `body` become `BiLang` |
| `frontend/components/shell/Topbar.tsx` | Modify | Add EN/KO toggle button; use locale for board label display |
| `frontend/components/shell/BottomTabs.tsx` | Modify | Tab labels use `BiLang` |
| `frontend/components/shell/MarketStrip.tsx` | Modify | Tooltip strings use `BiLang`; guide button label |
| `frontend/components/shell/CommandPalette.tsx` | Modify | Nav `sub` strings, placeholder, glossary mode banner |
| `frontend/components/boards/OverviewBoard.tsx` | Modify | Card titles, section headers, AI data field access |
| `frontend/components/boards/DeepDiveBoard.tsx` | Modify | Row/section labels, AI data field access |
| `frontend/components/boards/IntradayBoard.tsx` | Modify | Section labels, signal info strings |
| `frontend/components/boards/DailyBoard.tsx` | Modify | Section labels |
| `frontend/components/boards/MacroBoard.tsx` | Modify | Group labels, macro insight text |
| `frontend/components/boards/SentimentBoard.tsx` | Modify | Section headers, metadata labels |
| `frontend/components/boards/WatchlistBoard.tsx` | Modify | Column headers |
| `backend/api/schemas.py` | Modify | `TopNews`, `SymbolSentiment`, `MarketSentiment`, `MarketBrief`, `SymbolBrief` — add `Optional` bilingual fields |
| `README.md` | Modify | Rewrite in English |
| `README.ko.md` | Create | Korean (current README content) |
| `PROJECT_CONTEXT.md` | Modify | Rewrite in English |
| `PROJECT_CONTEXT.ko.md` | Create | Korean (current content) |
| `CLAUDE.md` | Modify | Rewrite in English |
| `CLAUDE.ko.md` | Create | Korean (current content) |

---

## Task 1: Backend schemas — add bilingual Optional fields

**Files:**
- Modify: `backend/api/schemas.py`

- [ ] **Step 1: Update `TopNews` model to support v2.0 bilingual fields**

In `backend/api/schemas.py`, replace:
```python
class TopNews(BaseModel):
    headline: str
    summary: str
    source: str
```
With:
```python
class TopNews(BaseModel):
    # v2.0 bilingual fields
    headline_en: Optional[str] = None
    headline_ko: Optional[str] = None
    summary_en: Optional[str] = None
    summary_ko: Optional[str] = None
    # v1.x backward compat (history files still use these)
    headline: Optional[str] = None
    summary: Optional[str] = None
    source: str
```

- [ ] **Step 2: Update `SymbolSentiment` to add bilingual key_reason**

In `SymbolSentiment`, replace:
```python
    key_reason: str
```
With:
```python
    key_reason_en: Optional[str] = None
    key_reason_ko: Optional[str] = None
    key_reason: Optional[str] = None  # v1.x compat
```

- [ ] **Step 3: Update `MarketSentiment` to add bilingual key_reason**

In `MarketSentiment`, replace:
```python
    key_reason: str
```
With:
```python
    key_reason_en: Optional[str] = None
    key_reason_ko: Optional[str] = None
    key_reason: Optional[str] = None  # v1.x compat
```

- [ ] **Step 4: Update `MarketBrief` to add bilingual fields**

Replace:
```python
class MarketBrief(BaseModel):
    summary: str
    tone: str  # "bullish" | "cautious" | "bearish" | "neutral"
    key_themes: List[str]
    watch_points: str
```
With:
```python
class MarketBrief(BaseModel):
    # v2.0
    summary_en: Optional[str] = None
    summary_ko: Optional[str] = None
    key_themes_en: Optional[List[str]] = None
    key_themes_ko: Optional[List[str]] = None
    watch_points_en: Optional[str] = None
    watch_points_ko: Optional[str] = None
    # v1.x compat
    summary: Optional[str] = None
    key_themes: Optional[List[str]] = None
    watch_points: Optional[str] = None
    tone: str
```

- [ ] **Step 5: Update `SymbolBrief` to add bilingual fields**

Replace:
```python
class SymbolBrief(BaseModel):
    symbol: str
    setup_quality: str  # "A+" | "A" | "B" | "C" | "D"
    brief: str
    key_risk: str
    key_opportunity: str
    action_bias: str  # "buy" | "hold" | "watch" | "avoid"
```
With:
```python
class SymbolBrief(BaseModel):
    symbol: str
    setup_quality: str
    # v2.0
    brief_en: Optional[str] = None
    brief_ko: Optional[str] = None
    key_risk_en: Optional[str] = None
    key_risk_ko: Optional[str] = None
    key_opportunity_en: Optional[str] = None
    key_opportunity_ko: Optional[str] = None
    # v1.x compat
    brief: Optional[str] = None
    key_risk: Optional[str] = None
    key_opportunity: Optional[str] = None
    action_bias: str
```

- [ ] **Step 6: Verify backend tests still pass**

```bash
cd ~/dev/sniperboard/backend
python -m pytest tests/ -v --tb=short
```
Expected: All existing tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/api/schemas.py
git commit -m "feat(backend): add Optional bilingual fields to sentiment/brief schemas (v2.0 compat)"
```

---

## Task 2: Create `frontend/app/i18n.ts`

**Files:**
- Create: `frontend/app/i18n.ts`

- [ ] **Step 1: Create the i18n module**

Create `frontend/app/i18n.ts` with:

```typescript
export type Locale = 'en' | 'ko'

export interface BiLang {
  en: string
  ko: string
}

export const t = (obj: BiLang, locale: Locale): string => obj[locale]

// Helper for AI data fields that may be v2.0 (has _en/_ko) or v1.x (single field)
export const tField = (
  enVal: string | null | undefined,
  koVal: string | null | undefined,
  fallback: string | null | undefined,
  locale: Locale,
): string => {
  if (locale === 'en') return enVal ?? fallback ?? ''
  return koVal ?? fallback ?? ''
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors from `i18n.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/i18n.ts
git commit -m "feat(frontend): add i18n.ts — Locale type, BiLang interface, t() helper"
```

---

## Task 3: Add `locale` to Zustand store

**Files:**
- Modify: `frontend/hooks/useStore.ts`

- [ ] **Step 1: Update `useStore.ts` to add locale state**

Replace the entire content of `frontend/hooks/useStore.ts` with:

```typescript
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/app/i18n';

export type Board = 'overview' | 'intraday' | 'daily' | 'watchlist' | 'macro' | 'sentiment' | 'deepdive';
export type Theme = 'dark' | 'light';

interface StoreState {
  symbol: string;
  timeframe: string;
  board: Board;
  theme: Theme;
  locale: Locale;
  cmdOpen: boolean;
  rrAccount: string;
  rrRiskPct: string;
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  setBoard: (board: Board) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setCmdOpen: (open: boolean) => void;
  setRrAccount: (val: string) => void;
  setRrRiskPct: (val: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      symbol: 'TSLA',
      timeframe: '5m',
      board: 'overview' as Board,
      theme: 'dark' as Theme,
      locale: 'ko' as Locale,
      cmdOpen: false,
      rrAccount: '100000',
      rrRiskPct: '1',
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setBoard: (board) => set({ board }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setCmdOpen: (cmdOpen) => set({ cmdOpen }),
      setRrAccount: (rrAccount) => set({ rrAccount }),
      setRrRiskPct: (rrRiskPct) => set({ rrRiskPct }),
    }),
    {
      name: 'sniperboard',
    }
  )
);

// backward compat alias
export const useDashboardStore = useStore;
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | head -20
```
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/useStore.ts
git commit -m "feat(store): add locale: Locale to Zustand store (default 'ko')"
```

---

## Task 4: Convert `types.ts` metadata constants to BiLang

**Files:**
- Modify: `frontend/app/types.ts`

- [ ] **Step 1: Add BiLang import and update TopNews, SymbolSentiment, MarketSentiment, MarketBrief, SymbolBrief interfaces**

At the top of `frontend/app/types.ts`, add:
```typescript
import type { BiLang } from './i18n'
```

Update `TopNews`:
```typescript
export interface TopNews {
  headline_en?: string
  headline_ko?: string
  summary_en?: string
  summary_ko?: string
  // v1.x compat
  headline?: string
  summary?: string
  source: string
}
```

Update `SymbolSentiment` — change `key_reason: string` to:
```typescript
  key_reason_en?: string
  key_reason_ko?: string
  key_reason?: string  // v1.x compat
```

Update `MarketSentiment` — same change as SymbolSentiment for key_reason.

Update `MarketBrief`:
```typescript
export interface MarketBrief {
  // v2.0
  summary_en?: string
  summary_ko?: string
  key_themes_en?: string[]
  key_themes_ko?: string[]
  watch_points_en?: string
  watch_points_ko?: string
  // v1.x compat
  summary?: string
  key_themes?: string[]
  watch_points?: string
  tone: 'bullish' | 'cautious' | 'bearish' | 'neutral'
}
```

Update `SymbolBrief`:
```typescript
export interface SymbolBrief {
  symbol: string
  setup_quality: 'A+' | 'A' | 'B' | 'C' | 'D'
  // v2.0
  brief_en?: string
  brief_ko?: string
  key_risk_en?: string
  key_risk_ko?: string
  key_opportunity_en?: string
  key_opportunity_ko?: string
  // v1.x compat
  brief?: string
  key_risk?: string
  key_opportunity?: string
  action_bias: 'buy' | 'hold' | 'watch' | 'avoid'
}
```

- [ ] **Step 2: Convert `REGIME_META` to BiLang**

Replace the `REGIME_META` constant:
```typescript
export const REGIME_META: Record<RegimeData['regime'], { label: BiLang; color: string; bg: string; desc: BiLang }> = {
  RISK_ON: {
    label: { en: 'Risk-On', ko: '강세' },
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: { en: 'Macro environment is bullish. Trend-following strategies effective.', ko: '매크로 환경이 강세. 추세 추종 전략 유효.' },
  },
  CONSTRUCTIVE: {
    label: { en: 'Constructive', ko: '우호적' },
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
    desc: { en: 'Generally healthy environment. Selective entry possible.', ko: '대체로 건전한 환경. 선별적 진입 가능.' },
  },
  MIXED: {
    label: { en: 'Mixed', ko: '혼조' },
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    desc: { en: 'Mixed signals. Reduce position size.', ko: '신호가 혼재. 포지션 사이즈 축소 권장.' },
  },
  DEFENSIVE: {
    label: { en: 'Defensive', ko: '방어적' },
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    desc: { en: 'Bearish signals dominant. Increase cash position.', ko: '약세 신호 우세. 현금 비중 늘리기.' },
  },
  RISK_OFF: {
    label: { en: 'Risk-Off', ko: '약세' },
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    desc: { en: 'Risk-off. Avoid new buys, hold defensive positions.', ko: '리스크 오프. 신규 매수 자제, 방어 포지션.' },
  },
  UNKNOWN: {
    label: { en: 'Unknown', ko: '불명' },
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/60 border-zinc-700/40',
    desc: { en: 'Insufficient data to determine regime.', ko: '데이터 부족으로 판단 불가.' },
  },
};
```

- [ ] **Step 3: Convert `DD_META` to BiLang**

Replace `DD_META`:
```typescript
export const DD_META: Record<DDDetail['level'], { label: BiLang; color: string; bg: string; desc: BiLang }> = {
  OK: {
    label: { en: 'Normal (0-3d)', ko: '정상 (0~3일)' },
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: { en: 'Low institutional selling pressure. Trend intact.', ko: '기관 분배 압력 낮음. 추세 진행 중.' },
  },
  WARNING: {
    label: { en: 'Caution (4-5d)', ko: '경계 (4~5일)' },
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    desc: { en: 'Institutions selling. Be cautious with new entries.', ko: '기관이 매도 중. 신규 진입 신중.' },
  },
  DANGER: {
    label: { en: 'Danger (6d+)', ko: '위험 (6일+)' },
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    desc: { en: "O'Neil: Market top likely. Consider reducing positions.", ko: "O'Neil: 시장 상단 임박. 포지션 축소 고려." },
  },
};
```

- [ ] **Step 4: Convert `SIGNAL_META` to BiLang**

Replace `SIGNAL_META`:
```typescript
export const SIGNAL_META: Record<string, { label: string; color: string; bg: string; action: BiLang; desc: BiLang }> = {
  sniper: {
    label: 'Sniper',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    action: { en: 'Entry', ko: '진입' },
    desc: { en: '21EMA touch within 0.4% then bounce — RSI 38-58, volume surge', ko: '21EMA 0.4% 이내 터치 후 반등 — RSI 38~58 구간, 거래량 급증' },
  },
  vcp: {
    label: 'VCP',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    action: { en: 'Breakout Entry', ko: '돌파진입' },
    desc: { en: '30-candle high breakout + 2x volume + ATR contraction — institutional accumulation', ko: '30캔들 신고가 갱신 + 거래량 2배 + ATR 축소 — 기관 매집 돌파' },
  },
  pullback: {
    label: 'Pullback',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    action: { en: 'Pullback Entry', ko: '눌림 진입' },
    desc: { en: '4.5-9% correction from high then EMA support + MACD reversal', ko: '고점 대비 4.5~9% 조정 후 EMA 지지 + MACD 전환 — 꿀통 눌림목' },
  },
  strong_trend: {
    label: 'StrongTrend',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
    action: { en: 'Hold', ko: '홀딩' },
    desc: { en: 'Price > 21EMA > 50EMA, EMA slope +0.15%, RSI 52-78 — trend acceleration', ko: '가격 > 21EMA > 50EMA, EMA 기울기 +0.15%, RSI 52~78 — 추세 가속' },
  },
  overbought: {
    label: 'Overbought',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    action: { en: 'Partial Exit', ko: '분할 익절' },
    desc: { en: 'RSI ≥ 76, 21EMA deviation +3.2%, 4 of 5 candles bullish — near-term peak warning', ko: 'RSI ≥ 76, 21EMA 이격 +3.2%, 5캔들 중 4양봉 — 단기 고점 주의' },
  },
  downtrend: {
    label: 'Downtrend',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    action: { en: 'Avoid', ko: '접근 금지' },
    desc: { en: 'Price < 21EMA, negative EMA slope, volume surge — falling knife', ko: '가격 < 21EMA, EMA 음의 기울기, 거래량 급증 — 떨어지는 칼날' },
  },
};
```

- [ ] **Step 5: Convert `STAGE2_META` to BiLang**

Replace `STAGE2_META`:
```typescript
export const STAGE2_META: Record<keyof Stage2Checks, { label: string; desc: BiLang }> = {
  price_above_emas:   { label: 'Price > EMA21 > EMA50 > EMA200', desc: { en: 'Price above all moving averages', ko: '가격이 모든 이평선 위에 위치' } },
  ema200_rising:      { label: 'EMA200 Rising',                   desc: { en: 'EMA200 slope positive (uptrend)', ko: 'EMA200 기울기 양수 (추세 상승)' } },
  near_52w_high:      { label: '52w High -25%',                   desc: { en: 'Within 25% of 52-week high', ko: '52주 신고가 대비 조정 폭 제한' } },
  above_52w_low:      { label: '52w Low +30%',                    desc: { en: 'At least 30% above 52-week low', ko: '52주 신저가 대비 충분한 반등' } },
  pullback_shallow:   { label: 'Correction < 15%',                desc: { en: 'Recent pullback within 15% of 20-day high', ko: '20일 고점 대비 조정이 얕음' } },
  rs_strong:          { label: 'RS Score ≥ 50 (vs SPY)',          desc: { en: '63-day return outperforming SPY', ko: '63일 수익률 SPY 대비 우위' } },
  volume_contracting: { label: 'Volume Contracting',              desc: { en: '5-day avg < 20-day avg (confirming pullback)', ko: '5일 평균 < 20일 평균 (눌림 확인)' } },
};
```

- [ ] **Step 6: Convert `SENTIMENT_META`, `TREND_META`, `VOLUME_META` to BiLang**

Replace:
```typescript
export const SENTIMENT_META: Record<SentimentEnum, { label: BiLang; color: string; bg: string; score: number }> = {
  very_fearful: { label: { en: 'Extreme Fear', ko: '극도 공포' }, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         score: -2 },
  fearful:      { label: { en: 'Fear',         ko: '공포'     }, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   score: -1 },
  neutral:      { label: { en: 'Neutral',      ko: '중립'     }, color: 'text-zinc-400',    bg: 'bg-zinc-700/30 border-zinc-600/30',       score:  0 },
  optimistic:   { label: { en: 'Optimistic',   ko: '낙관'     }, color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/30',       score:  1 },
  euphoric:     { label: { en: 'Euphoric',     ko: '도취'     }, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', score:  2 },
};

export const TREND_META: Record<TrendEnum, { icon: string; label: BiLang; color: string }> = {
  heating: { icon: '↑', label: { en: 'Rising',   ko: '상승 중' }, color: 'text-emerald-400' },
  stable:  { icon: '→', label: { en: 'Stable',   ko: '유지'    }, color: 'text-zinc-400'    },
  cooling: { icon: '↓', label: { en: 'Cooling',  ko: '냉각 중' }, color: 'text-red-400'     },
};

export const VOLUME_META: Record<VolumeEnum, { label: BiLang; color: string }> = {
  low:      { label: { en: 'Low',      ko: '낮음' }, color: 'text-zinc-500'   },
  normal:   { label: { en: 'Normal',   ko: '보통' }, color: 'text-zinc-400'   },
  elevated: { label: { en: 'Elevated', ko: '높음' }, color: 'text-yellow-400' },
  surging:  { label: { en: 'Surging',  ko: '급증' }, color: 'text-orange-400' },
};
```

- [ ] **Step 7: Verify TypeScript compiles with no errors**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | head -40
```
Expected: Compilation errors for components using `label` as `string` (they now receive `BiLang`). List all affected files — they will be fixed in Tasks 6-9.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/types.ts
git commit -m "feat(types): convert metadata constants to BiLang (REGIME_META, DD_META, SIGNAL_META, STAGE2_META, SENTIMENT_META)"
```

---

## Task 5: Convert `glossary.ts` to BiLang

**Files:**
- Modify: `frontend/app/glossary.ts`

- [ ] **Step 1: Replace the entire content of `frontend/app/glossary.ts`**

```typescript
import type { BiLang } from './i18n'

export interface GlossaryEntry {
  key: string
  term: BiLang
  body: BiLang
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Market / Regime ──────────────────────────────────────────
  {
    key: 'risk_regime',
    term: { en: 'Risk Regime', ko: 'Risk Regime (리스크 레짐)' },
    body: {
      en: 'A composite score (0-100) summarizing how favorable the market environment is for investing, based on 5 factors: trend (SPY vs EMA200), breadth (RSP vs SPY 60d), credit (HYG/IEF ratio change), volatility (VIX level), and momentum (S&P500 20d direction). Higher = more bullish environment.',
      ko: '시장이 지금 얼마나 투자하기 좋은 환경인지를 5가지 요소(추세·시장폭·신용·변동성·모멘텀)로 종합한 점수입니다. SPY EMA200 위치, RSP vs SPY 60일 격차, HYG/IEF 비율 변화, VIX 레벨, S&P500 20일 방향을 각각 채점해 합산하며, 100에 가까울수록 강세 환경입니다.',
    },
  },
  {
    key: 'breadth',
    term: { en: 'Market Breadth', ko: 'Breadth (시장 폭)' },
    body: {
      en: 'Measures whether the rally is broad (many stocks rising) or narrow (only a few large caps). RSP (equal-weight S&P500 ETF) outperforming SPY (market-cap weighted) signals a healthy market. The reverse signals fragile, mega-cap-dependent conditions.',
      ko: '소수 대형주만 오르는지, 많은 종목이 함께 오르는지를 봅니다. RSP(S&P500 동일가중 ETF)가 SPY(시가총액 비례)보다 강하면 건강한 장세, 약하면 대형주 소수에 의존하는 취약한 장세입니다.',
    },
  },
  {
    key: 'credit',
    term: { en: 'Credit Stress', ko: 'Credit Stress (신용 스트레스)' },
    body: {
      en: 'Measures corporate bond market health. HYG (high-yield ETF) outperforming IEF (treasury ETF) signals risk appetite; the reverse signals fear. Calculated from 30-day HYG/IEF ratio change.',
      ko: '회사채 시장의 건전성을 봅니다. HYG(고수익 채권 ETF)가 IEF(미국 국채 ETF)보다 강하면 위험 선호 신호, 반대면 공포 신호입니다. 30일 HYG/IEF 비율 변화로 계산합니다.',
    },
  },
  {
    key: 'volatility',
    term: { en: 'Volatility · VIX', ko: 'Volatility (변동성 · VIX)' },
    body: {
      en: 'The fear index measuring expected S&P500 volatility over the next 30 days. Below 14 = calm, around 20 = caution, above 30 = fear. Lower is better for entering positions.',
      ko: '향후 30일 S&P500의 예상 변동성을 나타내는 공포 지수입니다. 14 이하면 안정적, 20 전후면 경계, 30 이상이면 공포 국면입니다. 낮을수록 매수하기 좋은 환경입니다.',
    },
  },
  {
    key: 'vix_backwardation',
    term: { en: 'VIX Backwardation', ko: 'VIX 백워데이션' },
    body: {
      en: 'When VIX9D (9-day short-term volatility) exceeds VIX (30-day). Normal (contango) has longer-term VIX higher. Inversion means the market is more fearful right now than expected — a warning signal for near-term event risk.',
      ko: 'VIX9D(9일 단기 변동성)가 VIX(30일)보다 높아진 역전 상태입니다. 정상(콘탱고)은 장기 VIX가 더 높은데, 역전되면 지금 당장 시장이 더 불안하다는 경고 신호입니다.',
    },
  },
  {
    key: 'distribution_days',
    term: { en: 'Distribution Days', ko: 'Distribution Days (분산일)' },
    body: {
      en: 'Count of days in the past 25 trading days where institutional investors sold heavily (S&P500/Nasdaq down + volume up). 4-5 days = caution; 6+ days = likely market top, avoid new entries.',
      ko: '최근 25거래일 내 기관 투자자들이 대량 매도한 날의 수입니다. 4~5일이면 경계, 6일 이상이면 시장 상단 가능성이 높아 신규 진입을 자제해야 합니다.',
    },
  },
  {
    key: 'market_breadth_spy_rsp',
    term: { en: 'Market Breadth · SPY vs RSP', ko: 'Market Breadth · SPY vs RSP' },
    body: {
      en: 'SPY weights by market cap (large caps dominate); RSP weights all 500 stocks equally. RSP underperforming SPY warns that only a few mega-caps are carrying the index — an unhealthy rally.',
      ko: 'SPY는 시가총액 비례 지수(대형주 영향 큼), RSP는 모든 종목을 동일 비중으로 구성한 지수입니다. RSP가 SPY보다 약하면 소수 대형주만 시장을 끌고 있다는 경고입니다.',
    },
  },
  {
    key: 'sector_momentum',
    term: { en: 'Sector Momentum', ko: 'Sector Momentum (섹터 모멘텀)' },
    body: {
      en: '5-day return rankings for 5 theme ETFs (SMH semiconductors, XLY consumer discretionary, ITA defense, XLE energy, XHB homebuilders). Money flows into top-ranked sectors — focus on stocks within leading sectors. ↑EMA means above 21-day moving average.',
      ko: '5개 테마 ETF(SMH 반도체, XLY 소비재, ITA 방산, XLE 에너지, XHB 홈빌더)의 최근 5일 수익률 순위입니다. 상위 섹터에 돈이 몰리고 있으므로 강세 섹터 내 종목에 집중하는 것이 유리합니다.',
    },
  },
  // ── Stage 2 / Technical ───────────────────────────────────────
  {
    key: 'stage2',
    term: { en: 'Stage 2 Score (0-7)', ko: 'Stage 2 점수 (0~7)' },
    body: {
      en: "Count of Minervini's 7 ideal buy-zone conditions met: ①Price>EMA21>50>200 ②EMA200 rising ③Within 25% of 52w high ④30%+ above 52w low ⑤Recent correction <15% ⑥RS Score≥50 ⑦Volume contracting. Score 6-7: consider entry. 4-5: watch. ≤3: avoid.",
      ko: 'Minervini가 정의한 이상적인 매수 구간 조건 7가지를 충족한 개수입니다. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피.',
    },
  },
  {
    key: 'rs_score',
    term: { en: 'RS Score (Relative Strength)', ko: 'RS Score (상대 강도)' },
    body: {
      en: 'Measures the stock\'s 63-day return relative to S&P500, scaled 0-100. Above 70 = top 30% performer. One of Minervini\'s Stage2 criteria (RS ≥ 50). Similar concept to IBD\'s EPS/RS ratings.',
      ko: 'S&P500과 비교해 최근 63일(약 3개월) 수익률이 얼마나 우수한지를 0~100으로 나타냅니다. 70 이상이면 시장 상위 30% 강세주입니다.',
    },
  },
  {
    key: 'gc_status',
    term: { en: 'Gaussian Channel', ko: '가우시안 채널 (Gaussian Channel)' },
    body: {
      en: 'The blue band on the chart. Shows statistically whether price is in a "normal range" without using future data, so it\'s reliable in real time.\n\n• Breakout — price pierces the upper band upward. Strong buying signal, consider entry.\n• Above Channel — price stays above channel in a sustained uptrend. Hold.\n• Retest — price drops back to touch the upper band after breakout. Pullback entry opportunity.\n• Below Channel — price drops below the lower band. Bearish, avoid new entries.',
      ko: '차트에 표시된 파란 밴드입니다. 미래 데이터를 쓰지 않아 실시간으로 신뢰할 수 있습니다.\n\n• Breakout — 주가가 채널 상단을 뚫고 위로 솟음. 강한 매수 에너지 신호\n• Above Channel — 채널 위에 머물며 강세 지속 중. 보유 유지\n• Retest — 상단 돌파 후 채널로 다시 내려와 닿음. 눌림목 진입 기회\n• Below Channel — 채널 하단 아래로 이탈. 약세, 신규 진입 자제',
    },
  },
  {
    key: 'conviction',
    term: { en: 'Conviction Score', ko: 'Conviction (확신 점수)' },
    body: {
      en: 'A 0-100 composite score combining Stage2 (40%) + Social Sentiment (30%) + Risk Regime (30%). Above 65 (Bull) = high conviction with multiple signals aligned. Above 50 (Teal) = moderate. Below 35 (Bear) = avoid.',
      ko: 'Stage2(40%) + 소셜 심리(30%) + Risk Regime(30%)를 종합한 0~100 확신 점수입니다. 65 이상(Bull)이면 고확신 구간, 50 이상(Teal)은 보통, 35 미만(Bear)은 회피 권고입니다.',
    },
  },
  {
    key: 'rr_ratio',
    term: { en: 'R:R Ratio (Risk:Reward)', ko: 'R:R 비율 (Risk:Reward)' },
    body: {
      en: 'The ratio of potential loss to potential gain. 1:3 means you risk 1 unit to make 3 — you only need to be right 1 in 3 times to be profitable. Generally recommend 1:2 or better.',
      ko: '내가 잃을 수 있는 금액 대비 벌 수 있는 금액의 비율입니다. 1:3이면 1만원 잃을 위험에 3만원을 노린다는 뜻. 일반적으로 1:2 이상을 권장합니다.',
    },
  },
  {
    key: 'monthly_phase',
    term: { en: 'Monthly Phase', ko: '월봉 추세 (Monthly Phase)' },
    body: {
      en: 'Daily data aggregated to monthly candles, then evaluated against a 10-month EMA. "CONFIRMED_UPTREND" means price is above the 10M EMA with a rising slope — a bullish cycle that increases the reliability of shorter-term entry signals.',
      ko: '일봉 데이터를 월봉으로 합산해 10개월 EMA 기준으로 추세를 판별합니다. "월봉 상승 확인(CONFIRMED_UPTREND)"이면 강세 사이클로, 단기 진입 신호의 신뢰도가 높아집니다.',
    },
  },
  // ── Intraday Signals ─────────────────────────────────────────
  {
    key: 'signal_vcp',
    term: { en: 'VCP (Volatility Contraction Pattern)', ko: 'VCP (변동성 수축 패턴)' },
    body: {
      en: 'A powerful breakout buy signal: price breaks a 30-candle high with 2x+ average volume, while ATR contracts over 8 candles and EMA21 > EMA50. Confirms institutional accumulation — the highest-confidence signal.',
      ko: '주가가 30봉 신고가를 돌파하면서 거래량이 평소의 2배 이상 급증할 때 나타나는 강력한 돌파 매수 신호입니다. ATR 8봉 연속 수축과 EMA21>50 조건도 필요합니다.',
    },
  },
  {
    key: 'signal_sniper',
    term: { en: 'Sniper Signal', ko: 'Sniper 신호' },
    body: {
      en: 'A buy signal when price comes within 0.4% of EMA21 (21-candle exponential moving average) and RSI is in the 38-58 range. Captures the best pullback entry timing within a trend. Also requires 1.4x+ volume vs. prior candle.',
      ko: '가격이 EMA21(21봉 지수이동평균)에서 0.4% 이내로 접근하고 RSI가 38~58 구간에 있을 때 뜨는 매수 신호입니다. 추세 중 가장 좋은 눌림목 진입 타이밍을 포착합니다.',
    },
  },
  {
    key: 'signal_pullback',
    term: { en: 'Pullback', ko: 'Pullback (눌림목)' },
    body: {
      en: 'Appears when price corrects 4.5-9% from a 15-candle high and finds moving average support. Also requires MACD histogram rebounding for 3 consecutive candles and volume declining. High probability of trend resumption.',
      ko: '15봉 고점 대비 4.5~9% 조정 후 이동평균선에서 지지를 받을 때 나타납니다. MACD 히스토그램 3봉 연속 반등과 거래량 감소도 조건입니다.',
    },
  },
  {
    key: 'signal_strong_trend',
    term: { en: 'StrongTrend', ko: 'StrongTrend (강한 추세)' },
    body: {
      en: 'Displayed when Price > EMA21 > EMA50 are properly aligned, EMA21 slope is +0.15%+, and RSI is 52-78. This is a signal to hold existing positions.',
      ko: '가격 > EMA21 > EMA50 순서로 정렬되고, EMA21 기울기 +0.15% 이상, RSI 52~78일 때 표시됩니다. 현재 보유 중인 포지션을 계속 유지(홀딩)하라는 신호입니다.',
    },
  },
  {
    key: 'signal_overbought',
    term: { en: 'Overbought', ko: 'Overbought (과열)' },
    body: {
      en: 'RSI ≥ 76, price +3.2% above EMA21, 4 of 5 candles bullish, volume declining — an overheated zone. Consider partial profit-taking.',
      ko: 'RSI≥76이고 EMA21에서 +3.2% 이상 이격되어 있으며 5봉 중 4개가 양봉이고 거래량이 감소하는 과열 구간입니다. 일부 물량 분할 매도(익절)를 고려할 타이밍입니다.',
    },
  },
  {
    key: 'signal_downtrend',
    term: { en: 'Downtrend', ko: 'Downtrend (하락 추세)' },
    body: {
      en: 'Price is below EMA21 with a negative slope, volume is 1.3x+ average, and price is at an 8-candle low. Do not catch a falling knife — avoid buying when this signal is active.',
      ko: '가격이 EMA21 아래에 있고, EMA21이 음의 기울기이며, 거래량이 평균의 1.3배 이상이고 8봉 신저가인 상태입니다. 떨어지는 칼날을 잡지 마세요.',
    },
  },
  // ── Macro ─────────────────────────────────────────────────────
  {
    key: 'vix_index',
    term: { en: 'VIX (Fear Index)', ko: 'VIX (공포 지수)' },
    body: {
      en: 'Expected S&P500 volatility over the next 30 days. Below 14 = calm, around 20 = caution, above 30 = fear. Higher means market participants are more anxious.',
      ko: '향후 30일간 S&P500의 예상 변동성입니다. 14 이하=안정, 20 전후=경계, 30 이상=공포. 높을수록 시장 참여자들이 불안해하고 있다는 뜻입니다.',
    },
  },
  {
    key: 'rates_dollar',
    term: { en: 'Rates & USD', ko: '달러·금리 (Rates & USD)' },
    body: {
      en: 'Dollar (DXY) and rates (TNX 10-year) are generally inverse to equities. Strong dollar + rising rates = tighter liquidity, headwind for stocks. TLT rising = rates falling (favorable for stocks). Weak DXY = global capital rotating out of USD assets, favorable for commodities and EM stocks.',
      ko: '달러(DXY)와 금리(TNX 10년물)는 주식 시장과 역관계입니다. 달러 강세·금리 상승은 유동성 축소로 이어져 주식에 불리합니다. TLT 상승하면 금리 하락 신호(주식에 우호적).',
    },
  },
  {
    key: 'commodities',
    term: { en: 'Commodities', ko: '원자재 (Commodities)' },
    body: {
      en: 'Crude oil (CL=F) and gold (GLD) signal inflation and global economic health. Rising oil = economic strength signal but can fuel rate-hike fears. Rising gold = risk-off or inflation hedge demand. Both rising simultaneously = stagflation warning.',
      ko: '원유(CL=F)와 금(GLD)은 인플레이션과 글로벌 경기 신호입니다. 원유 상승은 경기 호조 신호이지만 인플레를 자극합니다. 두 자산이 동시에 상승하면 스태그플레이션 경계 신호입니다.',
    },
  },
  {
    key: 'hyg_jnk',
    term: { en: 'HYG / JNK (High-Yield ETF)', ko: 'HYG / JNK (고수익 채권 ETF)' },
    body: {
      en: 'ETFs composed of below-investment-grade corporate bonds. Strong HYG = investors willing to take risk (Risk-On). Weak HYG + strong IEF (treasuries) = fear signal.',
      ko: '신용등급이 낮은 기업의 채권(하이일드 본드)으로 구성된 ETF입니다. 이 ETF가 강하면 위험 선호 신호(Risk-On). IEF가 강하고 HYG가 약하면 공포 신호입니다.',
    },
  },
  {
    key: 'market_structure',
    term: { en: 'Market Structure', ko: '시장 구조 (Market Structure)' },
    body: {
      en: 'Technically determines one of 5 states: UPTREND (rising highs and lows), DOWNTREND (falling highs and lows), DISTRIBUTION (forming a top), ACCUMULATION (forming a bottom), NEUTRAL (no clear direction).',
      ko: 'UPTREND(상승 추세), DOWNTREND(하락 추세), DISTRIBUTION(분산·고점 형성 중), ACCUMULATION(축적·바닥 형성 중), NEUTRAL(방향성 없음) 5가지 상태를 기술적으로 판별합니다.',
    },
  },
  // ── Sentiment ─────────────────────────────────────────────────
  {
    key: 'composite_score',
    term: { en: 'Composite Score (−2 to +2)', ko: '복합점수 (Composite Score, −2 ~ +2)' },
    body: {
      en: 'A score synthesizing social media and news sentiment. Near +2 = extreme optimism (overheating risk). Near -2 = extreme fear. Extreme fear zones (≤-1.5) can be contrarian buy opportunities.',
      ko: '소셜 미디어와 뉴스에서 수집한 심리를 종합한 점수입니다. +2에 가까울수록 극도의 낙관(과열 주의), −2에 가까울수록 극도의 공포입니다.',
    },
  },
  {
    key: 'sentiment_confidence',
    term: { en: 'Sentiment Confidence', ko: 'Confidence (신뢰도)' },
    body: {
      en: 'Reliability of the sentiment judgment. HIGH = good data quality and clear signal. LOW = insufficient data or mixed signals — interpret with caution.',
      ko: '이 심리 판단이 얼마나 신뢰할 수 있는지를 나타냅니다. HIGH는 데이터 품질이 좋고 신호가 명확함, LOW는 데이터가 부족하거나 신호가 혼재해 해석에 주의가 필요합니다.',
    },
  },
  // ── DeepDive ──────────────────────────────────────────────────
  {
    key: 'institutional_activity',
    term: { en: 'Institutional Activity', ko: '세력참여도 (Institutional Activity)' },
    body: {
      en: 'Measures institutional buying/selling via: up/down volume ratio, recent volume trend, concentrated buy/sell days, an institutional score (0-100), and a 10-day accumulation/distribution grid. Score ≥ 60 = accumulation dominant.',
      ko: '거래량의 상승봉/하락봉 비율, 최근 거래량 추세, 집중 매수·매도일, 세력점수(0~100), 10일 누적 매집/분산 그리드로 기관 투자자의 매집/분산 여부를 판단합니다. 세력점수 60 이상이면 매집 우위입니다.',
    },
  },
]

// Key-based lookup: G.risk_regime.term / G.risk_regime.body
export const G = Object.fromEntries(GLOSSARY.map(e => [e.key, e])) as Record<string, GlossaryEntry>
```

- [ ] **Step 2: Run TypeScript compilation check**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | grep "glossary" | head -20
```
Expected: No errors from `glossary.ts`. Errors from components using old `GlossaryEntry.term` as `string` are expected — will be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/glossary.ts
git commit -m "feat(glossary): convert all 28 entries to BiLang (EN + KO)"
```

---

## Task 6: Add EN/KO toggle to Topbar + fix Topbar locale usage

**Files:**
- Modify: `frontend/components/shell/Topbar.tsx`

- [ ] **Step 1: Replace Topbar.tsx with bilingual version**

Replace the entire content of `frontend/components/shell/Topbar.tsx`:

```typescript
'use client';

import { useStore } from '@/hooks/useStore';
import { useRegime } from '@/hooks/useRegime';
import { Search, Sun, Moon } from '@/components/ui/Icons';
import { SYMBOLS, REGIME_META } from '@/app/types';
import { t } from '@/app/i18n';

export function Topbar() {
  const { board, symbol, theme, locale, setSymbol, setCmdOpen, setTheme, setLocale } = useStore();
  const { regimeData } = useRegime();

  const BOARD_LABELS: Record<string, { en: string; ko: string }> = {
    overview:  { en: 'Overview',  ko: '시장' },
    deepdive:  { en: 'Deep Dive', ko: '종합분석' },
    intraday:  { en: 'Intraday',  ko: '단기' },
    daily:     { en: 'Daily',     ko: '일봉' },
    watchlist: { en: 'Watchlist', ko: '워치리스트' },
    macro:     { en: 'Macro',     ko: '매크로' },
    sentiment: { en: 'Sentiment', ko: '심리' },
  };

  const current = BOARD_LABELS[board] ?? BOARD_LABELS.overview;

  return (
    <header className="topbar">
      <div className="topbar__title">
        <span style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>SniperBoard</span>
        <span style={{ color: 'var(--fg-faint)' }}>/</span>
        <span>{current.en}</span>
        <small>· {current.ko}</small>
      </div>

      <div className="topbar__search" onClick={() => setCmdOpen(true)}>
        <Search />
        <input placeholder={locale === 'en' ? 'Symbol · Board · Signal search' : '종목 · 보드 · 신호 검색'} readOnly />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar__right">
        <div className="topbar__symbols" style={{ display: 'flex', gap: 4 }}>
          {SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              style={{
                height: 28, padding: '0 10px',
                borderRadius: 'var(--r-sm)',
                fontSize: 11, fontWeight: 600,
                background: symbol === s ? 'var(--card-elev)' : 'transparent',
                border: symbol === s ? '1px solid var(--border)' : '1px solid transparent',
                color: symbol === s ? 'var(--fg)' : 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="topbar__sep" style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

        {regimeData && (
          <div className="regime-mini topbar__regime">
            <div className={'regime-mini__dot ' + regimeData.regime}>
              {regimeData.total ?? '—'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                {t(REGIME_META[regimeData.regime].label, locale)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Risk Regime</div>
            </div>
          </div>
        )}

        {/* EN/KO locale toggle */}
        <div style={{ display: 'flex', gap: 2, padding: '2px', background: 'var(--card-elev)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
          {(['en', 'ko'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              style={{
                height: 24, padding: '0 8px',
                borderRadius: 'var(--r-xs)',
                fontSize: 11, fontWeight: 600,
                background: locale === l ? 'var(--accent)' : 'transparent',
                color: locale === l ? '#fff' : 'var(--fg-muted)',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <button
          className="topbar__btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={locale === 'en' ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : (theme === 'dark' ? '라이트 모드' : '다크 모드')}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Run TypeScript compilation check**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | grep "Topbar" | head -10
```
Expected: No errors from `Topbar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/shell/Topbar.tsx
git commit -m "feat(Topbar): add EN/KO locale toggle, bilingual board labels and search placeholder"
```

---

## Task 7: Convert shell components — BottomTabs, MarketStrip, CommandPalette

**Files:**
- Modify: `frontend/components/shell/BottomTabs.tsx`
- Modify: `frontend/components/shell/MarketStrip.tsx`
- Modify: `frontend/components/shell/CommandPalette.tsx`

- [ ] **Step 1: Update BottomTabs.tsx**

Replace the entire content of `frontend/components/shell/BottomTabs.tsx`:

```typescript
'use client';

import React from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { Crosshair, Layers, Globe, Heart } from '@/components/ui/Icons';
import { t } from '@/app/i18n';

const TABS: { id: Board; label: { en: string; ko: string }; Icon: () => React.ReactElement }[] = [
  { id: 'overview',  label: { en: 'Market',   ko: '시장'    }, Icon: Crosshair },
  { id: 'deepdive',  label: { en: 'Analysis', ko: '종합분석' }, Icon: Layers },
  { id: 'macro',     label: { en: 'Macro',    ko: '매크로'  }, Icon: Globe },
  { id: 'sentiment', label: { en: 'Sentiment',ko: '심리'    }, Icon: Heart },
];

export function BottomTabs() {
  const { board, locale, setBoard } = useStore();
  return (
    <nav className="bottom-tabs">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={'bottom-tabs__item ' + (board === id ? 'active' : '')}
          onClick={() => setBoard(id)}
        >
          <Icon />
          <span>{t(label, locale)}</span>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Update MarketStrip.tsx — bilingual tooltips and guide button**

In `MarketStrip.tsx`, replace the `SYMBOL_TOOLTIPS` constant with a bilingual version and update the guide button. Find the `SYMBOL_TOOLTIPS` object and replace:

```typescript
const SYMBOL_TOOLTIPS: Record<string, { en: string; ko: string }> = {
  'SPY':      { en: 'S&P 500 ETF — tracks 500 large US stocks. Market temperature gauge', ko: 'S&P 500 ETF — 미국 대형주 500개 추종. 전체 시장 체온계' },
  'QQQ':      { en: 'Nasdaq 100 ETF — tech-heavy large growth stocks (Apple, Nvidia, etc.)', ko: '나스닥 100 ETF — 애플·엔비디아 등 기술주 중심 대형 성장주' },
  'IWM':      { en: 'Russell 2000 ETF — 2000 small-cap US stocks. Reflects domestic economy and risk appetite', ko: '러셀 2000 ETF — 미국 소형주 2000개. 내수 경기·리스크 선호도 반영' },
  '^VIX':     { en: 'VIX Fear Index — implied volatility of S&P500 options. >20 = caution, >30 = fear', ko: 'VIX 공포 지수 — S&P 500 옵션 내재변동성. 20↑ 주의, 30↑ 공포 구간' },
  'DX-Y.NYB': { en: 'DXY Dollar Index — dollar strength vs. 6 major currencies. Strong dollar → risk assets tend to fall', ko: 'DXY 달러 인덱스 — 6개 주요 통화 대비 달러 강도. 달러↑ = 위험자산↓ 경향' },
  'GLD':      { en: 'Gold ETF — safe-haven and inflation hedge. Inverse to dollar and rates', ko: '금 ETF — 안전자산·인플레이션 헤지. 달러·금리와 역관계' },
  'CL=F':     { en: 'WTI Crude Oil Futures — West Texas crude. Leading indicator for energy sector and inflation', ko: 'WTI 원유 선물 — 서부 텍사스산 원유. 에너지 섹터·인플레이션 선행 지표' },
};
```

Also add `const { locale } = useStore();` to the component, and update the tooltip text and guide button:
```typescript
// In setTooltip call, use SYMBOL_TOOLTIPS[s][locale] instead of SYMBOL_TOOLTIPS[s]
onMouseEnter={(e) => { const tt = SYMBOL_TOOLTIPS[item.symbol]; if (tt) setTooltip({ text: tt[locale], x: ..., y: ... }); }}
```

Find the guide button render and update the label:
```typescript
// Find the "? 가이드" button and update:
<button ... onClick={() => window.dispatchEvent(new CustomEvent('guide:open'))}>
  {locale === 'en' ? '? Guide' : '? 가이드'}
</button>
```

- [ ] **Step 3: Update CommandPalette.tsx — bilingual nav items and UI text**

In `CommandPalette.tsx`, add `locale` from useStore, and update the navItems `sub` strings:

```typescript
const { cmdOpen, setCmdOpen, setSymbol, setBoard, locale } = useStore();
```

Replace the navItems array:
```typescript
  const navItems: Item[] = [
    ...SYMBOLS.map(s => ({
      type: 'symbol' as const,
      label: s,
      sub: s,
      action: () => { setSymbol(s); setCmdOpen(false); },
      meta: 'Symbol',
    })),
    { type: 'nav', label: 'Overview',  sub: locale === 'en' ? 'Market at a glance'        : '시장 한눈에 보기',         action: () => { setBoard('overview'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Intraday',  sub: locale === 'en' ? 'Short-term signals + 5m chart' : '단기 신호 + 5m 차트',  action: () => { setBoard('intraday'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Daily',     sub: locale === 'en' ? 'Stage 2 + R:R'             : 'Stage 2 + R:R',          action: () => { setBoard('daily'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Watchlist', sub: locale === 'en' ? 'Stage2-sorted table'       : 'Stage2 정렬 테이블',      action: () => { setBoard('watchlist' as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Macro',     sub: locale === 'en' ? 'Macro dashboard'           : '매크로 대시보드',          action: () => { setBoard('macro'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Sentiment', sub: locale === 'en' ? 'Social sentiment'          : '소셜 심리',               action: () => { setBoard('sentiment' as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Deep Dive', sub: locale === 'en' ? 'Full analysis'             : '종합분석',                action: () => { setBoard('deepdive'  as Board); setCmdOpen(false); }, meta: 'Board' },
  ];
```

For glossary mode items — update to use `t(entry.term, locale)` and `t(entry.body, locale)`:
```typescript
// In the glossary mode items builder, change:
// label: entry.term → label: t(entry.term, locale)
// sub: entry.body.slice(0, 60) → sub: t(entry.body, locale).slice(0, 60)
```

Update the glossary mode banner:
```typescript
// Change "용어 검색 모드 — N개 결과" to:
{locale === 'en' ? `Glossary search mode — ${items.length} results` : `용어 검색 모드 — ${items.length}개 결과`}
```

Update the search placeholder:
```typescript
// Change placeholder={isGlossaryMode ? '? 용어 검색...' : '종목 · 보드 · 신호 검색'}
placeholder={isGlossaryMode
  ? (locale === 'en' ? '? Term search...' : '? 용어 검색...')
  : (locale === 'en' ? 'Symbol · Board · Signal search' : '종목 · 보드 · 신호 검색')
}
```

- [ ] **Step 4: Run TypeScript compilation check**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | grep -E "BottomTabs|MarketStrip|CommandPalette" | head -20
```
Expected: No errors from these three files.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/shell/BottomTabs.tsx \
        frontend/components/shell/MarketStrip.tsx \
        frontend/components/shell/CommandPalette.tsx
git commit -m "feat(shell): bilingual BottomTabs, MarketStrip tooltips, CommandPalette UI text"
```

---

## Task 8: Convert board components (part 1 — Overview and DeepDive)

**Files:**
- Modify: `frontend/components/boards/OverviewBoard.tsx`
- Modify: `frontend/components/boards/DeepDiveBoard.tsx`

**Pattern for all board components:**
1. Add `import { t, tField } from '@/app/i18n'` at top
2. Add `const { locale } = useStore()` in the component
3. Define a `S` strings object for static UI labels at the top of the component
4. Replace hardcoded Korean strings with `t(S.key, locale)` calls
5. Replace AI data field accesses (key_reason, brief, etc.) with `tField(en, ko, fallback, locale)`

- [ ] **Step 1: Add strings pattern to OverviewBoard.tsx**

At the top of the `OverviewBoard` component function, add:
```typescript
const { locale } = useStore();

const S = {
  aiInsight:       { en: 'AI Market Narrative', ko: 'AI 시장 나레티브' },
  earningsCalendar:{ en: 'Earnings Calendar',   ko: '실적 캘린더' },
  regime:          { en: 'Risk Regime',          ko: 'Risk Regime' },
  distributionDays:{ en: 'Distribution Days',    ko: '분산일' },
  breadth:         { en: 'Breadth · Sector',     ko: '시장 폭 · 섹터' },
  vix:             { en: 'VIX · Volatility',     ko: 'VIX · 변동성' },
  credit:          { en: 'Credit Stress',        ko: '신용 스트레스' },
  entryRadar:      { en: 'Entry Radar',          ko: '진입 레이더' },
  conviction:      { en: 'Conviction Leaderboard', ko: 'Conviction 리더보드' },
  watchlistTop3:   { en: 'Watchlist Top 3',      ko: 'Watchlist Top 3' },
  noData:          { en: 'No data',              ko: '데이터 없음' },
  loading:         { en: 'Loading...',           ko: '로딩 중...' },
  preOpen:         { en: 'Pre-open',             ko: '장 개장 전' },
  postClose:       { en: 'Post-close',           ko: '장 마감 후' },
  reason:          { en: 'Reason', ko: '이유' },
} as const;
```

Then find every hardcoded Korean string in OverviewBoard and replace:
- `'AI 시장 나레티브'` → `t(S.aiInsight, locale)`
- `'실적 캘린더'` → `t(S.earningsCalendar, locale)`
- `'분산일'` → `t(S.distributionDays, locale)`
- `'진입 레이더'` → `t(S.entryRadar, locale)`
- etc.

For AI data field access (key_reason, summary from brief), replace:
```typescript
// Old:
{sentiment.market?.key_reason}
// New:
{tField(sentiment.market?.key_reason_en, sentiment.market?.key_reason_ko, sentiment.market?.key_reason, locale)}
```

For REGIME_META label usage, replace any `.labelKo` or `.label` string usage:
```typescript
// Old (Topbar had REGIME_KO): now use t(REGIME_META[regime].label, locale)
// Old desc: REGIME_META[regime].desc (was string) → t(REGIME_META[regime].desc, locale)
```

For DD_META label/desc usage:
```typescript
// t(DD_META[level].label, locale)
// t(DD_META[level].desc, locale)
```

- [ ] **Step 2: Add strings pattern to DeepDiveBoard.tsx**

At the top of `DeepDiveBoard`, add:
```typescript
const { locale } = useStore();

const S = {
  institutionalActivity: { en: 'Institutional Activity', ko: '세력참여도' },
  rrPlan:    { en: 'R:R Entry Plan',        ko: 'R:R 진입계획' },
  socialSentiment: { en: 'Social Sentiment', ko: '소셜심리' },
  aiBrief:   { en: 'AI Brief',              ko: 'AI Brief' },
  earnings:  { en: 'Earnings',              ko: '실적' },
  regime:    { en: 'Risk Regime',           ko: 'Risk Regime' },
  marketSentiment: { en: 'Market Sentiment', ko: '시장 전체 심리' },
  upVol:     { en: 'Up Vol',               ko: '상승 거래량' },
  downVol:   { en: 'Down Vol',             ko: '하락 거래량' },
  score:     { en: 'Score',                ko: '세력점수' },
  entry:     { en: 'Entry',               ko: '진입' },
  stop:      { en: 'Stop',                ko: '손절' },
  target:    { en: 'Target',              ko: '목표' },
  loading:   { en: 'Loading...',          ko: '로딩 중...' },
  noData:    { en: 'No data',             ko: '데이터 없음' },
} as const;
```

Then replace all hardcoded Korean strings in DeepDiveBoard with `t(S.key, locale)` calls.

For brief field access, replace:
```typescript
// Old: brief.market_brief?.summary
// New: tField(brief.market_brief?.summary_en, brief.market_brief?.summary_ko, brief.market_brief?.summary, locale)

// Old: symBrief?.brief
// New: tField(symBrief?.brief_en, symBrief?.brief_ko, symBrief?.brief, locale)

// Old: symBrief?.key_risk
// New: tField(symBrief?.key_risk_en, symBrief?.key_risk_ko, symBrief?.key_risk, locale)
```

- [ ] **Step 3: Check TypeScript compilation for these two boards**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1 | grep -E "OverviewBoard|DeepDiveBoard" | head -20
```
Expected: No errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/boards/OverviewBoard.tsx \
        frontend/components/boards/DeepDiveBoard.tsx
git commit -m "feat(boards): bilingual strings in OverviewBoard and DeepDiveBoard"
```

---

## Task 9: Convert remaining board components

**Files:**
- Modify: `frontend/components/boards/IntradayBoard.tsx`
- Modify: `frontend/components/boards/DailyBoard.tsx`
- Modify: `frontend/components/boards/MacroBoard.tsx`
- Modify: `frontend/components/boards/SentimentBoard.tsx`
- Modify: `frontend/components/boards/WatchlistBoard.tsx`

Apply the same pattern from Task 8 to each remaining board.

- [ ] **Step 1: IntradayBoard.tsx — add locale and strings**

```typescript
const { locale } = useStore();
const S = {
  activeSignals:  { en: 'Active Signals',  ko: '활성 신호' },
  rsiIndicator:   { en: 'RSI',             ko: 'RSI' },
  action:         { en: 'Action',          ko: '액션' },
  noSignal:       { en: 'No active signals', ko: '활성 신호 없음' },
  loading:        { en: 'Loading...',      ko: '로딩 중...' },
} as const;
```

Replace hardcoded Korean strings. For SIGNAL_META usage:
```typescript
// Old: SIGNAL_META[sig].action (was string) → t(SIGNAL_META[sig].action, locale)
// Old: SIGNAL_META[sig].desc (was string) → t(SIGNAL_META[sig].desc, locale)
```

- [ ] **Step 2: DailyBoard.tsx — add locale and strings**

```typescript
const { locale } = useStore();
const S = {
  stage2Checklist: { en: 'Stage 2 Checklist', ko: 'Stage 2 체크리스트' },
  rrPanel:  { en: 'R:R Plan', ko: 'R:R 패널' },
  loading:  { en: 'Loading...', ko: '로딩 중...' },
} as const;
```

For STAGE2_META usage:
```typescript
// Old: STAGE2_META[key].desc (was string) → t(STAGE2_META[key].desc, locale)
```

- [ ] **Step 3: MacroBoard.tsx — add locale and strings**

```typescript
const { locale } = useStore();
const S = {
  volatility:   { en: 'Volatility',   ko: '변동성' },
  breadth:      { en: 'Breadth',      ko: '시장폭' },
  credit:       { en: 'Credit',       ko: '신용' },
  rates:        { en: 'Rates',        ko: '금리' },
  commodities:  { en: 'Commodities',  ko: '원자재' },
  sectors:      { en: 'Sectors',      ko: '섹터' },
  macroInsight: { en: 'Macro Insight', ko: '매크로 인사이트' },
  improving:    { en: 'Improving',    ko: '개선 중' },
  stable:       { en: 'Stable',       ko: '안정' },
  deteriorating:{ en: 'Deteriorating',ko: '악화 중' },
  riskOn:       { en: 'Risk-On',      ko: 'Risk-On (위험 선호)' },
  mixed:        { en: 'Mixed',        ko: '혼조' },
  riskOff:      { en: 'Risk-Off',     ko: 'Risk-Off (위험 회피)' },
  loading:      { en: 'Loading...',   ko: '로딩 중...' },
} as const;
```

- [ ] **Step 4: SentimentBoard.tsx — add locale and strings**

```typescript
const { locale } = useStore();
const S = {
  marketSentiment: { en: 'Market Sentiment', ko: '시장 심리' },
  socialSentiment: { en: 'Social Sentiment', ko: '소셜 심리' },
  topNews:         { en: 'Top News',         ko: '주요 뉴스' },
  preOpen:         { en: 'Pre-open',         ko: '개장 전' },
  postClose:       { en: 'Post-close',       ko: '마감 후' },
  botSuspected:    { en: 'Bot suspected',    ko: '봇 의심' },
  mention:         { en: 'Mentions',         ko: '언급량' },
  loading:         { en: 'Loading...',       ko: '로딩 중...' },
  noData:          { en: 'No data',          ko: '데이터 없음' },
} as const;
```

For SENTIMENT_META label usage:
```typescript
// Old: SENTIMENT_META[s].label (was string) → t(SENTIMENT_META[s].label, locale)
```

For TREND_META, VOLUME_META label usage:
```typescript
// t(TREND_META[trend].label, locale)
// t(VOLUME_META[vol].label, locale)
```

For top_news display:
```typescript
// Old: news.headline → tField(news.headline_en, news.headline_ko, news.headline, locale)
// Old: news.summary → tField(news.summary_en, news.summary_ko, news.summary, locale)
```

For key_reason display:
```typescript
// tField(sym.key_reason_en, sym.key_reason_ko, sym.key_reason, locale)
```

- [ ] **Step 5: WatchlistBoard.tsx — add locale and strings**

```typescript
const { locale } = useStore();
const S = {
  symbol:     { en: 'Symbol',    ko: '종목' },
  stage2:     { en: 'Stage 2',   ko: 'Stage 2' },
  rs:         { en: 'RS',        ko: 'RS' },
  from52wHigh:{ en: '52w High',  ko: '52주 고점' },
  entry:      { en: 'Entry',     ko: '진입' },
  stop:       { en: 'Stop',      ko: '손절' },
  target:     { en: 'Target',    ko: '목표' },
  monthly:    { en: 'Monthly',   ko: '월봉' },
  loading:    { en: 'Loading...', ko: '로딩 중...' },
} as const;
```

- [ ] **Step 6: Run full TypeScript compilation**

```bash
cd ~/dev/sniperboard/frontend
npx tsc --noEmit 2>&1
```
Expected: Zero type errors.

- [ ] **Step 7: Run Next.js build**

```bash
cd ~/dev/sniperboard/frontend
npm run build 2>&1 | tail -20
```
Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/boards/IntradayBoard.tsx \
        frontend/components/boards/DailyBoard.tsx \
        frontend/components/boards/MacroBoard.tsx \
        frontend/components/boards/SentimentBoard.tsx \
        frontend/components/boards/WatchlistBoard.tsx
git commit -m "feat(boards): bilingual strings in all 5 remaining board components"
```

---

## Task 10: Documentation — bilingual split

**Files:**
- Modify: `README.md` (rewrite in English)
- Create: `README.ko.md` (current README content + cross-link)
- Modify: `PROJECT_CONTEXT.md` (rewrite in English)
- Create: `PROJECT_CONTEXT.ko.md` (current content + cross-link)
- Modify: `CLAUDE.md` (rewrite in English)
- Create: `CLAUDE.ko.md` (current content + cross-link)

- [ ] **Step 1: Copy existing Korean docs to .ko.md files**

```bash
cd ~/dev/sniperboard
cp README.md README.ko.md
cp PROJECT_CONTEXT.md PROJECT_CONTEXT.ko.md
cp CLAUDE.md CLAUDE.ko.md
```

- [ ] **Step 2: Add cross-link header to each .ko.md file**

At the very top of each `.ko.md` file, add:
```markdown
> English docs: [README.md](./README.md)
```
(substitute the correct filename for each file)

- [ ] **Step 3: Rewrite README.md in English**

Replace the full content with an English translation of the current Korean README. Add at the top:
```markdown
> 한국어 문서: [README.ko.md](./README.ko.md)

# SniperBoard

A US stock trading signal dashboard based on the Livermore · O'Neil · Minervini methodologies.
...
```
Keep all sections (Features, Board descriptions, API endpoints, Signal conditions, Architecture) but in English.

- [ ] **Step 4: Rewrite PROJECT_CONTEXT.md in English**

Replace the full content with an English translation. Add at the top:
```markdown
> 한국어 문서: [PROJECT_CONTEXT.ko.md](./PROJECT_CONTEXT.ko.md)

# SniperBoard — Project Context (UPDATED 2026-05-31 i18n)
```
Translate all sections. Keep code blocks, file paths, and constant names unchanged (they're language-agnostic).

- [ ] **Step 5: Rewrite CLAUDE.md in English**

Replace the full content with an English translation. Add at the top:
```markdown
> 한국어 문서: [CLAUDE.ko.md](./CLAUDE.ko.md)

# SniperBoard — Claude Instructions
...
```

- [ ] **Step 6: Commit all documentation**

```bash
git add README.md README.ko.md \
        PROJECT_CONTEXT.md PROJECT_CONTEXT.ko.md \
        CLAUDE.md CLAUDE.ko.md
git commit -m "docs: bilingual split — README, PROJECT_CONTEXT, CLAUDE (EN primary, KO secondary)"
```

---

## Self-Review: Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Backend schemas accept _en/_ko Optional fields | Task 1 |
| BiLang type + t() helper | Task 2 |
| Zustand locale state (default 'ko') | Task 3 |
| REGIME_META BiLang | Task 4 Step 2 |
| DD_META BiLang | Task 4 Step 3 |
| SIGNAL_META action/desc BiLang | Task 4 Step 4 |
| STAGE2_META desc BiLang | Task 4 Step 5 |
| SENTIMENT_META, TREND_META, VOLUME_META BiLang | Task 4 Step 6 |
| TopNews, SymbolSentiment, MarketSentiment bilingual fields | Task 4 Step 1 |
| MarketBrief, SymbolBrief bilingual fields | Task 4 Step 1 |
| All 28 glossary entries BiLang | Task 5 |
| EN/KO toggle button in Topbar | Task 6 |
| BottomTabs bilingual | Task 7 Step 1 |
| MarketStrip tooltips + guide button bilingual | Task 7 Step 2 |
| CommandPalette nav subs + glossary mode bilingual | Task 7 Step 3 |
| OverviewBoard AI data via tField() | Task 8 |
| DeepDiveBoard brief fields via tField() | Task 8 |
| IntradayBoard signal labels | Task 9 Step 1 |
| DailyBoard stage2 meta | Task 9 Step 2 |
| MacroBoard group labels | Task 9 Step 3 |
| SentimentBoard top_news via tField(), metadata labels | Task 9 Step 4 |
| WatchlistBoard column headers | Task 9 Step 5 |
| TypeScript build passes | Task 9 Step 6-7 |
| README.md (EN) + README.ko.md | Task 10 |
| PROJECT_CONTEXT.md (EN) + .ko.md | Task 10 |
| CLAUDE.md (EN) + .ko.md | Task 10 |
