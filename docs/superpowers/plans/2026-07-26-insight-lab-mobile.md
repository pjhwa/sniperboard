# Insight Lab 모바일 대응 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iOS/Android에서 Insight Lab(통찰 랩) 보드를 스크롤 가능한 단일 컬럼으로 읽고, 핵심 KPI(표본 n·신뢰도·Δ)를 한 눈에 확인하며, 넓은 표는 가로 스크롤/카드화로 손실 없이 볼 수 있게 한다.

**Status (2026-07-26):** Desktop Insight Lab shipped (`GET /api/insight`, `InsightBoard.tsx`, rail `insight`). **Mobile not yet optimized** — this plan is deferred follow-up.

**Architecture:** 기존 `max-width: 767px` 모바일 셸(BottomTabs · hide-mobile Rail · board flex 단일 컬럼)을 재사용한다. Insight 전용 레이아웃 변경은 `InsightBoard.tsx` + `globals.css`에 한정한다. API/스키마 변경은 원칙적으로 불필요(선택: 모바일 요약 필드).

**Tech Stack:** Next.js 16, React 19, existing mobile CSS (`globals.css` `@media (max-width:767px)`), `BottomTabs`, `env(safe-area-inset-bottom)`

**Related:** [2026-05-30-mobile-responsive.md](./2026-05-30-mobile-responsive.md) (셸 기반), Insight desktop: `frontend/components/boards/InsightBoard.tsx`, `frontend/hooks/useInsight.ts`

---

## 현황 · 갭

| 영역 | Desktop | Mobile 현재 | 목표 |
|------|---------|-------------|------|
| 진입 | Rail 전구 아이콘 | **BottomTabs에 없음** — 직접 진입 불가 | 탭 또는 「더보기」로 진입 |
| 레이아웃 | flex column + 2열 그리드 | `mob-wrap`만 있고 order/접기 없음 | 1열 · Big→Detail 순서 |
| MVP 표 | 넓은 `table.tbl` | 가로 넘침 가능 | sticky 첫 열 또는 카드 행 |
| 컨트롤 | window + Refresh | 터치 타깃 작을 수 있음 | 44px 터치 · 상단 고정 옵션 |
| 로딩 | 최초 ~1–2s (서버 캐시 후 빠름) | 동일 API | 스켈레톤 + 진행 문구 유지 |
| 정합/고지 | 상단 배너 | 읽기 가능하나 길음 | 접힘 `details` + 요약 배지 |

---

## 정보 우선순위 (모바일 Big → Detail)

1. **고지 한 줄** + 정합 배지 (fail/warn count)  
2. **MVP-1 대비 한 줄** — bullish vs none 5d Δ · n · confidence  
3. **MVP-2 buy/avoid 적중** — 두 숫자 카드  
4. **MVP-4 현재 judgment** + pre→post 평균 Δ  
5. (접기) 전체 다이버전스 표 · action 표 · 테마 표 · 전환 타임라인 · 방법론 전문  

원칙: 모바일 첫 화면에서 **“이 구간 edge 있나? 표본 충분한가?”** 만 답하고, 표 전문은 아래로 스크롤/접기.

---

## 파일 구조

| 파일 | 작업 |
|------|------|
| `frontend/components/shell/BottomTabs.tsx` | Insight 진입 경로 추가 (탭 교체 또는 overflow 메뉴) |
| `frontend/components/boards/InsightBoard.tsx` | `mob-order-*`, `details.mob-collapse`, 모바일 카드 행, 터치 컨트롤 |
| `frontend/app/globals.css` | Insight 모바일 표/카드 유틸 (필요 시) |
| `frontend/components/shell/CommandPalette.tsx` | 이미 Insight nav 있음 — 모바일 ⌘K 대체 UI 확인 |
| `README.md` / `PROJECT_CONTEXT.md` | 모바일 4탭→진입 경로 문서 갱신 |
| (선택) `backend/services/insight_service.py` | `summary` 블록 추가해 모바일 첫 paint 경량화 |

---

## Task 1: 모바일 진입점

**Files:**
- Modify: `frontend/components/shell/BottomTabs.tsx`
- Modify: `frontend/hooks/useStore.ts` (이미 `insight` Board 타입 존재)

**결정 (구현 시 하나 선택):**

| 옵션 | 내용 | 장단 |
|------|------|------|
| **A (권장)** | BottomTabs 5번째 탭을 Insight로 두거나 Sentiment를 overflow에 두고 Insight 승격 | 발견성 최고 / 탭 과밀 |
| **B** | 「더보기」 시트: Insight · Track · Backtest · Macro | 탭 4개 유지 / 1탭 추가 클릭 |
| **C** | Topbar 보드 이름 탭 → 보드 피커 시트 | 셸 공통 / 구현량 중간 |

- [ ] **Step 1:** 옵션 A/B/C 확정 (기본 권장 **B** — Briefing/Market/Watch/Sentiment 유지, 더보기에 Insight)  
- [ ] **Step 2:** BottomTabs 또는 Topbar 피커에 `setBoard('insight')` 연결  
- [ ] **Step 3:** active 상태 시 하단 탭 하이라이트 (더보기 경유 시 부모 탭 점등 규칙 정의)  
- [ ] **Step 4:** iPhone Safari 실기기에서 탭 → Insight 로드 확인  

---

## Task 2: InsightBoard 모바일 레이아웃

**Files:**
- Modify: `frontend/components/boards/InsightBoard.tsx`
- Modify: `frontend/app/globals.css` (필요 시)

- [ ] **Step 1:** 루트 `.board` 가 이미 flex column — 내부 `gridTemplateColumns: 1fr 1fr` 블록에 `mob-wrap` + 모바일 1열 강제 확인  
- [ ] **Step 2:** 섹션 순서 `mob-order-1..n`  
  1. 헤더·window/horizon  
  2. 고지 (details 접기, 기본 닫힘 on mobile)  
  3. Integrity 배지 + Source 1줄  
  4. **Mobile hero KPI** (신규 블록, desktop `mob-hide` / mobile only `mob-show`)  
  5. MVP-1 표  
  6. MVP-2  
  7. MVP-3  
  8. MVP-4  
- [ ] **Step 3:** Hero KPI 카드 (mobile only)

```tsx
// 의사코드 — 실제 필드는 useInsight payload 기준
// Δ bullish−none @5d | buy dir hit | avoid dir hit | macro current | pre→post avgΔ
```

- [ ] **Step 4:** `select` / Refresh 버튼 `min-height: 44px`, 가로 스크롤 없이 wrap  
- [ ] **Step 5:** 로딩 중 전체 높이 스피너 대신 상단 고정 진행 텍스트 (safe-area 고려)  

---

## Task 3: 표 → 모바일 친화

**Files:**
- Modify: `InsightBoard.tsx`
- Optional CSS: `.insight-table-scroll`, `.insight-row-card`

- [ ] **Step 1:** 모든 `table.tbl` 를 `overflow-x: auto; -webkit-overflow-scrolling: touch` 래퍼로 감싸기 (이미 일부 있음 — 통일)  
- [ ] **Step 2:** MVP-1 행을 `max-width:767px` 에서 **카드 리스트** 대안 렌더  

```
[bullish_divergence]
events 411
3d  avg · n · hit+
5d  ...
10d ...
confidence badge · interpretation
```

- [ ] **Step 3:** MVP-2 는 이미 2열 → 모바일 1열; action 행을 칩+숫자 2줄로  
- [ ] **Step 4:** MVP-3 테마 문자열 `line-clamp: 2` + 탭 시 전체 펼침  
- [ ] **Step 5:** 가로 스크롤 표는 첫 열 `position: sticky; left: 0; background: var(--card)` (선택)  

---

## Task 4: 성능 · 데이터 (모바일 네트워크)

**Files:**
- Optional: `backend/services/insight_service.py`, `backend/api/endpoints.py`
- Optional: `frontend/hooks/useInsight.ts`

- [ ] **Step 1:** 서버 15분 캐시 유지 확인 — 모바일 재방문 시 `build_ms` 낮음  
- [ ] **Step 2 (선택):** `GET /api/insight?summary=1` 또는 payload 내 `mobile_summary` 필드  

```json
{
  "mobile_summary": {
    "delta_bullish_vs_none_5d": -0.016,
    "n_a": 361,
    "n_b": 115,
    "buy_hit": 0.38,
    "avoid_hit": 0.57,
    "macro_current": "MIXED",
    "pre_post_avg_delta": 0.15,
    "integrity_passed": true
  }
}
```

- [ ] **Step 3:** 모바일 첫 페인트는 summary만, 「전체 표 보기」 시 full refetch 또는 이미 받은 full 사용  
- [ ] **Step 4:** `days` 기본값을 모바일에서 45로 줄이는 옵션 (CPU/JSON 크기) — UX 토글로 유지  

---

## Task 5: 접근성 · 안전영역 · QA

- [ ] **Step 1:** 하단 탭 + safe-area — Insight 스크롤 끝 콘텐츠가 탭에 가리지 않는지 (`padding-bottom`)  
- [ ] **Step 2:** 다크/라이트 대비 (배지·음수 수익 색)  
- [ ] **Step 3:** 가로 모드 767px 경계 — 태블릿은 desktop 그리드 유지  
- [ ] **Step 4:** 실기기 체크리스트  

| 기기 | 확인 |
|------|------|
| iPhone Safari | 진입 · 스크롤 · 표 가로 스와이프 · 탭 전환 |
| Android Chrome | 동일 |
| 느린 3G throttle | 로딩 문구 · 캐시 2회차 |

- [ ] **Step 5:** Playwright mobile viewport (`390×844`) 스모크: board=insight 시 hero KPI visible, 표 overflow not clipped by board flex  

---

## Task 6: 문서 · 회귀

- [ ] **Step 1:** `README.md` Mobile Support 표에 Insight 행 추가  
- [ ] **Step 2:** `PROJECT_CONTEXT.md` BottomTabs / InsightBoard 모바일 노트  
- [ ] **Step 3:** Desktop Insight 레이아웃 회귀 (2열 integrity/source, MVP 표)  
- [ ] **Step 4:** `/api/insight` integrity 테스트 기존 suite 유지  

---

## 비범위 (Out of scope)

- Insight 계산 로직 변경 (MVP-1..4 의미 변경 금지 — 모바일은 **표시만**)  
- BottomTabs 전체 IA 리디자인 (Track/Backtest 전부 1차 탭화)  
- 네이티브 앱 / PWA 설치 배너  
- 오프라인 MSD 동기화  

---

## 구현 순서 요약

```
Task1 진입점 → Task2 레이아웃/hero → Task3 표 카드화 → Task4(선택) summary API → Task5 QA → Task6 문서
```

**예상 공수:** Task1–3 집중 시 0.5–1 dev-day; Task4 포함 시 +0.5 day.

**완료 정의:**  
모바일에서 BottomTabs(또는 더보기)로 Insight 진입 → hero KPI 4개 이상 표시 → MVP 표를 가로 스크롤 또는 카드로 끝까지 읽기 → integrity/disclaimer 접근 가능 → desktop 깨짐 없음.

---

## 참고: 현재 데스크톱 검증 기준 (모바일도 동일 문구 유지)

- 방법론: 신호일 T 종가 진입, `close[T+N]/close[T]−1`, 룩어헤드 없음  
- 소표본: `honest_gap` / confidence 배지 필수 표시  
- edge 없음도 **숨기지 않음** (bullish vs none Δ 음수 시 “우위 없음” 카피)  
- 투자 권유 문구 금지 (disclaimer 유지)  
