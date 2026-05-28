# Dashboard Dedup & Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중복 카드 제거·교체 + ConvictionBadge 통일로 대시보드 일관성 향상 (API 변경 없음)

**Architecture:** 신규 공유 컴포넌트 ConvictionBadge를 먼저 만들고, 의존하는 보드 순으로 수정. OverviewBoard는 useIntraday/useDaily 훅 제거로 API 호출 감소 효과. DeepDiveBoard Row 3L은 기존 dailyData.candles에서 프론트엔드 계산으로 세력 참여도를 도출.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS variables (Plaid DS tokens)

---

## Task 1: ConvictionBadge 컴포넌트 생성

**Files:**
- Create: `frontend/components/ui/ConvictionBadge.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// frontend/components/ui/ConvictionBadge.tsx
'use client';

interface ConvictionBadgeProps {
  score: number | null | undefined;
  label?: string | null;
  size?: 'sm' | 'md';
}

function convStyle(s: number): { color: string; bg: string } {
  if (s >= 65) return { color: 'var(--bull)', bg: 'var(--bull-soft)' };
  if (s >= 50) return { color: 'var(--teal)', bg: 'rgba(20,184,166,0.12)' };
  if (s >= 35) return { color: 'var(--warn)', bg: 'var(--warn-soft)' };
  return { color: 'var(--bear)', bg: 'var(--bear-soft)' };
}

export function ConvictionBadge({ score, label, size = 'md' }: ConvictionBadgeProps) {
  if (score == null) return null;
  const { color, bg } = convStyle(score);
  const isSm = size === 'sm';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: isSm ? 4 : 5,
      padding: isSm ? '2px 6px' : '3px 9px',
      borderRadius: 20,
      background: bg,
      border: `1px solid ${color}`,
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: isSm ? 11 : 13, fontWeight: 700, color, lineHeight: 1 }}>
        {Math.round(score)}
      </span>
      {label && (
        <span style={{ fontSize: isSm ? 9 : 10, color, opacity: 0.75, lineHeight: 1 }}>
          {label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: 에러 없음 (또는 기존 에러만)

- [ ] **Step 3: Commit**

```bash
cd frontend && git add components/ui/ConvictionBadge.tsx
git commit -m "feat: add ConvictionBadge shared component"
```

---

## Task 2: WatchlistBoard + DailyBoard ConvictionBadge 적용

**Files:**
- Modify: `frontend/components/boards/WatchlistBoard.tsx`
- Modify: `frontend/components/boards/DailyBoard.tsx`

### WatchlistBoard

- [ ] **Step 1: import 추가**

`WatchlistBoard.tsx` 상단 import 블록에 추가:
```tsx
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
```

- [ ] **Step 2: Conviction 테이블 셀 교체**

아래 블록(테이블 td 안의 IIFE 전체)을 교체한다:

```tsx
// 제거할 기존 코드 (td 내부 전체)
{(() => {
  const s = w.conviction_score ?? 0;
  const c = s >= 65 ? 'var(--bull)'
          : s >= 50 ? 'var(--teal)'
          : s >= 35 ? 'var(--warn)'
          : 'var(--bear)';
  const bg = s >= 65 ? 'var(--bull-soft)'
           : s >= 50 ? 'rgba(20,184,166,0.12)'
           : s >= 35 ? 'var(--warn-soft)'
           : 'var(--bear-soft)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: bg, fontSize: 11 }}>
      <span style={{ fontWeight: 700, color: c, fontSize: 13 }}>{s > 0 ? s.toFixed(0) : '-'}</span>
      <span style={{ color: c, fontSize: 10 }}>{w.conviction_label ?? ''}</span>
    </div>
  );
})()}
```

```tsx
// 교체할 새 코드
<ConvictionBadge score={w.conviction_score ?? undefined} label={w.conviction_label} size="sm" />
```

### DailyBoard

- [ ] **Step 3: import 추가**

`DailyBoard.tsx` 상단 import 블록에 추가:
```tsx
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
```

- [ ] **Step 4: 차트 헤더 Conviction 배지 교체**

```tsx
// 제거할 기존 코드 (card__hd 내부)
{dailyData?.conviction_score != null && (() => {
  const s = dailyData.conviction_score;
  const bg = s >= 65 ? 'var(--bull)' : s >= 50 ? 'var(--teal)' : s >= 35 ? 'var(--warn)' : 'var(--bear)';
  return <span className="badge" style={{ background: bg, color: s >= 35 ? '#fff' : '#fff', marginLeft: 8 }}>Conviction {s}</span>;
})()}
```

```tsx
// 교체할 새 코드
<ConvictionBadge score={dailyData?.conviction_score} size="md" />
```

- [ ] **Step 5: Stage2 카드 내부 Conviction 박스 교체**

```tsx
// 제거할 기존 코드
{dailyData?.conviction_score != null && (() => {
  const s = dailyData.conviction_score;
  const c = s >= 65 ? 'var(--bull)' : s >= 50 ? 'var(--teal)' : s >= 35 ? 'var(--warn)' : 'var(--bear)';
  const bg = s >= 65 ? 'var(--bull-soft)' : s >= 50 ? 'rgba(20,184,166,0.12)' : s >= 35 ? 'var(--warn-soft)' : 'var(--bear-soft)';
  return (
  <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', minWidth: 70 }}>Conviction</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{s}</div>
    <div style={{ fontSize: 12, color: c }}>{dailyData.conviction_label}</div>
  </div>
  );
})()}
```

```tsx
// 교체할 새 코드
{dailyData?.conviction_score != null && (
  <div style={{ marginTop: 10 }}>
    <ConvictionBadge score={dailyData.conviction_score} label={dailyData.conviction_label} size="md" />
  </div>
)}
```

- [ ] **Step 6: TypeScript 확인 후 Commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
git add components/boards/WatchlistBoard.tsx components/boards/DailyBoard.tsx
git commit -m "refactor: apply ConvictionBadge to WatchlistBoard and DailyBoard"
```

---

## Task 3: OverviewBoard 카드 2개 교체 + ConvictionBadge 적용

**Files:**
- Modify: `frontend/components/boards/OverviewBoard.tsx`

### 3-1. 불필요 훅·임포트·변수 제거

- [ ] **Step 1: 훅 import 제거**

`OverviewBoard.tsx` 상단에서 아래 2줄 제거:
```tsx
import { useIntraday } from '@/hooks/useIntraday';
import { useDaily } from '@/hooks/useDaily';
```

- [ ] **Step 2: UI 컴포넌트 import 수정**

아래 2줄 제거:
```tsx
import { Sparkline } from '@/components/ui/Sparkline';
import { HeatStrip } from '@/components/ui/HeatStrip';
```

ConvictionBadge import 추가:
```tsx
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
```

- [ ] **Step 3: 훅 호출·변수 제거**

컴포넌트 본문에서 아래 블록 전체 제거:
```tsx
const { ohlcvData } = useIntraday(symbol, timeframe);
// ... 이하 관련 변수 전부
const candles = ohlcvData?.candles ?? [];
const signals = ohlcvData?.signals;
const indicators = ohlcvData?.indicators;
const lastCandle = candles[candles.length - 1];
const lastIdx = candles.length - 1;

const activeSignals = signals
  ? ['sniper', 'vcp', 'pullback', 'strong_trend', 'overbought', 'downtrend'].filter(
      k => signals[k as keyof typeof signals][lastIdx]
    )
  : [];

const dailyCandles = dailyData?.candles ?? [];
const dailyChg = dailyCandles.slice(-61).map((c, i, arr) => {
  if (i === 0) return 0;
  return ((c.close - arr[i - 1].close) / arr[i - 1].close) * 100;
}).slice(1);

const upDays   = dailyChg.filter(v => v > 0.05).length;
const downDays = dailyChg.filter(v => v < -0.05).length;
const avgChg   = dailyChg.length ? dailyChg.reduce((a, b) => a + b, 0) / dailyChg.length : 0;
const maxGain  = dailyChg.length ? Math.max(...dailyChg) : 0;
const maxLoss  = dailyChg.length ? Math.min(...dailyChg) : 0;
```

그리고 훅 호출도 제거:
```tsx
const { ohlcvData } = useIntraday(symbol, timeframe);
const { dailyData } = useDaily(symbol);
```

### 3-2. Symbol Intraday 카드 → 진입 레이더 교체

- [ ] **Step 4: Symbol Intraday 카드 블록 전체 교체**

아래 주석 블록(`{/* Symbol mini intraday */}`)과 그 `<Card>` 전체를 제거하고 아래로 교체:

```tsx
{/* 진입 레이더 */}
<Card title="진입 레이더" action="Entry 근접순">
  {watchlist.length === 0 ? (
    <div className="subtle">로딩 중...</div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[...watchlist]
        .map(w => ({ ...w, entryDist: w.entry > 0 ? (w.entry - w.price) / w.price * 100 : 999 }))
        .sort((a, b) => a.entryDist - b.entryDist)
        .map(w => {
          const inZone = w.entryDist > 0 && w.entryDist <= 5;
          const broken = w.entryDist <= 0;
          return (
            <div key={w.symbol} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px', borderRadius: 6,
              background: inZone ? 'var(--em-soft)' : 'transparent',
            }}>
              <span style={{ fontWeight: 600, width: 46, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>
                {w.symbol}
              </span>
              <ScorePill score={w.score} />
              <span style={{ flex: 1 }} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: broken ? 'var(--bull)' : inZone ? 'var(--em-500)' : w.entryDist > 15 ? 'var(--fg-subtle)' : 'var(--fg)',
              }}>
                {broken
                  ? <span className="badge bull" style={{ fontSize: 10 }}>돌파</span>
                  : `+${w.entryDist.toFixed(1)}%`}
              </span>
            </div>
          );
        })}
      <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-soft)' }}>
        ≤5% = 진입 가능 Zone
      </div>
    </div>
  )}
</Card>
```

### 3-3. Daily Heat 카드 → Conviction 리더보드 교체

- [ ] **Step 5: Daily Heat 카드 블록 전체 교체**

`{/* Daily Heat Strip */}` 주석 블록과 해당 `<Card>` 전체를 제거하고 아래로 교체:

```tsx
{/* Conviction 리더보드 */}
<Card title="Conviction 리더보드" action="확신도 순">
  {watchlist.length === 0 ? (
    <div className="subtle">로딩 중...</div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {[...watchlist]
        .sort((a, b) => (b.conviction_score ?? 0) - (a.conviction_score ?? 0))
        .map(w => {
          const s = w.conviction_score ?? 0;
          const color = s >= 65 ? 'var(--bull)' : s >= 50 ? 'var(--teal)' : s >= 35 ? 'var(--warn)' : 'var(--bear)';
          return (
            <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <span style={{ fontWeight: 600, width: 46, fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>{w.symbol}</span>
              <div className="bar" style={{ flex: 1 }}>
                <div className="bar__fill" style={{ width: `${s}%`, background: color }} />
              </div>
              <ConvictionBadge score={w.conviction_score ?? undefined} label={w.conviction_label} size="sm" />
            </div>
          );
        })}
    </div>
  )}
</Card>
```

### 3-4. Watchlist Top 3 ConvictionBadge 적용

- [ ] **Step 6: Watchlist Top 3 카드 내 텍스트 → ConvictionBadge**

아래 블록 교체:
```tsx
// 제거
{w.conviction_score != null && (
  <span style={{ fontSize: 10, marginLeft: 4, color: w.conviction_score >= 65 ? 'var(--bull)' : 'var(--teal)' }}>
    C:{w.conviction_score}
  </span>
)}
```

```tsx
// 교체
<ConvictionBadge score={w.conviction_score ?? undefined} size="sm" />
```

- [ ] **Step 7: TypeScript 확인 후 Commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
git add components/boards/OverviewBoard.tsx
git commit -m "feat: replace Symbol Intraday+DailyHeat with 진입레이더+Conviction리더보드 in Overview"
```

---

## Task 4: DeepDiveBoard 전체 수정

**Files:**
- Modify: `frontend/components/boards/DeepDiveBoard.tsx`

이 태스크는 4개 변경(Change 1·3·4·5)을 하나의 파일에서 처리한다.

### 4-1. import 추가

- [ ] **Step 1: ConvictionBadge import 추가**

`DeepDiveBoard.tsx` 상단 import 블록에 추가:
```tsx
import { ConvictionBadge } from '@/components/ui/ConvictionBadge';
```

Sparkline import는 더 이상 필요 없으므로 제거:
```tsx
// 제거
import { Sparkline } from '@/components/ui/Sparkline';
```

### 4-2. Change 5 — 종목 버튼 패딩 축소

- [ ] **Step 2: 버튼 padding·fontSize 수정**

Zone 0 종목 버튼 스타일에서:
```tsx
// 변경 전
padding: '5px 13px', ... fontSize: 12

// 변경 후
padding: '4px 9px', ... fontSize: 11.5
```

정확히 해당하는 style 객체 두 값만 교체한다.

### 4-3. Change 4 — ConvictionBadge 적용 (Zone 0)

- [ ] **Step 3: cvColor 변수 제거**

컴포넌트 데이터 파생부에서 아래 줄 제거:
```tsx
const cvColor = cv == null ? 'var(--fg-muted)'
  : cv >= 65 ? 'var(--bull)' : cv >= 50 ? 'var(--teal)' : cv >= 35 ? 'var(--warn)' : 'var(--bear)';
```

- [ ] **Step 4: Zone 0 배지 교체**

아래 블록 교체:
```tsx
// 제거
{cv != null && (
  <div style={{
    padding: '3px 9px', borderRadius: 20,
    border: `1px solid ${cvColor}`, fontSize: 11, fontWeight: 700, color: cvColor,
    display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  }}>
    <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontWeight: 500 }}>C</span>{cv}
  </div>
)}
```

```tsx
// 교체
<ConvictionBadge score={cv} label={dailyData?.conviction_label} size="md" />
```

- [ ] **Step 5: Stage2 카드 헤더 교체**

아래 블록 교체:
```tsx
// 제거
{cv != null && (
  <span style={{ fontSize: 11, fontWeight: 700, color: cvColor, marginLeft: 2 }}>
    C:{cv} <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--fg-subtle)' }}>{dailyData?.conviction_label}</span>
  </span>
)}
```

```tsx
// 교체
<ConvictionBadge score={cv} label={dailyData?.conviction_label} size="md" />
```

### 4-4. Change 1 — Zone 0 스파크라인 제거 + KPI 3개 추가

- [ ] **Step 6: 세력 참여도 계산 변수 추가**

컴포넌트 데이터 파생부 (gcBadges/patBadges 정의 직후)에 아래 블록 추가:

```tsx
// ── 세력 참여도 계산 (Row 3L용)
const forceData = (() => {
  const dc = dailyData?.candles;
  if (!dc || dc.length < 20) return null;
  const r20 = dc.slice(-20);
  const r10 = dc.slice(-10);
  const r5  = dc.slice(-5);
  const upVol   = r20.filter(c => c.close >= c.open).reduce((s, c) => s + c.volume, 0);
  const downVol = r20.filter(c => c.close < c.open).reduce((s, c) => s + c.volume, 0);
  const vol20avg = r20.reduce((s, c) => s + c.volume, 0) / 20;
  const vol5avg  = r5.reduce((s, c) => s + c.volume, 0) / 5;
  const volTrendRatio = vol20avg > 0 ? vol5avg / vol20avg : 1;
  const accDays  = r10.filter(c => c.volume > vol20avg && c.close >= c.open).length;
  const distDays = r10.filter(c => c.volume > vol20avg && c.close < c.open).length;
  const udRatio  = downVol > 0 ? upVol / downVol : upVol > 0 ? 9 : 1;
  const udScore    = Math.min(50, Math.max(0, (udRatio - 0.5) / 1.5 * 50));
  const accScore   = Math.min(30, Math.max(0, (accDays - distDays + 5) / 10 * 30));
  const trendScore = volTrendRatio < 0.8 ? 20 : volTrendRatio < 1.0 ? 12 : volTrendRatio < 1.3 ? 8 : 4;
  const forceScore = Math.round(udScore + accScore + trendScore);
  const maxVol = Math.max(...r20.map(c => c.volume), 1);
  return { r20, r10, upVol, downVol, vol20avg, volTrendRatio, accDays, distDays, udRatio, forceScore, maxVol };
})();
```

- [ ] **Step 7: Zone 0 스파크라인 블록 제거 + KPI 타일 추가**

아래 스파크라인 블록 전체 제거:
```tsx
{candles.length > 10 && (
  <div style={{ maxWidth: 180, flexShrink: 0 }}>
    <Sparkline values={candles.slice(-60).map(c => c.close)} width={180} height={36} strokeWidth={1.5} />
  </div>
)}
```

제거한 자리(가격 블록 `</div>` 직후, 우측 배지 그룹 `<div>` 직전)에 아래 삽입:

```tsx
{/* Zone 0 인트라데이 KPI 3개 */}
{lastCandle && (() => {
  const tiles: { label: string; value: string; color: string; sub?: string }[] = [];

  // 1D 변화율 (일봉 기준)
  const dc = dailyData?.candles;
  if (dc && dc.length >= 2) {
    const chg = ((dc[dc.length - 1].close - dc[dc.length - 2].close) / dc[dc.length - 2].close) * 100;
    tiles.push({
      label: '1D 변화',
      value: `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`,
      color: chg >= 0 ? 'var(--bull)' : 'var(--bear)',
    });
  }

  // 일중 위치 (최근 78봉 ≈ 오늘 하루)
  if (candles.length > 1) {
    const slice = candles.slice(-78);
    const dayHigh = Math.max(...slice.map(c => c.high));
    const dayLow  = Math.min(...slice.map(c => c.low));
    const range = dayHigh - dayLow;
    if (range > 0) {
      const pos = ((lastCandle.close - dayLow) / range) * 100;
      tiles.push({
        label: '일중 위치',
        value: `${pos.toFixed(0)}%`,
        color: pos >= 70 ? 'var(--bull)' : pos <= 30 ? 'var(--bear)' : 'var(--fg)',
        sub: pos >= 70 ? '상단 유지' : pos <= 30 ? '하단 압박' : '중간',
      });
    }
  }

  // EMA21 이격 %
  if (indicators && indicators.ema21[lastIdx]) {
    const ema21 = indicators.ema21[lastIdx]!;
    const pct = ((lastCandle.close - ema21) / ema21) * 100;
    tiles.push({
      label: 'EMA21 이격',
      value: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      color: Math.abs(pct) >= 3 ? 'var(--warn)' : pct >= 0 ? 'var(--teal)' : 'var(--fg-muted)',
      sub: pct >= 3.2 ? '과열권' : pct <= -2 ? '지지 접근' : undefined,
    });
  }

  if (tiles.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
      {tiles.map(t => (
        <div key={t.label} style={{
          padding: '5px 10px', borderRadius: 8,
          background: 'var(--card-elev)', border: '1px solid var(--border-soft)',
          minWidth: 68,
        }}>
          <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>
            {t.label}
          </div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: t.color, lineHeight: 1.1 }}>
            {t.value}
          </div>
          {t.sub && <div style={{ fontSize: 9, color: t.color, opacity: 0.8, marginTop: 1 }}>{t.sub}</div>}
        </div>
      ))}
    </div>
  );
})()}
```

### 4-5. Change 3 — Row 3L: Daily Heat → 세력 참여도 분석

- [ ] **Step 8: Daily Heat 카드 전체 교체**

ROW 3 LEFT 주석 블록(`{/* ════ ROW 3 LEFT — Daily Heat 60d ════ */}`)과 해당 `<div className="card">` 전체를 제거하고 아래로 교체:

```tsx
{/* ════════════════════════════════════════════════════════════════
    ROW 3 LEFT — 세력 참여도 분석
════════════════════════════════════════════════════════════════ */}
<div className="card">
  <div className="card__hd">
    <h3>세력 참여도 · {symbol}</h3>
    {forceData && (() => {
      const { forceScore } = forceData;
      const cls = forceScore >= 70 ? 'bull' : forceScore >= 50 ? 'teal' : forceScore >= 30 ? 'warn' : 'bear';
      const lbl = forceScore >= 70 ? '집중 매수' : forceScore >= 50 ? '매수 우위' : forceScore >= 30 ? '혼조' : '분산 매도';
      return <span className={`badge ${cls}`}>{lbl}</span>;
    })()}
    <small>20일 거래량 패턴</small>
  </div>
  <div className="card__bd">
    {forceData ? (() => {
      const { r20, r10, vol20avg, volTrendRatio, accDays, distDays, udRatio, forceScore, maxVol } = forceData;
      const scoreColor = forceScore >= 70 ? 'var(--bull)' : forceScore >= 50 ? 'var(--teal)' : forceScore >= 30 ? 'var(--warn)' : 'var(--bear)';
      return (
        <>
          {/* 섹션 1: 거래량 스파크라인 20봉 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 52, marginBottom: 10 }}>
            {r20.map((c, i) => {
              const up = c.close >= c.open;
              const h = Math.max(3, (c.volume / maxVol) * 48);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ height: h, borderRadius: 2, background: up ? 'var(--bull)' : 'var(--bear)', opacity: 0.75 }} />
                </div>
              );
            })}
          </div>

          {/* 섹션 2: 핵심 지표 3개 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            {/* Up/Down Vol 비율 */}
            <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>매수/매도량</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: udRatio >= 1.3 ? 'var(--bull)' : udRatio < 0.7 ? 'var(--bear)' : 'var(--fg)' }}>
                {udRatio >= 9 ? '9+' : udRatio.toFixed(1)}×
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>
                {udRatio >= 1.3 ? '매수 우위' : udRatio < 0.7 ? '매도 우위' : '균형'}
              </div>
            </div>
            {/* 거래량 추세 */}
            <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>거래량 추세</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: volTrendRatio < 0.8 ? 'var(--bull)' : volTrendRatio > 1.2 ? 'var(--warn)' : 'var(--fg)' }}>
                {volTrendRatio < 0.8 ? '▽' : volTrendRatio > 1.2 ? '△' : '→'} {volTrendRatio.toFixed(2)}×
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>
                {volTrendRatio < 0.8 ? 'VCP 수축' : volTrendRatio > 1.2 ? '활발' : '보통'}
              </div>
            </div>
            {/* 세력 집중일 */}
            <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--card-elev)', border: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>집중일 (10일)</div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
                <span style={{ color: 'var(--bull)' }}>{accDays}acc</span>
                <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>/</span>
                <span style={{ color: 'var(--bear)' }}>{distDays}dist</span>
              </div>
              <div style={{ fontSize: 9.5, color: accDays > distDays ? 'var(--bull)' : distDays > accDays ? 'var(--bear)' : 'var(--fg-muted)' }}>
                {accDays > distDays ? '매집 우세' : distDays > accDays ? '분산 우세' : '중립'}
              </div>
            </div>
          </div>

          {/* 섹션 3: 세력 점수 바 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>세력 점수</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>{forceScore} / 100</span>
            </div>
            <div className="bar">
              <div className="bar__fill" style={{ width: `${forceScore}%`, background: scoreColor }} />
            </div>
          </div>

          {/* 섹션 4: 최근 10일 acc/dist 미니 그리드 */}
          <div>
            <div style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>최근 10일 세력 행동</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {r10.map((c, i) => {
                const isAcc  = c.volume > vol20avg && c.close >= c.open;
                const isDist = c.volume > vol20avg && c.close < c.open;
                return (
                  <div key={i} style={{
                    flex: 1, height: 14, borderRadius: 3,
                    background: isAcc ? 'var(--bull)' : isDist ? 'var(--bear)' : 'var(--bg-subtle)',
                    border: `1px solid ${isAcc ? 'var(--bull)' : isDist ? 'var(--bear)' : 'var(--border)'}`,
                    opacity: isAcc || isDist ? 0.8 : 0.45,
                  }} />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 9.5, color: 'var(--fg-subtle)' }}>
              <span><span style={{ color: 'var(--bull)' }}>■</span> 매집</span>
              <span><span style={{ color: 'var(--bear)' }}>■</span> 분산</span>
              <span>□ 보통 (큰거래량 기준)</span>
            </div>
          </div>
        </>
      );
    })() : <div className="subtle">{chartLoading ? '로딩 중...' : '데이터 부족 (20일 미만)'}</div>}
  </div>
</div>
```

- [ ] **Step 9: TypeScript 확인**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음. 에러 있으면 메시지 보고 수정.

- [ ] **Step 10: Commit**

```bash
cd frontend && git add components/boards/DeepDiveBoard.tsx
git commit -m "feat: redesign DeepDive Zone0 KPIs, add 세력참여도 card, apply ConvictionBadge"
```

---

## Self-Review Checklist

- [ ] **Spec 커버리지**
  - Change 1 (Zone 0 스파크라인→KPI): Task 4 Step 6-7 ✓
  - Change 2 (Overview 카드 교체): Task 3 Step 4-5 ✓
  - Change 3 (Daily Heat→세력참여도): Task 4 Step 8 ✓
  - Change 4 (ConvictionBadge 6곳): Task 1 + Task 2(2곳) + Task 3(1곳) + Task 4(2곳) = 6곳 ✓
  - Change 5 (버튼 패딩 축소): Task 4 Step 2 ✓

- [ ] **플레이스홀더**: 없음

- [ ] **타입 일관성**
  - `ConvictionBadge` props: `score: number | null | undefined` — 모든 호출처에서 `?? undefined` 패턴으로 통일 ✓
  - `forceData` 변수: Task 4 Step 6에서 정의, Step 8에서 사용 ✓
  - `dailyData?.candles` 인덱스: `dc.length >= 2` 가드 포함 ✓
