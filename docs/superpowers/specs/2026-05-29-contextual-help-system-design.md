# Contextual Help System — Design Spec

**Date:** 2026-05-29
**Status:** Approved

---

## Problem

Every board has a `GlossaryPanel` accordion at the bottom: a "? 이 화면 데이터 설명 ▼" toggle that expands a flat list of term/explanation pairs. This approach has three compounding failures:

1. **Discoverability** — buried at the bottom, requires scrolling to find
2. **No context** — a flat list disconnected from the specific metric the user is confused about
3. **No information hierarchy** — beginner explanations and technical details mixed into one line of text per term, no structure

---

## Goals

- Surface explanations at the point of confusion (next to the metric itself)
- Support both beginner traders (what does RSI mean?) and intermediate traders (how does this app calculate Stage2?)
- Remove the need to scroll to the bottom of any board for help
- Make the help system feel modern and integrated, not bolted-on

---

## Non-Goals

- Per-user personalization of explanation depth
- Video or animated walkthroughs
- External documentation links

---

## Solution: Three-Layer Help System

### Layer 1 — ⓘ Inline Popover (point-of-confusion help)

A small `ⓘ` icon placed next to individual metric titles and card section headers. Clicking it opens a popover with a single well-written paragraph that blends beginner-friendly language with technical detail naturally — no tabs, no toggles.

**Interaction:**
- Click to open, click again or click outside to close
- `Escape` key closes
- Only one popover open at a time (opening a second closes the first)
- Position: below icon by default, above if insufficient viewport space below

**Visual spec:**
- Icon: 14px, `var(--fg-subtle)` color, inline after title text
- Popover: max-width 280px, natural height, `var(--bg-card)` background, `var(--border)` border, `var(--radius-md)` border-radius
- Title line: `term` in semibold
- Body: `body` string, 1 paragraph, `var(--fg)` color, 13px

**Placement per board:**

| Board | ⓘ locations |
|-------|-------------|
| Overview | Risk Regime, Distribution Days, VIX 백워데이션, Breadth, Credit Stress, Sector Momentum, Conviction |
| DeepDive | Stage2 checklist (each item), 세력참여도, Conviction badge, R:R panel |
| Daily | Stage2 score, GC status, R:R panel |
| Intraday | Each of the 6 signals (VCP, Sniper, Pullback, StrongTrend, Overbought, Downtrend) |
| Watchlist | Table column headers (Stage2, RS Score, GC, Conviction) |
| Macro | Structure labels (Breakout/Uptrend/etc.), Sector Momentum |
| Sentiment | Composite Score, distribution bar, social sentiment |

### Layer 2 — Board Guide Panel (board-level deep dive)

A `? 가이드` button in the **top-right corner** of each board's content area. Clicking it opens a slide-over panel from the right side.

**Panel structure (same for all boards):**
1. **이 화면은** — one sentence: what this board is for
2. **핵심 지표 읽는 법** — prose: how the metrics relate to each other and what order to read them in
3. **지금 이렇게 쓰세요** — practical workflow: "Start with X → check Y → if Z then..."

**Interaction:**
- Slides in from right, overlays on top of Rail (high z-index)
- `✕` button closes, clicking outside closes
- Board content remains visible (not replaced)

### Layer 3 — ⌘K Glossary Search

Extend the existing `CommandPalette` with a glossary search mode triggered by typing `?` as the first character.

- `?` prefix → switches to glossary search mode
- Remaining text filters glossary terms by name and body
- Results show term name + first sentence of body
- Selecting a result displays the full body inline in the palette

---

## Component Architecture

### New Components

**`components/ui/InfoPopover.tsx`**
```
Props:
  term: string        — title shown in popover
  body: string        — explanation paragraph
  className?: string  — for positioning context

State:
  open: boolean

Behavior:
  - Renders ⓘ trigger icon inline
  - Manages open/close via click + outside click + Escape
  - Uses a global singleton to close other open popovers
```

**`components/ui/BoardGuidePanel.tsx`**
```
Props:
  title: string
  sections: { heading: string; body: string }[]

State:
  open: boolean (controlled by parent via isOpen + onClose)

Behavior:
  - Slide-over from right
  - Overlay backdrop (semi-transparent)
  - Scroll internally if content exceeds viewport height
```

### Modified Components

**`components/shell/CommandPalette.tsx`**
- Add `?` prefix detection
- Import and filter against a central `GLOSSARY` constant
- Render term + truncated body in results list

**Each board component (6 files)**
- Remove `GlossaryPanel` import and render
- Add `BoardGuidePanel` with board-specific content
- Add `InfoPopover` instances at metric titles

### Removed Components

**`components/ui/GlossaryPanel.tsx`** — deleted entirely after all board references removed

### Data

**`app/glossary.ts`** — new file, single source of truth for all term/body pairs
- Consumed by `InfoPopover` instances (inline import of specific entries)
- Consumed by `CommandPalette` for `?` search (imports full list)
- `BoardGuidePanel` content defined inline per board (narrative, not term lookups)

---

## Content Format

Each glossary entry:
```ts
{
  term: string,   // e.g. "Risk Regime (리스크 레짐)"
  body: string    // 1 paragraph, ~2-4 sentences
                  // Pattern: plain explanation first, then technical detail naturally woven in
                  // Example: "시장이 지금 얼마나 투자하기 좋은지를 5가지 요소로 종합한 점수입니다.
                  //           추세(EMA200), 시장폭(RSP/SPY), 신용(HYG/IEF), 변동성(VIX), 모멘텀(20일 방향)을
                  //           각각 채점해 합산하며, 100에 가까울수록 강세 환경입니다."
}
```

No separate beginner/intermediate fields. The single body paragraph achieves both by:
1. Opening with the plain-language "what it means"
2. Naturally mentioning the specific tickers/formulas/thresholds in the same breath

---

## Migration Plan

1. Build `InfoPopover` + `BoardGuidePanel` components
2. Create `app/glossary.ts` with all term/body content (migrated + expanded from existing GLOSSARY arrays)
3. Add `InfoPopover` instances to all 7 boards
4. Add `BoardGuidePanel` to all 7 boards
5. Extend `CommandPalette` with `?` mode
6. Remove `GlossaryPanel` imports and renders from the 6 boards that use it (Overview, DeepDive excluded — it never had one)
7. Delete `GlossaryPanel.tsx`

---

## Success Criteria

- No board has a bottom accordion
- Every metric that previously had a glossary entry now has an ⓘ icon within 2px of its title
- Board guide panel opens and closes without layout shift
- ⌘K `?` search returns relevant results for all existing glossary terms
- Zero regressions in existing board interactions
