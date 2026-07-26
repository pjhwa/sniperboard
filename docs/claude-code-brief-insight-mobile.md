# Claude Code 개발지침서 — Insight Lab 모바일 대응

> **세션 시작 시 이 문서를 그대로 프롬프트/컨텍스트로 사용해도 된다.**  
> 상세 태스크 체크리스트: [`docs/superpowers/plans/2026-07-26-insight-lab-mobile.md`](./superpowers/plans/2026-07-26-insight-lab-mobile.md)  
> 프로젝트 전역 규칙: 루트 [`CLAUDE.md`](../CLAUDE.md) · [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) · [`README.md`](../README.md)

**작성일:** 2026-07-26  
**브랜치 권장:** `feat/insight-lab-mobile` (from `main`)  
**완료 정의:** 모바일(≤767px)에서 Insight Lab 진입·읽기·표 확인 가능 + 데스크톱 회귀 없음 + 문서 갱신 커밋

---

## 0. 미션 (한 줄)

**이미 배포된 Insight Lab(데스크톱)을 모바일에서 쓸 수 있게 한다.**  
계산 의미(MVP-1..4)는 **변경하지 않는다.** 표시·진입·레이아웃만 다룬다.

---

## 1. 현재 상태 (건드리면 안 되는 것 / 이미 있는 것)

### 1.1 이미 main에 있음 (2026-07-26)

| 구성 | 경로 |
|------|------|
| 순수 분석 | `backend/core/insight_engine.py` |
| 조립·캐시 | `backend/services/insight_service.py` (15분 TTL, `INSIGHT_DATA_ROOT`) |
| API | `GET /api/insight?days=&horizon=` (`backend/api/endpoints.py`) |
| 테스트 | `backend/tests/test_insight_engine.py`, `test_insight_service_integrity.py` |
| UI | `frontend/components/boards/InsightBoard.tsx` |
| Hook | `frontend/hooks/useInsight.ts` |
| Board id | `useStore.ts` → `'insight'` |
| Rail | `Rail.tsx` Lightbulb 아이콘 (데스크톱) |
| 모바일 계획 | `docs/superpowers/plans/2026-07-26-insight-lab-mobile.md` |

### 1.2 모바일 갭 (이번 작업 범위)

- `BottomTabs.tsx`에 **insight 진입 없음** → 폰에서 보드를 열 수 없음  
- `InsightBoard` 2열 그리드·넓은 표 → 좁은 화면에서 읽기 어려움  
- Hero KPI(첫 화면 요약) 없음  

### 1.3 절대 금지

| # | 금지 | 이유 |
|---|------|------|
| 1 | `insight_engine.py` 의 forward return / hit-rate **의미 변경** | 검증된 방법론; 모바일은 표시만 |
| 2 | edge 없음(Δ≤0)을 UI에서 숨기거나 “매수 우위”로 포장 | 정직성 = 제품 철학 |
| 3 | disclaimer 삭제·약화 | 규제·신뢰 |
| 4 | 가격 방향을 sentiment/Grok 파이프라인에 역주입 | Contamination firewall (`CLAUDE.md`) |
| 5 | 불필요한 신규 npm/Python 의존성 | 스택 단순 유지 |
| 6 | Next.js major 변경 | `frontend/AGENTS.md` |
| 7 | 데스크톱 Insight 2열 레이아웃 파괴 | 회귀 |

### 1.4 방법론 (표시 문구 유지 — 수정 금지)

- 신호일 **T 종가** 진입  
- 선행수익 = `close[T+N] / close[T] - 1` (거래일 N)  
- 룩어헤드 없음  
- buy 적중 = return > 0 / avoid 적중 = return < 0  
- hold/watch = 관찰용 (directional hit 없음)  
- 소표본: `confidence` + `honest_gap_*` 표시  

---

## 2. 세션 시작 절차

```bash
cd ~/dev/sniperboard
git checkout main && git pull
git checkout -b feat/insight-lab-mobile

# 필독
# 1) PROJECT_CONTEXT.md
# 2) README.md (Insight Lab 섹션)
# 3) docs/superpowers/plans/2026-07-26-insight-lab-mobile.md
# 4) 이 문서

# 로컬 확인 (선택)
docker compose up -d
curl -s "http://localhost:5001/api/insight?days=45&horizon=5" | head -c 400
# Dashboard: http://localhost:4000  → Rail 「통찰」
```

MSD 히스토리(Docker): `docker-compose.yml` 이 `../market-sentiment-data` → `/data/market-sentiment-data` 마운트, `INSIGHT_DATA_ROOT`.

---

## 3. 구현 범위 (Task 순서 — 계획 문서와 동일)

상세 체크박스는 **계획 문서 Task 1–6** 을 따른다. 요약:

### Task 1 — 모바일 진입 (필수)

**파일:** `frontend/components/shell/BottomTabs.tsx` (+ 필요 시 소형 시트 컴포넌트)

**권장 옵션 B:** 기존 탭 유지 + **「더보기」** 로 Insight (및 선택적으로 Track/Macro) 진입.

```text
현재 탭: Briefing | Market | Watch | Sentiment | Analysis
더보기 시트: Insight(통찰) · (선택) Track · Macro · Backtest …
```

- `setBoard('insight')` 연결  
- `board === 'insight'` 일 때 더보기 탭 active 처리 규칙 정의  
- `Lightbulb` 아이콘 재사용 (`components/ui/Icons.tsx`)

### Task 2 — InsightBoard 모바일 레이아웃 (필수)

**파일:** `frontend/components/boards/InsightBoard.tsx`, 필요 시 `globals.css`

Big → Detail 순서 (`mob-order-*` / 기존 모바일 패턴 참고: `OverviewBoard`, `MorningBriefingBoard`):

1. 헤더 + window/horizon (터치 44px)  
2. disclaimer → 모바일 `details` 기본 접힘  
3. integrity 배지 한 줄  
4. **Mobile hero KPI** (`mob-show`, 데스크톱 `mob-hide`)  
5. MVP-1..4 본문  

**Hero KPI (필수 표시):**

| KPI | payload 경로 |
|-----|----------------|
| bullish vs none 5d Δ | `mvp1_divergence.contrast_bullish_vs_none_5d.delta_a_minus_b` + n_a/n_b |
| buy directional hit | `mvp2_actions.brief.by_action` where action=buy |
| avoid directional hit | same, action=avoid |
| macro current | `mvp4_macro.current_judgment` |
| pre→post avg Δ | `mvp4_pre_post.avg_delta` |
| integrity | `integrity.passed` / fail_count |

Δ ≤ 0 이면 기존 카피: **「이 구간에서 통제군 대비 우위 없음」** (영/한 `S.noEdge`).

### Task 3 — 표 모바일화 (필수)

- 모든 표: `overflow-x: auto` + touch scroll  
- `max-width:767px`: MVP-1 행을 **카드 리스트**로 대체 가능 (table은 desktop `mob-hide`)  
- 테마 문자열 `line-clamp: 2`  

### Task 4 — 성능 (선택)

- 기본: 기존 15분 캐시만으로 충분  
- 선택: payload에 `mobile_summary` 추가 (엔진 의미 변경 없이 **파생 필드만**)  
- 모바일 기본 `days=45` UX 토글은 허용, API 기본값 변경은 신중  

### Task 5 — QA (필수)

| 확인 | 방법 |
|------|------|
| 진입 | 390×844 Playwright 또는 실기기 BottomTabs/더보기 → Insight |
| 스크롤 | 하단 탭에 콘텐츠 가림 없음 (`safe-area`) |
| 표 | 가로 스와이프 또는 카드로 전문 확인 |
| 데스크톱 | Rail 통찰 클릭 시 2열 integrity/source 유지 |
| API | `pytest backend/tests/test_insight_*.py` green |

### Task 6 — 문서 (필수, 코드 변경 시)

- `PROJECT_CONTEXT.md` — BottomTabs / InsightBoard 모바일 노트, 날짜 갱신  
- `README.md` — Mobile Support에 Insight 행  
- 계획 문서 상단 Status 를 **Done** 으로 갱신  

---

## 4. 기존 모바일 패턴 복제 소스

구현 시 **새로 발명하지 말고** 아래를 복사·변형:

| 패턴 | 참고 파일 |
|------|-----------|
| BottomTabs | `frontend/components/shell/BottomTabs.tsx` |
| `mob-order-*`, `mob-collapse`, `mob-show`/`mob-hide` | `OverviewBoard.tsx`, `globals.css` `@media (max-width:767px)` |
| 모바일 카드 행 | `WatchlistBoard.tsx` `.mob-watchlist-card` |
| flex 보드 스크롤 | `.board > * { flex-shrink: 0 }` 이미 있음 — **깨지 말 것** |
| BiLang 문자열 | 컴포넌트 내 `const S: Record<string, BiLang>` + `t(S.x, locale)` |

---

## 5. API 계약 (읽기 전용 소비)

```http
GET /api/insight?days=60&horizon=5
```

주요 키:

```
available, generated_at, window_days, action_horizon_days
source.{sentiment_snapshots, brief_snapshots, macro_snapshots, briefing_snapshots, price_symbols, build_ms}
disclaimer_en / disclaimer_ko
mvp1_divergence.{groups[], contrast_bullish_vs_none_5d, methodology_*}
mvp2_actions.{brief, briefing}.{by_action[], methodology_*}
mvp3_themes.{themes[], methodology_*}
mvp4_macro.{current_judgment, transitions[], dwell_days}
mvp4_pre_post.{avg_delta, improved_rate, recent[], confidence}
integrity.{passed, fail_count, warn_count, issues[]}
```

프론트 타입: `frontend/hooks/useInsight.ts` 의 `InsightPayload`.

---

## 6. 검증 명령

```bash
# 단위 + 무결성 (로컬 MSD 있을 때 integrity 테스트 포함)
cd backend && PYTHONPATH=. python3 -m pytest tests/test_insight_engine.py tests/test_insight_service_integrity.py -q

# API 스모크
curl -s "http://localhost:5001/api/insight?days=45&horizon=5" | python3 -c \
  "import sys,json; p=json.load(sys.stdin); assert p['available'] and p['integrity']['fail_count']==0; print('ok', p['mvp1_divergence']['n_total_events'])"

# 프론트 타입
cd frontend && npx tsc --noEmit

# Docker 재배포 (프론트 변경 시 이미지 재빌드 필요 — volume 없음)
cd .. && docker compose build frontend && docker compose up -d frontend
```

**의미 검증 (모바일 UI 완료 후에도 유지):**

- `contrast.delta_a_minus_b` 가 음수여도 UI가 “우위 있음”으로 바꾸지 말 것  
- `n` / `confidence` 가 표·hero에 항상 보일 것  
- disclaimer 접근 가능할 것  

---

## 7. 커밋 · PR 규칙

1. 커밋 메시지: 영어 complete sentences (예: `feat: mobile entry and layout for Insight Lab`)  
2. 코드 변경 시 **반드시** `PROJECT_CONTEXT.md` + `README.md` 포함 (`CLAUDE.md` Required After Code Changes)  
3. `docs/` 는 `.gitignore` 대상 — 계획/지침 파일 갱신 시 `git add -f docs/...`  
4. DB/로그 커밋 금지: `backend/data/*.db`, `frontend/test-results/`, MSD `*.log`  
5. 사용자 요청 시에만 push; 기본은 브랜치 + PR 가능  

---

## 8. 관련 저장소 (이번 작업에서 수정 불필요)

**market-sentiment-data** (`~/dev/market-sentiment-data`)  
- Insight는 history JSON **소비만** 함  
- collector 프롬프트/스키마 변경은 **이번 모바일 작업 범위 밖**  
- 오염 방화벽 유지: 가격 방향 → Grok 프롬프트 금지  

---

## 9. 완료 체크리스트 (복사해서 사용)

```
- [ ] Task1: 모바일에서 Insight 진입 가능
- [ ] Task2: hero KPI + 1열 Big→Detail
- [ ] Task3: 표 가로 스크롤 또는 카드화
- [ ] Task5: 390 CSS / 실기기 스크롤·safe-area
- [ ] 데스크톱 Rail 통찰 회귀 OK
- [ ] pytest test_insight_* green
- [ ] PROJECT_CONTEXT.md + README.md 갱신
- [ ] 계획 문서 Status → Done (git add -f)
- [ ] 커밋 (필요 시 push / PR)
```

---

## 10. Claude Code에게 바로 붙이는 시작 프롬프트 (복붙)

```
당신은 SniperBoard 저장소(~/dev/sniperboard)에서 작업한다.

1) 루트 CLAUDE.md, PROJECT_CONTEXT.md, README.md 를 읽는다.
2) docs/claude-code-brief-insight-mobile.md 와
   docs/superpowers/plans/2026-07-26-insight-lab-mobile.md 를 읽고 따른다.
3) 미션: Insight Lab 모바일 대응만 구현한다. insight_engine 계산 의미는 변경하지 않는다.
4) Task 1→2→3→5→6 순서로 진행. Task 4(summary API)는 선택.
5) 완료 후 pytest test_insight_*, 데스크톱 회귀, 모바일 진입을 검증한다.
6) PROJECT_CONTEXT.md + README.md 를 갱신하고 커밋한다.

금지: edge 왜곡, disclaimer 삭제, 신규 대형 의존성, 관련 없는 리팩터.
```

---

## 11. 참고 커밋

| SHA | 내용 |
|-----|------|
| `a6f5dcb` | feat: Insight Lab board (MVP-1..4) |
| `534b996` | docs: plan mobile support for Insight Lab |
| `6e2bab4` | absolute earnings dates + thin-history UI |
| `e27dcf8` | Track board flex card collapse fix |

끝.
