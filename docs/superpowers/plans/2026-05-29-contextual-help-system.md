# Contextual Help System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-board bottom accordion (GlossaryPanel) with a three-layer help system: ⓘ inline popovers on metric titles, a board-level guide slide-over panel, and ⌘K glossary search.

**Architecture:** `InfoPopover` attaches to Card titles via a new `info` prop on the Card component, and inline for sub-card metrics. `BoardGuidePanel` is a controlled slide-over rendered per board. All glossary data centralised in `app/glossary.ts`. `CommandPalette` extended with `?` prefix mode.

**Tech Stack:** React (Next.js App Router), TypeScript, Tailwind-free CSS with Plaid DS tokens in `globals.css`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/app/glossary.ts` | All glossary entries + `G` map for key lookup |
| Create | `frontend/components/ui/InfoPopover.tsx` | ⓘ inline popover component |
| Create | `frontend/components/ui/BoardGuidePanel.tsx` | Board guide slide-over component |
| Modify | `frontend/app/globals.css` | CSS for InfoPopover + BoardGuidePanel |
| Modify | `frontend/components/ui/Card.tsx` | Add optional `info` prop |
| Modify | `frontend/components/shell/CommandPalette.tsx` | Add `?` glossary search mode |
| Modify | `frontend/components/boards/OverviewBoard.tsx` | Replace GlossaryPanel, add info+guide |
| Modify | `frontend/components/boards/IntradayBoard.tsx` | Replace GlossaryPanel, add info+guide |
| Modify | `frontend/components/boards/DailyBoard.tsx` | Replace GlossaryPanel, add info+guide |
| Modify | `frontend/components/boards/WatchlistBoard.tsx` | Replace GlossaryPanel, add info+guide |
| Modify | `frontend/components/boards/MacroBoard.tsx` | Replace GlossaryPanel, add info+guide |
| Modify | `frontend/components/boards/SentimentBoard.tsx` | Replace GlossaryPanel, add info+guide |
| Modify | `frontend/components/boards/DeepDiveBoard.tsx` | Add info+guide (no prior GlossaryPanel) |
| Delete | `frontend/components/ui/GlossaryPanel.tsx` | Removed after all references gone |

---

## Task 1: Create `app/glossary.ts` — central glossary data

**Files:**
- Create: `frontend/app/glossary.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/app/glossary.ts
export interface GlossaryEntry {
  key: string;
  term: string;
  body: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Market / Regime ──────────────────────────────────────────
  {
    key: 'risk_regime',
    term: 'Risk Regime (리스크 레짐)',
    body: '시장이 지금 얼마나 투자하기 좋은 환경인지를 5가지 요소(추세·시장폭·신용·변동성·모멘텀)로 종합한 점수입니다. SPY EMA200 위치, RSP vs SPY 60일 격차, HYG/IEF 비율 변화, VIX 레벨, S&P500 20일 방향을 각각 채점해 합산하며, 100에 가까울수록 강세 환경입니다.',
  },
  {
    key: 'breadth',
    term: 'Breadth (시장 폭)',
    body: '소수 대형주만 오르는지, 많은 종목이 함께 오르는지를 봅니다. RSP(S&P500 동일가중 ETF)가 SPY(시가총액 비례)보다 강하면 건강한 장세, 약하면 대형주 소수에 의존하는 취약한 장세입니다.',
  },
  {
    key: 'credit',
    term: 'Credit Stress (신용 스트레스)',
    body: '회사채 시장의 건전성을 봅니다. HYG(고수익 채권 ETF)가 IEF(미국 국채 ETF)보다 강하면 투자자들이 위험을 기꺼이 감수한다는 신호(위험 선호)이며, 반대면 공포 신호입니다. 30일 HYG/IEF 비율 변화로 계산합니다.',
  },
  {
    key: 'volatility',
    term: 'Volatility (변동성 · VIX)',
    body: '향후 30일 S&P500의 예상 변동성을 나타내는 공포 지수입니다. 14 이하면 안정적, 20 전후면 경계, 30 이상이면 공포 국면입니다. 낮을수록 매수하기 좋은 환경입니다.',
  },
  {
    key: 'vix_backwardation',
    term: 'VIX 백워데이션',
    body: 'VIX9D(9일 단기 변동성)가 VIX(30일)보다 높아진 역전 상태입니다. 정상(콘탱고)은 장기 VIX가 더 높은데, 역전되면 지금 당장 시장이 더 불안하다는 뜻으로 단기 이벤트 공포를 나타내는 경고 신호입니다.',
  },
  {
    key: 'distribution_days',
    term: 'Distribution Days (분산일)',
    body: '최근 25거래일 내 기관 투자자들이 대량 매도한 날(S&P500/Nasdaq 하락 + 거래량 증가)의 수입니다. 4~5일이면 경계, 6일 이상이면 시장 상단 가능성이 높아 신규 진입을 자제해야 합니다.',
  },
  {
    key: 'market_breadth_spy_rsp',
    term: 'Market Breadth · SPY vs RSP',
    body: 'SPY는 시가총액 비례 지수(대형주 영향 큼), RSP는 모든 종목을 동일 비중으로 구성한 지수입니다. RSP가 SPY보다 약하면 소수 대형주만 시장을 끌고 있다는 경고로, 건강하지 않은 상승입니다.',
  },
  {
    key: 'sector_momentum',
    term: 'Sector Momentum (섹터 모멘텀)',
    body: '5개 테마 ETF(SMH 반도체, XLY 소비재, ITA 방산, XLE 에너지, XHB 홈빌더)의 최근 5일 수익률 순위입니다. 상위 섹터에 돈이 몰리고 있으므로 강세 섹터 내 종목에 집중하는 것이 유리합니다. ↑EMA는 21일 이평선 위 강세 상태입니다.',
  },
  // ── Stage 2 / Technical ───────────────────────────────────────
  {
    key: 'stage2',
    term: 'Stage 2 점수 (0~7)',
    body: 'Minervini가 정의한 이상적인 매수 구간 조건 7가지를 충족한 개수입니다: ①가격>EMA21>50>200 ②EMA200 상승 ③52주 고점 대비 -25% 이내 ④52주 저점 대비 +30% 이상 ⑤최근 조정 15% 이내 ⑥RS Score≥50 ⑦거래량 수축. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피.',
  },
  {
    key: 'rs_score',
    term: 'RS Score (상대 강도)',
    body: 'S&P500과 비교해 최근 63일(약 3개월) 수익률이 얼마나 우수한지를 0~100으로 나타냅니다. 70 이상이면 시장 상위 30% 강세주입니다. Minervini Stage2 조건 중 하나(RS ≥ 50)이며, IBD의 EPS·RS 등급과 유사한 개념입니다.',
  },
  {
    key: 'gc_status',
    term: '가우시안 채널 (Gaussian Channel)',
    body: '인과 가우시안 커널로 그린 통계적 추세 밴드입니다(look-ahead bias 없음). Breakout=채널 상단 돌파(강한 모멘텀), Above=채널 위 강세, Retest=돌파 후 채널 재접촉(눌림 진입 기회), Below=채널 이탈 약세입니다.',
  },
  {
    key: 'conviction',
    term: 'Conviction (확신 점수)',
    body: 'Stage2(40%) + 소셜 심리(30%) + Risk Regime(30%)를 종합한 0~100 확신 점수입니다. 65 이상(Bull)이면 복수 지표가 일치하는 고확신 구간, 50 이상(Teal)은 보통, 35 미만(Bear)은 회피 권고입니다.',
  },
  {
    key: 'rr_ratio',
    term: 'R:R 비율 (Risk:Reward)',
    body: '내가 잃을 수 있는 금액 대비 벌 수 있는 금액의 비율입니다. 1:3이면 1만원 잃을 위험에 3만원을 노린다는 뜻으로, 3번 중 1번만 맞아도 수익이 납니다. 일반적으로 1:2 이상을 권장합니다.',
  },
  {
    key: 'monthly_phase',
    term: '월봉 추세 (Monthly Phase)',
    body: '일봉 데이터를 월봉으로 합산해 10개월 EMA 기준으로 추세를 판별합니다. "월봉 상승 확인(CONFIRMED_UPTREND)"이면 월봉 10EMA 위에서 기울기가 우상향인 강세 사이클로, 단기 진입 신호의 신뢰도가 높아집니다.',
  },
  // ── Intraday Signals ─────────────────────────────────────────
  {
    key: 'signal_vcp',
    term: 'VCP (변동성 수축 패턴)',
    body: '주가가 30봉 신고가를 돌파하면서 거래량이 평소의 2배 이상 급증할 때 나타나는 강력한 돌파 매수 신호입니다. ATR 8봉 연속 수축과 EMA21>50 조건도 필요합니다. 기관 투자자들의 대량 매수가 확인된 것으로 가장 신뢰도 높은 신호입니다.',
  },
  {
    key: 'signal_sniper',
    term: 'Sniper 신호',
    body: '가격이 EMA21(21봉 지수이동평균)에서 0.4% 이내로 접근하고 RSI가 38~58 구간에 있을 때 뜨는 매수 신호입니다. 추세 중 가장 좋은 눌림목 진입 타이밍을 포착하며, 직전 봉 대비 거래량 1.4배 이상도 필요합니다.',
  },
  {
    key: 'signal_pullback',
    term: 'Pullback (눌림목)',
    body: '15봉 고점 대비 4.5~9% 조정 후 이동평균선에서 지지를 받을 때 나타납니다. MACD 히스토그램 3봉 연속 반등과 거래량 감소도 조건입니다. 상승 추세가 잠깐 숨 고르기 후 재개될 가능성이 높은 진입 타이밍입니다.',
  },
  {
    key: 'signal_strong_trend',
    term: 'StrongTrend (강한 추세)',
    body: '가격 > EMA21 > EMA50 순서로 정렬되고, EMA21 기울기 +0.15% 이상, RSI 52~78일 때 표시됩니다. 현재 보유 중인 포지션을 계속 유지(홀딩)하라는 신호입니다.',
  },
  {
    key: 'signal_overbought',
    term: 'Overbought (과열)',
    body: 'RSI≥76이고 EMA21에서 +3.2% 이상 이격되어 있으며 5봉 중 4개가 양봉이고 거래량이 감소하는 과열 구간입니다. 일부 물량 분할 매도(익절)를 고려할 타이밍입니다.',
  },
  {
    key: 'signal_downtrend',
    term: 'Downtrend (하락 추세)',
    body: '가격이 EMA21 아래에 있고, EMA21이 음의 기울기이며, 거래량이 평균의 1.3배 이상이고 8봉 신저가인 상태입니다. 떨어지는 칼날을 잡지 마세요 — 이 신호가 있을 때는 매수 접근 금지입니다.',
  },
  // ── Macro ─────────────────────────────────────────────────────
  {
    key: 'vix_index',
    term: 'VIX (공포 지수)',
    body: '향후 30일간 S&P500의 예상 변동성입니다. 14 이하=안정, 20 전후=경계, 30 이상=공포. 높을수록 시장 참여자들이 불안해하고 있다는 뜻입니다.',
  },
  {
    key: 'hyg_jnk',
    term: 'HYG / JNK (고수익 채권 ETF)',
    body: '신용등급이 낮은 기업의 채권(하이일드 본드)으로 구성된 ETF입니다. 이 ETF가 강하면 투자자들이 위험을 감수할 의향이 있다는 신호(Risk-On)입니다. IEF(국채)가 강하고 HYG가 약하면 공포 신호입니다.',
  },
  {
    key: 'market_structure',
    term: '시장 구조 (Market Structure)',
    body: 'UPTREND(상승 추세), DOWNTREND(하락 추세), DISTRIBUTION(분산·고점 형성 중), ACCUMULATION(축적·바닥 형성 중), NEUTRAL(방향성 없음) 5가지 상태를 기술적으로 판별합니다.',
  },
  // ── Sentiment ─────────────────────────────────────────────────
  {
    key: 'composite_score',
    term: '복합점수 (Composite Score, −2 ~ +2)',
    body: '소셜 미디어와 뉴스에서 수집한 심리를 종합한 점수입니다. +2에 가까울수록 극도의 낙관(과열 주의), −2에 가까울수록 극도의 공포입니다. 극단적 공포 구간(−1.5 이하)은 역발상 매수 기회가 될 수 있습니다.',
  },
  {
    key: 'sentiment_confidence',
    term: 'Confidence (신뢰도)',
    body: '이 심리 판단이 얼마나 신뢰할 수 있는지를 나타냅니다. HIGH는 데이터 품질이 좋고 신호가 명확함, LOW는 데이터가 부족하거나 신호가 혼재해 해석에 주의가 필요합니다.',
  },
  // ── DeepDive ──────────────────────────────────────────────────
  {
    key: 'institutional_activity',
    term: '세력참여도 (Institutional Activity)',
    body: '거래량의 상승봉/하락봉 비율, 최근 거래량 추세, 집중 매수·매도일, 세력점수(0~100), 10일 누적 매집/분산 그리드로 기관 투자자의 매집/분산 여부를 판단합니다. 세력점수 60 이상이면 매집 우위입니다.',
  },
];

// Key-based lookup: G.risk_regime.term / G.risk_regime.body
export const G = Object.fromEntries(GLOSSARY.map(e => [e.key, e])) as Record<
  string,
  GlossaryEntry
>;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/glossary.ts
git commit -m "feat: add central glossary data (app/glossary.ts)"
```

---

## Task 2: Create `InfoPopover` component + CSS

**Files:**
- Create: `frontend/components/ui/InfoPopover.tsx`
- Modify: `frontend/app/globals.css` (append CSS)

- [ ] **Step 1: Create `InfoPopover.tsx`**

```tsx
// frontend/components/ui/InfoPopover.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

const CLOSE_EVENT = 'info-pop:close-all';

interface Props {
  term: string;
  body: string;
}

export function InfoPopover({ term, body }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when another popover opens
  useEffect(() => {
    const handler = () => setOpen(false);
    document.addEventListener(CLOSE_EVENT, handler);
    return () => document.removeEventListener(CLOSE_EVENT, handler);
  }, []);

  // Outside click + Escape when open
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) document.dispatchEvent(new Event(CLOSE_EVENT));
    setOpen(o => !o);
  }

  return (
    <div className="info-pop" ref={ref}>
      <button
        className="info-pop__trigger"
        onClick={toggle}
        aria-label={`${term} 설명`}
        aria-expanded={open}
      >
        ⓘ
      </button>
      {open && (
        <div className="info-pop__body" role="tooltip">
          <div className="info-pop__term">{term}</div>
          <p className="info-pop__text">{body}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append CSS to `globals.css`**

Find the line `/* ============================================================` that starts the `Utility` section (around line 824) and insert the following block just before it:

```css
/* ============================================================
   InfoPopover — inline ⓘ metric tooltip
   ============================================================ */
.info-pop {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.info-pop__trigger {
  background: none; border: none; cursor: pointer;
  font-size: 11px; color: var(--fg-subtle);
  padding: 0 3px; opacity: 0.55;
  line-height: 1; transition: opacity 0.15s;
}
.info-pop__trigger:hover { opacity: 1; color: var(--fg-muted); }
.info-pop__body {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  width: 280px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-pop);
  padding: 10px 12px;
  pointer-events: none;
}
.info-pop__term {
  font-size: 11px; font-weight: 600;
  color: var(--fg); font-family: var(--font-mono);
  margin-bottom: 5px;
}
.info-pop__text {
  font-size: 12px; color: var(--fg-muted);
  line-height: 1.5; margin: 0;
}

/* ============================================================
   BoardGuidePanel — board-level guide slide-over
   ============================================================ */
.guide-overlay {
  position: fixed; inset: 0;
  z-index: 60;
  background: color-mix(in srgb, var(--fg) 15%, transparent);
}
.guide-panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  z-index: 61;
  width: 340px; max-width: 90vw;
  background: var(--card);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-pop);
  display: flex; flex-direction: column;
  animation: guide-slide-in 0.2s ease;
}
@keyframes guide-slide-in {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
.guide-panel__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.guide-panel__title {
  font-size: 13px; font-weight: 600; color: var(--fg);
}
.guide-panel__close {
  background: none; border: none; cursor: pointer;
  font-size: 14px; color: var(--fg-subtle); padding: 2px 6px;
}
.guide-panel__close:hover { color: var(--fg); }
.guide-panel__body {
  flex: 1; overflow-y: auto;
  padding: 16px;
  display: flex; flex-direction: column; gap: 16px;
}
.guide-panel__section { display: flex; flex-direction: column; gap: 6px; }
.guide-panel__heading {
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--fg-subtle);
}
.guide-panel__text {
  font-size: 12.5px; color: var(--fg-muted);
  line-height: 1.55; margin: 0;
}

/* Guide trigger button — top-right of board */
.guide-btn {
  position: absolute; top: 12px; right: 12px;
  display: flex; align-items: center; gap: 5px;
  background: none; border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 4px 9px; font-size: 11px;
  color: var(--fg-subtle); cursor: pointer;
  z-index: 5;
}
.guide-btn:hover { color: var(--fg); background: var(--bg-muted); }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/InfoPopover.tsx frontend/app/globals.css
git commit -m "feat: add InfoPopover + BoardGuidePanel CSS"
```

---

## Task 3: Create `BoardGuidePanel` component

**Files:**
- Create: `frontend/components/ui/BoardGuidePanel.tsx`

- [ ] **Step 1: Create the file**

```tsx
// frontend/components/ui/BoardGuidePanel.tsx
'use client';

import { useEffect } from 'react';

export interface GuideSection {
  heading: string;
  body: string;
}

interface Props {
  title: string;
  sections: GuideSection[];
  isOpen: boolean;
  onClose: () => void;
}

export function BoardGuidePanel({ title, sections, isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="guide-overlay" onClick={onClose} />
      <div className="guide-panel">
        <div className="guide-panel__header">
          <span className="guide-panel__title">{title}</span>
          <button className="guide-panel__close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="guide-panel__body">
          {sections.map((s, i) => (
            <div key={i} className="guide-panel__section">
              <div className="guide-panel__heading">{s.heading}</div>
              <p className="guide-panel__text">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/BoardGuidePanel.tsx
git commit -m "feat: add BoardGuidePanel slide-over component"
```

---

## Task 4: Update `Card` — add optional `info` prop

**Files:**
- Modify: `frontend/components/ui/Card.tsx`

- [ ] **Step 1: Update `Card.tsx`**

Replace the entire file content with:

```tsx
// frontend/components/ui/Card.tsx
'use client';

import React from 'react';
import { InfoPopover } from '@/components/ui/InfoPopover';

interface CardInfo {
  term: string;
  body: string;
}

interface CardProps {
  title?: string;
  hint?: string | null;
  action?: string;
  flush?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  info?: CardInfo;
}

export function Card({ title, hint, action, flush, children, style, className = '', info }: CardProps) {
  return (
    <div className={'card ' + className} style={style}>
      {(title || action || hint || info) && (
        <div className="card__hd">
          {title && <h3>{title}</h3>}
          {info && <InfoPopover term={info.term} body={info.body} />}
          {hint && <span className="card-flag live">{hint}</span>}
          {action && <small>{action}</small>}
        </div>
      )}
      <div className={'card__bd ' + (flush ? 'card__bd--flush' : '')}>
        {children}
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const cls = score >= 6 ? 's-high' : score >= 4 ? 's-mid' : 's-low';
  return <span className={'score-pill ' + cls}>{score}/7</span>;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/Card.tsx
git commit -m "feat: add optional info prop to Card for InfoPopover"
```

---

## Task 5: Update `CommandPalette` — add `?` glossary search

**Files:**
- Modify: `frontend/components/shell/CommandPalette.tsx`

- [ ] **Step 1: Replace file content**

```tsx
// frontend/components/shell/CommandPalette.tsx
'use client';

import { useState, useEffect } from 'react';
import { useStore, Board } from '@/hooks/useStore';
import { SYMBOLS } from '@/app/types';
import { GLOSSARY } from '@/app/glossary';
import { Bolt, Layers } from '@/components/ui/Icons';

interface Item {
  type: 'symbol' | 'nav' | 'glossary';
  label: string;
  sub: string;
  action: () => void;
  meta: string;
}

export function CommandPalette() {
  const { cmdOpen, setCmdOpen, setSymbol, setBoard } = useStore();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => { if (cmdOpen) { setQ(''); setSel(0); } }, [cmdOpen]);

  if (!cmdOpen) return null;

  const isGlossaryMode = q.startsWith('?');
  const glossaryQ = isGlossaryMode ? q.slice(1).trim().toLowerCase() : '';

  const navItems: Item[] = [
    ...SYMBOLS.map(s => ({
      type: 'symbol' as const,
      label: s,
      sub: s,
      action: () => { setSymbol(s); setCmdOpen(false); },
      meta: 'Symbol',
    })),
    { type: 'nav', label: 'Overview',  sub: '시장 한눈에 보기',         action: () => { setBoard('overview'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Intraday',  sub: '단기 신호 + 5m 차트',     action: () => { setBoard('intraday'  as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Daily',     sub: 'Stage 2 + R:R',          action: () => { setBoard('daily'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Watchlist', sub: 'Stage2 정렬 테이블',      action: () => { setBoard('watchlist' as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Macro',     sub: '섹터 로테이션 + 21개',    action: () => { setBoard('macro'     as Board); setCmdOpen(false); }, meta: 'Board' },
    { type: 'nav', label: 'Sentiment', sub: '시장 심리 + 종목별 점수', action: () => { setBoard('sentiment' as Board); setCmdOpen(false); }, meta: 'Board' },
  ];

  const glossaryItems: Item[] = GLOSSARY
    .filter(e =>
      !glossaryQ ||
      e.term.toLowerCase().includes(glossaryQ) ||
      e.body.toLowerCase().includes(glossaryQ)
    )
    .map(e => ({
      type: 'glossary' as const,
      label: e.term,
      sub: e.body.length > 80 ? e.body.slice(0, 80) + '…' : e.body,
      action: () => setCmdOpen(false),
      meta: '용어',
    }));

  const items = isGlossaryMode ? glossaryItems : (
    q
      ? navItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.sub.toLowerCase().includes(q.toLowerCase()))
      : navItems
  );

  return (
    <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
      <div className="cmd" onClick={e => e.stopPropagation()}>
        <input
          className="cmd__inp"
          placeholder="종목, 보드 검색… (? 입력 시 용어 검색)"
          autoFocus
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
            if (e.key === 'Enter')     { items[sel]?.action(); }
            if (e.key === 'Escape')    { setCmdOpen(false); }
          }}
        />
        {isGlossaryMode && (
          <div style={{ padding: '4px 16px', fontSize: 10.5, color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border)' }}>
            용어 검색 모드 — {items.length}개 결과
          </div>
        )}
        <div className="cmd__list">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={'cmd__item ' + (idx === sel ? 'sel' : '')}
              onMouseEnter={() => setSel(idx)}
              onClick={item.action}
            >
              <div className="ico">
                {item.type === 'symbol' ? <Bolt /> : item.type === 'glossary' ? <span style={{ fontSize: 12 }}>ⓘ</span> : <Layers />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
              </div>
              <div className="meta">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/shell/CommandPalette.tsx
git commit -m "feat: add glossary search mode to CommandPalette (? prefix)"
```

---

## Task 6: Update `OverviewBoard`

**Files:**
- Modify: `frontend/components/boards/OverviewBoard.tsx`

- [ ] **Step 1: Update imports and remove OVERVIEW_GLOSSARY**

At the top of the file, replace:
```tsx
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
```
with:
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
```

Delete the entire `OVERVIEW_GLOSSARY` constant (lines 17–32).

- [ ] **Step 2: Add guide content constant** (after the `REGIME_LABELS` block)

```tsx
const OVERVIEW_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '시장 전체 환경을 한눈에 파악하는 대시보드입니다. 개별 종목 진입 전 "지금 시장이 매수에 적합한가?"를 먼저 확인하는 화면입니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Risk Regime 점수가 전체 건강도를 요약합니다. Trend(SPY EMA200 위치)와 Breadth(RSP vs SPY)가 시장 구조를, Credit(HYG/IEF)과 Volatility(VIX)가 리스크 선호도를 나타냅니다. Distribution Days는 기관 매도 압력의 누적치로, 6일 이상이면 신규 진입을 자제해야 합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Risk Regime ≥ 60 확인 → VIX 20 이하 확인 → Distribution Days 5 이하 확인 → Breadth에서 RSP ≥ SPY 확인. 4가지 통과하면 종목 진입 검토. 하나라도 불합격이면 포지션 크기를 줄이세요.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state to `OverviewBoard` function**

Inside the `OverviewBoard` function, after the existing hooks, add:
```tsx
const [guideOpen, setGuideOpen] = useState(false);
```

- [ ] **Step 4: Add `info` props to Card components**

Update these `<Card>` usages to include the `info` prop:

```tsx
// Risk Regime card
<Card title="Risk Regime" action="5요소 종합" info={G.risk_regime}>

// Distribution Days card
<Card title="Distribution Days" action="O'Neil · 25거래일" info={G.distribution_days}>

// Market Breadth card
<Card title="Market Breadth" action="SPY vs RSP" info={G.market_breadth_spy_rsp}>

// Volatility · VIX card
<Card title="Volatility · VIX" action={backward ? '⚠ 백워데이션' : '정상'} info={G.volatility}>

// Credit Stress card
<Card title="Credit Stress" action="HYG / IEF 5D" info={G.credit}>

// Sector Momentum card
<Card title="Sector Momentum" action="5D 수익률" info={G.sector_momentum}>

// Conviction 리더보드 card
<Card title="Conviction 리더보드" action="확신도 순" info={G.conviction}>
```

- [ ] **Step 5: Replace GlossaryPanel render with guide button + panel**

Find the block:
```tsx
      {/* 이 화면 데이터 설명 */}
      <div style={{ gridColumn: 'span 4' }}>
        <GlossaryPanel items={OVERVIEW_GLOSSARY} />
      </div>
```

Replace with:
```tsx
      <BoardGuidePanel
        title="Overview 가이드"
        sections={OVERVIEW_GUIDE}
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
```

- [ ] **Step 6: Add `? 가이드` button and `position: relative` to board container**

Find the opening board `<div>` and add `style={{ position: 'relative' }}`. Then add the guide button as the first child:

```tsx
  return (
    <div className="board fade-in" style={{ position: 'relative' }}>
      <button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
      {/* rest of board */}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/components/boards/OverviewBoard.tsx
git commit -m "feat: replace OverviewBoard GlossaryPanel with InfoPopover + guide panel"
```

---

## Task 7: Update `IntradayBoard`

**Files:**
- Modify: `frontend/components/boards/IntradayBoard.tsx`

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
```
with:
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { G } from '@/app/glossary';
```

Delete the entire `INTRADAY_GLOSSARY` constant.

- [ ] **Step 2: Add guide content constant** (before `SIG_META`)

```tsx
const INTRADAY_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '5분봉 기준 단기 매수·매도 신호를 실시간으로 보여주는 화면입니다. 30초마다 갱신되며, 진입 타이밍과 포지션 사이즈를 계산합니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: '6개 신호 중 VCP·Sniper·Pullback은 매수 기회, StrongTrend는 보유 유지, Overbought는 익절 검토, Downtrend는 매수 금지 신호입니다. RSI와 EMA 이격은 현재 과열/과매도 여부를 판단합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: '활성 신호 확인 → R:R 비율 2:1 이상 여부 확인 → 포지션 사이즈 계산(손절폭 × 수량 ≤ 계좌의 1~2%) → 진입. 신호가 없으면 관망합니다.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state and add guide button/panel**

Inside `IntradayBoard` function, add:
```tsx
const [guideOpen, setGuideOpen] = useState(false);
```

In the return JSX, wrap the outermost `<div>` to have `style={{ position: 'relative' }}` and add as first child:
```tsx
<button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
<BoardGuidePanel title="Intraday 가이드" sections={INTRADAY_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

- [ ] **Step 4: Add InfoPopover to signal names**

In the signal card section (where `SIG_META` entries are rendered with their name), find where each signal's `name` is displayed and add an InfoPopover after it. The signal key mapping:

```tsx
// In the signal list render, for each signal key, add InfoPopover next to the name:
const SIG_INFO: Record<string, { term: string; body: string }> = {
  sniper:       G.signal_sniper,
  vcp:          G.signal_vcp,
  pullback:     G.signal_pullback,
  strong_trend: G.signal_strong_trend,
  overbought:   G.signal_overbought,
  downtrend:    G.signal_downtrend,
};
```

Then wherever a signal name is rendered (look for `{meta.name}` in the signal list), add:
```tsx
<span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
  {meta.name}
  <InfoPopover term={SIG_INFO[key].term} body={SIG_INFO[key].body} />
</span>
```

- [ ] **Step 5: Remove GlossaryPanel render**

Find and delete the block:
```tsx
      {/* 이 화면 데이터 설명 */}
      ...
        <GlossaryPanel items={INTRADAY_GLOSSARY} />
      ...
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/boards/IntradayBoard.tsx
git commit -m "feat: replace IntradayBoard GlossaryPanel with InfoPopover + guide panel"
```

---

## Task 8: Update `DailyBoard`

**Files:**
- Modify: `frontend/components/boards/DailyBoard.tsx`

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
```
with:
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
```

Delete the entire `DAILY_GLOSSARY` constant.

- [ ] **Step 2: Add guide content constant** (before `STRUCT_COLOR`)

```tsx
const DAILY_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '일봉 기준 셋업 품질과 중장기 추세를 분석하는 화면입니다. Stage2 체크리스트로 지금 이 종목이 매수 가능한 구조인지 판단합니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Stage2 점수(0~7)가 핵심입니다. 6~7점이면 진입 검토, 4~5점은 관망, 3 이하면 회피. GC 상태는 중기 추세 단계를 나타내며, Breakout이면 적극 매수, Below Channel이면 관망입니다. R:R 패널에서 진입·손절·목표가를 확인합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Stage2 ≥ 5 확인 → GC Breakout 또는 Above 확인 → 월봉 상승 확인 → R:R ≥ 1:2 확인 → 진입. 4가지 통과 시 강한 셋업입니다.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state, guide button, and panel**

Add `const [guideOpen, setGuideOpen] = useState(false);` inside `DailyBoard`.

Add to board container:
```tsx
// Add style={{ position: 'relative' }} to outermost div
<button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
<BoardGuidePanel title="Daily 가이드" sections={DAILY_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

- [ ] **Step 4: Add `info` props to Card components**

```tsx
// Stage2 card (find the card with Stage2 score)
// Add: info={G.stage2}

// GC Status card
// Add: info={G.gc_status}

// R:R panel card
// Add: info={G.rr_ratio}

// Conviction badge card
// Add: info={G.conviction}

// Monthly Phase card
// Add: info={G.monthly_phase}
```

Search for these Card titles in DailyBoard.tsx and add the `info` prop to each.

- [ ] **Step 5: Remove GlossaryPanel render**

Delete the block containing `<GlossaryPanel items={DAILY_GLOSSARY} />` and its wrapper div.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/boards/DailyBoard.tsx
git commit -m "feat: replace DailyBoard GlossaryPanel with InfoPopover + guide panel"
```

---

## Task 9: Update `WatchlistBoard`

**Files:**
- Modify: `frontend/components/boards/WatchlistBoard.tsx`

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
```
with:
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { G } from '@/app/glossary';
```

Delete the entire `WATCHLIST_GLOSSARY` constant.

- [ ] **Step 2: Add guide content constant** (before `STRUCT_COLOR`)

```tsx
const WATCHLIST_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '워치리스트 종목들의 Stage2 점수를 내림차순으로 보여주는 스크리닝 화면입니다. 가장 좋은 셋업의 종목을 빠르게 찾을 수 있습니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Stage2 점수가 높을수록 기술적 조건이 좋은 종목입니다. Conviction 점수는 기술적(Stage2) + 소셜 심리 + 시장 Regime을 종합합니다. Checks 점 패턴으로 어떤 조건이 미달인지 한눈에 파악할 수 있습니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Stage2 ≥ 5인 종목 확인 → Conviction ≥ 60 추가 확인 → Entry 가격 근처에서 알람 설정 → DeepDive에서 세부 분석 후 진입 결정.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state, guide button, panel, and column InfoPopovers**

Inside `WatchlistBoard`, add:
```tsx
const [guideOpen, setGuideOpen] = useState(false);
```

Add to board container:
```tsx
<button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
<BoardGuidePanel title="Watchlist 가이드" sections={WATCHLIST_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

Find the table column header row and add InfoPopovers next to column labels:
```tsx
// Next to "Stage2" column header text:
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
  Stage2 <InfoPopover term={G.stage2.term} body={G.stage2.body} />
</span>

// Next to "RS" column header:
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
  RS <InfoPopover term={G.rs_score.term} body={G.rs_score.body} />
</span>

// Next to "Conviction" column header:
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
  Conviction <InfoPopover term={G.conviction.term} body={G.conviction.body} />
</span>
```

- [ ] **Step 4: Remove GlossaryPanel render**

Delete `<GlossaryPanel items={WATCHLIST_GLOSSARY} />` and its wrapper.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/boards/WatchlistBoard.tsx
git commit -m "feat: replace WatchlistBoard GlossaryPanel with InfoPopover + guide panel"
```

---

## Task 10: Update `MacroBoard`

**Files:**
- Modify: `frontend/components/boards/MacroBoard.tsx`

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
```
with:
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
```

Delete the entire `MACRO_GLOSSARY` constant.

- [ ] **Step 2: Add guide content constant** (before `SECTOR_SYMS`)

```tsx
const MACRO_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '시장을 움직이는 매크로 자산들(지수·채권·원자재·변동성)의 현황을 한눈에 파악하는 화면입니다. 어떤 자산군에 돈이 몰리는지 파악합니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: '섹터 모멘텀 바에서 강세 섹터를 먼저 확인합니다. 변동성(VIX), 신용(HYG/IEF), 금리(TNX), 달러(DXY) 순으로 읽으면서 전체 리스크 선호도를 파악합니다. 구조 라벨(UPTREND/DOWNTREND 등)이 각 심볼의 기술적 위치를 요약합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'VIX 20 이하 확인 → HYG/JNK 상승 추세(Risk-On) 확인 → 강세 섹터 내 종목 탐색 → DXY 약세면 수출·원자재주, 강세면 달러 수혜주 고려.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state, guide button, panel, and Card `info` props**

Inside `MacroBoard`, add:
```tsx
const [guideOpen, setGuideOpen] = useState(false);
```

Add to board container (outermost div with `position: 'relative'`):
```tsx
<button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
<BoardGuidePanel title="Macro 가이드" sections={MACRO_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

Find the Sector Momentum card and add:
```tsx
<Card title="Sector Momentum" ... info={G.sector_momentum}>
```

Find the Volatility group card (VIX) and add:
```tsx
info={G.vix_index}
```

- [ ] **Step 4: Remove GlossaryPanel render**

Delete `<GlossaryPanel items={MACRO_GLOSSARY} />` and its wrapper.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/boards/MacroBoard.tsx
git commit -m "feat: replace MacroBoard GlossaryPanel with InfoPopover + guide panel"
```

---

## Task 11: Update `SentimentBoard`

**Files:**
- Modify: `frontend/components/boards/SentimentBoard.tsx`

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';
```
with:
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
```

Delete the entire `SENTIMENT_GLOSSARY` constant.

- [ ] **Step 2: Add guide content constant** (before `TopNewsBox`)

```tsx
const SENTIMENT_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '소셜 미디어와 뉴스를 AI로 분석한 시장·종목별 심리 점수를 보여주는 화면입니다. 기술적 신호와 함께 읽으면 확신도를 높일 수 있습니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: '복합점수(−2~+2)가 핵심. +1.5 이상은 과열 주의, −1.5 이하는 역발상 매수 기회. Confidence가 LOW이면 데이터 신뢰도 낮음. 종목별 점수 클릭 시 최근 7일/30일 추이 차트를 볼 수 있습니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: '시장 전체 심리 먼저 확인 → 관심 종목 심리 확인 → 심리가 기술적 신호와 일치(예: Sniper 신호 + 심리 개선)하면 확신 높은 진입으로 판단.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state, guide button, panel, and Card `info` props**

Inside `SentimentBoard`, add:
```tsx
const [guideOpen, setGuideOpen] = useState(false);
```

Add to board container:
```tsx
<button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
<BoardGuidePanel title="Sentiment 가이드" sections={SENTIMENT_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

Find the Composite Score card and add:
```tsx
info={G.composite_score}
```

- [ ] **Step 4: Remove GlossaryPanel render**

Delete the block:
```tsx
      {/* 이 화면 데이터 설명 */}
      ...
        <GlossaryPanel items={SENTIMENT_GLOSSARY} />
      ...
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/boards/SentimentBoard.tsx
git commit -m "feat: replace SentimentBoard GlossaryPanel with InfoPopover + guide panel"
```

---

## Task 12: Update `DeepDiveBoard`

**Files:**
- Modify: `frontend/components/boards/DeepDiveBoard.tsx`

- [ ] **Step 1: Add imports**

Add at the top (no GlossaryPanel to remove):
```tsx
import { BoardGuidePanel, GuideSection } from '@/components/ui/BoardGuidePanel';
import { G } from '@/app/glossary';
```

- [ ] **Step 2: Add guide content constant**

```tsx
const DEEPDIVE_GUIDE: GuideSection[] = [
  {
    heading: '이 화면은',
    body: '선택한 종목의 모든 분석 지표를 한 화면에서 심층 검토하는 종합 분석 화면입니다. 진입 결정 전 최종 확인 화면으로 사용합니다.',
  },
  {
    heading: '핵심 지표 읽는 법',
    body: 'Row1 배지(Stage2/Conviction/월봉/구조)가 전체 품질을 요약합니다. Row2 KPI 4개(RS Score, 52W 이격, 조정폭, EMA200 기울기)가 Stage2 조건의 핵심. Row3 좌측 세력참여도에서 기관 매집 여부를, 우측 R:R에서 트레이드 계획을 확인합니다.',
  },
  {
    heading: '지금 이렇게 쓰세요',
    body: 'Row1 배지 전체 확인 → Row2 KPI(RS≥70, 조정≤10%) → Row3 세력참여도(세력점수≥60이면 매집 우위) → Row3 R:R(1:2 이상) → Row4 AI Brief(촉매 확인) → Row5 Regime ≥ 60 확인 → 진입.',
  },
];
```

- [ ] **Step 3: Add `guideOpen` state, guide button, panel, and Card `info` props**

Inside `DeepDiveBoard`, add:
```tsx
const [guideOpen, setGuideOpen] = useState(false);
```

Add to board container (outermost div with `position: 'relative'`):
```tsx
<button className="guide-btn" onClick={() => setGuideOpen(true)}>? 가이드</button>
<BoardGuidePanel title="DeepDive 가이드" sections={DEEPDIVE_GUIDE} isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
```

Add `info` props to relevant cards:
```tsx
// Stage2 체크리스트 card: info={G.stage2}
// Conviction badge card: info={G.conviction}
// 세력참여도 card: info={G.institutional_activity}
// R:R 진입계획 card: info={G.rr_ratio}
// RS Score KPI: info={G.rs_score}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/boards/DeepDiveBoard.tsx
git commit -m "feat: add InfoPopover + guide panel to DeepDiveBoard"
```

---

## Task 13: Delete `GlossaryPanel.tsx` + clean up CSS

**Files:**
- Delete: `frontend/components/ui/GlossaryPanel.tsx`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "GlossaryPanel\|GlossaryItem" frontend/components --include="*.tsx" --include="*.ts"
```

Expected output: no results. If any remain, fix them before proceeding.

- [ ] **Step 2: Delete the file**

```bash
rm frontend/components/ui/GlossaryPanel.tsx
```

- [ ] **Step 3: Remove `.glossary` CSS block from `globals.css`**

Remove the entire block from:
```css
/* ============================================================
   Glossary Panel — 일반인 친화적 데이터 설명
```
through the last `.glossary__plain { ... }` closing brace (approximately lines 775–822).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove GlossaryPanel component and CSS"
```

---

## Task 14: Visual verification

- [ ] **Step 1: Start dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify each board**

Check each of the 7 boards (Overview, Intraday, Daily, Watchlist, Macro, Sentiment, DeepDive):

1. No bottom accordion visible
2. `? 가이드` button visible in top-right
3. Clicking `? 가이드` opens slide-over panel with 3 sections
4. `✕` or outside click closes the panel
5. Card titles with `info` prop show ⓘ icon
6. Clicking ⓘ opens popover with term + body
7. Opening a second ⓘ closes the first

- [ ] **Step 3: Verify ⌘K glossary search**

1. Press `⌘K` to open palette
2. Type `?` — verify "용어 검색 모드" label appears
3. Type `? vix` — verify VIX-related glossary entries appear
4. Type `? stage` — verify Stage2 entries appear

- [ ] **Step 4: Verify no regressions**

Check that existing board functionality still works: chart rendering, signal display, data loading, watchlist sorting.

- [ ] **Step 5: Commit if any style fixes needed**

```bash
git add -A
git commit -m "fix: visual polish for contextual help system"
```
