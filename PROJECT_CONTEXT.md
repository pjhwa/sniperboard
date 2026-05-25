# SniperBoard — Project Context (UPDATED 2026-05-25; Phase 5 COMPLETE + yf-accuracy-harden foundation; Phase 1 Conviction Composite Score v1 TDD started: core/conviction_calculator.py (pure 40/30/30 calculator using Stage2 'score' + regime 'total' + external sentiment) + test_conviction_calculator.py (3 tests, RED-GREEN passed); full tests green (sniperboard 29 + new Conviction + 48 msd); docs updated per CLAUDE.md. All prior phases + exec-8 complete.)

## 0. 이 문서의 목적

AI가 이 프로젝트를 즉시 파악할 수 있도록 전체 코드베이스를 분석하여 작성한 컨텍스트 문서입니다.
코드를 수정할 때 이 문서를 먼저 읽으면 구조와 로직을 빠르게 파악할 수 있습니다.

---

## 1. 프로젝트 한 줄 요약

**SniperBoard**는 Livermore · O'Neil · Minervini 방법론에 기반한 미국 주식 트레이딩 신호 대시보드입니다.
FastAPI(Python) 백엔드가 yfinance로 시세를 가져와 신호를 계산하고, Next.js 프론트엔드가 4개 탭으로 시각화합니다.

---

## 2. 디렉토리 구조 (전체)

```
sniperboard/
├── backend/
│   ├── main.py                   # FastAPI 앱 진입점 (앱명: "Lazy Alpha Signal API"), CORS allow_origins=["*"]
│   ├── requirements.txt          # fastapi, uvicorn, yfinance, pandas, python-dotenv, pytest
│   ├── Dockerfile
│   ├── api/
│   │   ├── endpoints.py          # 7개 REST 엔드포인트 (APIRouter prefix=/api)
│   │   └── schemas.py            # Pydantic v2 요청/응답 모델 전체
│   ├── core/
│   │   ├── signal_engine.py      # 핵심: 모든 기술적 지표·신호 계산 (700+ lines). Phase 2: calculate_stage2_analysis detects 'adj_close' and uses adjusted (scaled high/low + adj_close series) for 52w/RS/ema200_slope/pullback/pivot/entry on split symbols. GC/intraday/raw unchanged.
│   │   ├── regime_engine.py      # Risk Regime 5요소 종합 점수 (0~100)
│   │   ├── distribution_day.py   # O'Neil Distribution Day 카운트 (25거래일 기준)
│   │   └── data_adapter.py       # SINGLE SOURCE OF TRUTH: yfinance MultiIndex 정규화 + fetch 전담 (normalize_yf_dataframe + get_daily + get_ohlcv_intraday + get_multi_daily). yf 1.3+ 대응. Task2: full delegation (data_service thin layer; endpoints daily paths direct import). test_data_adapter.py full coverage (incl get_multi_daily targeted post-review). Phase 2: adj_close preserved (no longer dropped) for daily paths → Stage2 long-term accuracy (adjusted on splits). Phase 5: centralization verified in full tests + manual endpoint checks.
│   │   └── conviction_calculator.py  # Phase 1: Conviction Composite Score v1 (TDD). 40/30/30 weighted (Stage2 0-7 norm + Sentiment + Regime total). Pure function, regime=None → 50 neutral. Returns score+label+components. See test_conviction_calculator.py. Not yet wired to endpoints. (2026-05-25)
│   ├── services/
│   │   ├── base.py               # BaseDataService 추상 클래스
│   │   ├── data_service.py       # YFinanceDataService 구현체 + 모듈 레벨 헬퍼 함수
│   │   ├── brief_service.py      # GitHub raw fetch + 30분 인메모리 캐시 (BRIEF_DATA_URL)
│   │   └── earnings_service.py   # GitHub raw fetch + 60분 인메모리 캐시 (EARNINGS_DATA_URL)
│   └── tests/
│       ├── test_data_adapter.py (29 tests total incl. adapter+signal_engine; Phase 5 full suite green)
│       ├── test_signal_engine.py (incl. adjusted vs raw split symbol TDD)
│       ├── test_conviction_calculator.py (Phase 1 TDD: 3 tests for weighted Conviction v1, RED-GREEN passed 2026-05-25)
│       └── (service tests: brief/earnings/sentiment)
├── frontend/
│   ├── package.json              # Next.js 16.2.6, React 19.2.4, TanStack Query 5, Zustand 5, lightweight-charts 4.2.3, Tailwind v4
│   ├── next.config.ts
│   ├── Dockerfile                # 빌드 arg: NEXT_PUBLIC_API_URL
│   ├── app/
│   │   ├── layout.tsx            # 루트 레이아웃 (테마 init 스크립트 포함, data-theme="dark")
│   │   ├── page.tsx              # App shell: Rail+Topbar+MarketStrip+Board 라우터 + ⌘K 핸들러
│   │   ├── providers.tsx         # QueryClientProvider 래퍼
│   │   ├── types.ts              # 모든 TypeScript 타입 정의 + 메타데이터 상수
│   │   └── globals.css           # Plaid DS 디자인 토큰 (CSS vars, 다크/라이트 토글, 컴포넌트 클래스)
│   ├── components/
│   │   ├── shell/
│   │   │   ├── Rail.tsx          # 좌측 네비게이션 레일 (6보드 아이콘 + 활성 인디케이터)
│   │   │   ├── Topbar.tsx        # 상단바 (제목, 검색, 종목 버튼, Regime mini, 테마 토글)
│   │   │   ├── MarketStrip.tsx   # 슬림 마켓 스트립 (선택종목 + SPY/QQQ/IWM/VIX/DXY/GLD/CL=F)
│   │   │   └── CommandPalette.tsx # ⌘K 커맨드 팔레트 (종목·보드 검색)
│   │   ├── ui/
│   │   │   ├── Icons.tsx         # SVG 아이콘 (Crosshair, Activity, Candles, Eye, Globe, Heart 등)
│   │   │   ├── Card.tsx          # Card/ScorePill 래퍼 컴포넌트
│   │   │   ├── Sparkline.tsx     # Canvas 기반 스파크라인
│   │   │   ├── RadialGauge.tsx   # Canvas 기반 라디얼 게이지
│   │   │   └── HeatStrip.tsx     # CSS 기반 히트맵 스트립
│   │   ├── boards/               # 6개 보드 컴포넌트 (실제 훅 사용)
│   │   │   ├── OverviewBoard.tsx # 시장 개요: AI Insight + Regime + DD + Breadth + VIX + Credit + 종목 미니
│   │   │   ├── IntradayBoard.tsx # 단기: IntradayChart + 활성신호 + RSI + 액션바
│   │   │   ├── DailyBoard.tsx    # 일봉: DailyChart + Stage2 체크리스트 + R:R 패널
│   │   │   ├── WatchlistBoard.tsx # 워치리스트: Stage2 정렬 테이블
│   │   │   ├── MacroBoard.tsx    # 매크로: 섹터 로테이션 바 + 6그룹 카드
│   │   │   └── SentimentBoard.tsx # 심리: 시장 게이지 + 종목별 카드
│   │   ├── charts/               # 기존 lightweight-charts 컴포넌트 유지
│   │   │   ├── IntradayChart.tsx
│   │   │   └── DailyChart.tsx
│   │   └── (레거시 탭 컴포넌트들 — 기존 파일 유지, 더 이상 page.tsx에서 사용되지 않음)
│   └── hooks/
│       ├── useStore.ts           # Zustand persist: symbol, timeframe, board, theme, cmdOpen, rrAccount, rrRiskPct
│       ├── useIntraday.ts        # GET /api/ohlcv + /api/latest-signal (30초 폴링)
│       ├── useDaily.ts           # GET /api/daily
│       ├── useWatchlist.ts       # GET /api/watchlist
│       ├── useMacro.ts           # GET /api/macro
│       ├── useRegime.ts          # GET /api/regime
│       ├── useSentiment.ts       # GET /api/sentiment
│       ├── useBrief.ts           # GET /api/brief (30분 staleTime)
│       ├── useEarnings.ts        # GET /api/earnings (60분 staleTime)
│       └── useDistributionDays.ts # GET /api/distribution-days
├── docker-compose.yml            # backend 8000→5001, frontend 3000→4000
└── docs/
    ├── claude-code-brief.md
    └── sniperboard-integration-plan.md
```

---

## 3. 백엔드 API 엔드포인트 (`backend/api/endpoints.py`)

베이스 URL: `http://<host>:5001/api`

| 경로 | 파라미터 | 반환 |
|------|----------|------|
| `GET /ohlcv` | `symbol`, `tf`(기본 5m) | OHLCV 캔들 + 6개 신호 불리언 배열 + ema21/50/rsi/atr |
| `GET /latest-signal` | `symbol`, `tf`(기본 5m) | 최신 캔들 신호 요약 (active_signals, 가격/RSI/EMA) |
| `GET /daily` | `symbol` | 252봉 일봉 + EMA8/21/50/200/ATR14/GC + Stage2 전체 |
| `GET /macro` | — | 21개 매크로 심볼: 가격·1D/5D변화율·EMA8/21·시장구조·RSI14 |
| `GET /watchlist` | — | WATCHLIST_SYMS 6종목 Stage2 점수 내림차순 |
| `GET /regime` | — | Risk Regime 5요소 점수 + 종합 regime 문자열 |
| `GET /distribution-days` | — | SPY·QQQ DD count/level/dates |
| `GET /sentiment` | — | 소셜 심리 JSON (GitHub raw 30분 캐시) + `meta: {fetched_at, age_minutes, source}` (Task 3) |
| `GET /brief` | — | AI Daily Brief JSON (GitHub raw 30분 캐시) + `meta: {fetched_at, age_minutes, source}` (Task 3) |
| `GET /earnings` | — | Earnings Intelligence JSON (GitHub raw 60분 캐시) + `meta: {fetched_at, age_minutes, source}` (Task 3) |

---

## 4. 핵심 비즈니스 로직

### 4-1. 단기 지표 (`signal_engine.py: add_indicators`)

intraday용: EMA21, EMA50, RSI(14, Wilder's Smoothed MA), ATR(14), MACD 히스토그램, vol_avg20

### 4-2. 단기 신호 6종 (`signal_engine.py: calculate_signals`)

| 신호 | 핵심 조건 | 액션 |
|------|-----------|------|
| **VCP** | 30봉 신고가 + 거래량≥평균×2 + EMA21>50 + ATR 8봉 연속 수축 | 돌파 진입 |
| **Sniper** | EMA21 0.4% 이내 + RSI 38~58 + 가격>EMA21 + 거래량≥전봉×1.4 | 진입 |
| **Pullback** | 15봉 고점 대비 4.5~9% 조정 + EMA 근접 + MACD 3봉 반등 + 거래량 감소 | 눌림 진입 |
| **StrongTrend** | 가격>EMA21>EMA50 + EMA21 기울기 +0.15% + RSI 52~78 + 거래량≥평균×0.9 | 홀딩 |
| **Overbought** | RSI≥76 + 5봉 중 4양봉 + EMA21 이격 +3.2% + 거래량 감소 | 분할 익절 |
| **Downtrend** | 가격<EMA21 + EMA21 음기울기 + 거래량≥평균×1.3 + 8봉 신저가 | 접근 금지 |

### 4-3. 일봉 지표 (`signal_engine.py: add_daily_indicators`)

EMA8, EMA21, EMA50, EMA200, RSI14, ATR14, vol_avg20, Gaussian Channel(period=100, mult=1.5)

### 4-4. 가우시안 채널 (`signal_engine.py: gaussian_channel`)

- 인과 가우시안 커널 가중 이동평균 (look-ahead bias 없음)
- center = (gc_high + gc_low) / 2, upper/lower = center ± half*mult
- 상태: gc_above, gc_below, gc_breakout(당일 돌파), gc_retest(3% 이내 리테스트)

### 4-5. Stage2 분석 (`signal_engine.py: calculate_stage2_analysis`)

Minervini 7개 체크리스트 (score 0~7):
1. `price_above_emas`: 가격 > EMA21 > EMA50 > EMA200
2. `ema200_rising`: EMA200 20일 기울기 > 0
3. `near_52w_high`: 52주 고점 대비 >= -25%
4. `above_52w_low`: 52주 저점 대비 >= +30%
5. `pullback_shallow`: 20일 고점 대비 조정 <= 15%
6. `rs_strong`: RS Score >= 50 (63일 수익률 vs SPY)
7. `volume_contracting`: 최근 5일 평균 < 20일 평균

추가 계산:
- 진입가 = 20일 **일봉 고가(high)** 최대 × 1.005 (close 아닌 high 기준)
- 손절가 = 진입가 - 2 × ATR14
- 목표가 = 진입가 + 3 × (진입가 - 손절가)
- rs_score 공식: min(100, max(0, 50 + (stock_63d_ret - spy_63d_ret) × 2))
- breadth_narrow: SPY가 20일 신고가인데 RSP가 아닐 때 True

Phase 2 (part of yf-accuracy-harden): long-horizon metrics (52w pcts, RS 63d, EMA200 slope 20d, pullback, pivot high/entry) now use adj_close + scaled high/low when 'adj_close' column present (from data_adapter daily, single source of truth). Non-split or legacy path unchanged (full compat). GC/detects/short-term on raw. (Phase 5: adapter full delegation + endpoint direct use confirmed via tests + manual verification.)

추가 패턴 감지:
- `market_structure` (UPTREND/DOWNTREND/DISTRIBUTION/ACCUMULATION/NEUTRAL): `detect_market_structure()`
- `rsi_divergence_bearish/bullish`: `detect_rsi_divergence()` — 최근 40봉 스윙 포인트 비교
- `bear_flag`: `detect_bear_flag()` — 5%+ 급락 후 거래량 감소 횡보

### 4-6. Risk Regime (`regime_engine.py: compute_regime`)

5요소 각 0~20점, 유효 컴포넌트 3개 이상일 때만 계산:
- **Trend**: SPY vs EMA200 이격률 → [−5%, +10%] 구간 선형 매핑
- **Breadth**: RSP−SPY 60일 상대성과 → [−5%, +3%] 구간
- **Credit**: HYG/IEF 비율 30일 변화율 → [−2%, +1%] 구간
- **Volatility**: ^VIX → [30, 14] 구간 (invert=True)
- **Momentum**: SPY 20일 RoC → [−5%, +5%] 구간

총점 = sum(valid) / len(valid) × 5 → RISK_ON(≥80) / CONSTRUCTIVE(≥60) / MIXED(≥40) / DEFENSIVE(≥20) / RISK_OFF(<20)

### 4-7. Distribution Day (`distribution_day.py: count_distribution_days`)

최근 25거래일: (종가변화율 ≤ -0.2%) AND (거래량 > 전일) 인 날 수
OK(<4) / WARNING(4~5) / DANGER(≥6)

---

## 5. 프론트엔드 아키텍처

### 5-1. 전역 상태 (`hooks/useStore.ts` — Zustand)

| 상태 | 기본값 | 설명 |
|------|--------|------|
| `symbol` | `'TSLA'` | 선택된 종목 |
| `timeframe` | `'5m'` | 단기 타임프레임 |
| `tab` | `'intraday'` | 현재 탭 |
| `rrAccount` | `'100000'` | RR 계산기 계좌 크기 |
| `rrRiskPct` | `'1'` | RR 계산기 리스크 % |

### 5-2. API 훅 (TanStack Query v5)

- `useIntraday(symbol, timeframe)`: `/ohlcv` + `/latest-signal` 동시 조회, 30초 폴링
- `useDaily(symbol)`: `/daily`
- `useWatchlist()`: `/watchlist`
- `useMacro()`: `/macro`
- `useRegime()`: `/regime`
- `useDistributionDays()`: `/distribution-days`
- `useSentiment()`: `/sentiment` — 30분 staleTime, returns full (incl. `meta` for freshness badge)
- `useBrief()`: `/brief` — 30분 staleTime, `briefData` + `briefMeta` (FreshnessMeta, Phase 4) for ⏱ badge in Overview
- `useEarnings()`: `/earnings` — 60분 staleTime, `earningsData` + `earningsMeta` (FreshnessMeta, Phase 4) for badge

### 5-3. 타입 정의 (`app/types.ts`) — 중요 상수

```typescript
export const SYMBOLS = ['TSLA', 'AAPL', 'NVDA', 'META', 'AMZN', 'GOOGL'];
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
export const SIGNAL_META = { sniper, vcp, pullback, strong_trend, overbought, downtrend }; // 색상·설명·액션
export const STAGE2_META = { price_above_emas, ema200_rising, ... };
export const REGIME_META = { RISK_ON, CONSTRUCTIVE, MIXED, DEFENSIVE, RISK_OFF, UNKNOWN };
export const DD_META = { OK, WARNING, DANGER };
export const SETUP_QUALITY_META = { 'A+': {color:'bull'}, 'A': {color:'teal'}, 'B': {color:'warn'}, 'C': {color:'bear'}, 'D': {color:'bear'} };
export const EARNINGS_RISK_META = { high: {color:'bear',dot:'●'}, med: {color:'warn',dot:'●'}, low: {color:'teal',dot:'●'} };
// AI 관련 인터페이스: MarketBrief, SymbolBrief, BriefData, BriefResponse (+ meta: FreshnessMeta Phase 4)
// Earnings 관련 인터페이스: UpcomingEarning, RecentResult, EarningsData, EarningsResponse (+ meta)
// SentimentData + FreshnessMeta (fetched_at/age_minutes/source) — used for minimal ⏱ freshness badges
```

### 5-4. UI 시스템 (`app/globals.css`) — Plaid DS 리디자인

- **디자인 시스템**: Plaid DS 기반 (Inter + JetBrains Mono 폰트)
- **다크/라이트 토글**: `[data-theme="dark"]` CSS 셀렉터, localStorage `sb_theme`에 영속
- **CSS 변수**: `--bg`, `--fg`, `--border`, `--bull`, `--bear`, `--warn`, `--info`, `--teal`, `--purple`, `--em-500` 등
- **App 레이아웃**: CSS Grid `var(--rail)=64px / var(--topbar)=56px / var(--strip)=52px`
- **컴포넌트 클래스**: `.rail`, `.topbar`, `.strip`, `.board`, `.card`, `.badge`, `.sig`, `.act-bar`, `.tbl`, `.rsi-gauge` 등
- **Zustand 스토어** (`hooks/useStore.ts`): `board: Board`, `theme: Theme`, `cmdOpen`, `symbol`, `timeframe`, `rrAccount`, `rrRiskPct` — persist 미들웨어로 localStorage 영속

### 5-5. 차트 (`components/charts/`)

- **lightweight-charts v4** 기반
- `IntradayChart`: 캔들 + 볼륨 + EMA21(황색)/EMA50(인디고) + 신호 마커(▲▼)
- `DailyChart`: 캔들 + 볼륨 + EMA8(에메랄드)/21(황색)/50(인디고)/200(로즈) + GC 채널(보라 점선) + Entry Pivot 라인

### 5-6. DashboardOverview 구성 (항상 상단 표시)

| 섹션 | 데이터 소스 | 내용 |
|------|------------|------|
| RegimeCard | `useRegime` | 5요소 바 + 총점 + regime 라벨 |
| DDCard (SPY·QQQ) | `useDistributionDays` | DD 카운트 + 도트 시각화 |
| AI Insight | `useBrief` | Grok 시장 분석 — tone 배지·summary·key_themes·watch_points; briefData=null이면 regime 텍스트로 fallback |
| Earnings Calendar | `useEarnings` | 워치리스트 종목 실적 일정 + risk_level 배지 + action_note; earningsData=null이면 카드 숨김 |
| IndexSnapshot | `useMacro` | SPY·QQQ·IWM·DXY·GLD 가격·1D/5D |
| VIXPanel | `useMacro` | ^VIX + ^VIX9D + ^VVIX + 백워데이션 감지 |
| BreadthPanel | `useMacro` | SPY/QQQ/RSP/MAGS/IWM 가로 바 + 협소 랠리 경고 |
| CreditPanel | `useMacro` | HYG·JNK·LQD·IEF + 스트레스 레벨 |

---

## 6. 데이터 흐름

```
yfinance (외부 API, 15분 지연, 무료)
    ↓ core/data_adapter.py  [SINGLE SOURCE OF TRUTH — full centralization]
        ├─ normalize_yf_dataframe (MultiIndex yf1.3+ handling + adj_close preserve)
        ├─ get_ohlcv_intraday (delegated by data_service)
        ├─ get_multi_daily (delegated by data_service + direct import in daily endpoints)
        └─ get_daily (for tests/adapter consumers)
    ↓ data_service (thin delegation layer for intraday only now)
    ↓ signal_engine (Phase 2: Stage2 long-horizon metrics detect adj_close → use adjusted for 52w/RS/ema200_slope/pullback/pivot/entry on splits; raw/GC/short-term unchanged for compat)
    ↓ regime_engine / distribution_day (mostly raw recent windows)
FastAPI (port 8000 내부 / 5001 외부 Docker)  [Task 3: daily/watchlist/regime/distribution/macro use hardened adapter path + AI endpoints attach meta]
    ↓ JSON (Pydantic + FreshnessMeta for /sentiment /brief /earnings)
TanStack Query 훅 (React 컴포넌트 트리)
    ↓ props / Zustand 상태
lightweight-charts + Tailwind 카드 UI  [Phase 4: minimal ⏱ freshness badges via age_minutes meta in OverviewBoard AI Insight + Earnings + light Sentiment]

─── AI 파이프라인 + Cross-Repo Linkage (market-sentiment-data) ───────────────────────────────────────
Mac Mini cron (06:00/22:00 UTC)
    ↓ collect_sentiment.py → GitHub: market-sentiment-data/latest.json
Mac Mini cron (06:30/22:30 UTC)
    ↓ collect_brief.py
        ├─ GET /api/regime, /api/daily, /api/watchlist  (Sniperboard API)
        ├─ read latest.json  (소셜 심리)
        └─ Hermes/Grok → JSON
    ↓ GitHub push: market-sentiment-data/brief/latest.json
Mac Mini cron (06:30 UTC, 하루 1회)  [earnings collector hardening Phase 3: structured logging per-sym/raw shapes, calendar→earnings_dates/estimate fallback, numeric/date validation, jsonschema+light schema pre-write, partial flag + graceful usable output on hermes/fail (no crash), --dry-run]
    ↓ collect_earnings.py (hardened)
        ├─ yfinance .calendar + .earnings_history
        └─ Hermes/Grok → JSON
    ↓ GitHub push: market-sentiment-data/earnings/latest.json

GitHub raw CDN
    ↓ brief_service.py / earnings_service.py (30~60분 인메모리 캐시, Cache-Control: no-cache 헤더; meta age_minutes computed)
FastAPI /api/brief, /api/earnings  [meta: {fetched_at, age_minutes, source}]
    ↓ TanStack Query useBrief / useEarnings
OverviewBoard (AI Insight 카드 + Earnings Calendar) [freshness badges]
DailyBoard (⚡ EARNINGS IN Nd 배너)
SentimentBoard (종목별 셋업 품질 배지 A+~D)
```

---

## 7. 환경 및 실행

### Docker Compose (권장)
```bash
docker-compose up -d
# 백엔드: http://localhost:5001  (API docs: /docs)
# 프론트엔드: http://localhost:4000
```

### 로컬 개발
```bash
# 백엔드 (port 8000)
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 프론트엔드
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### 주요 환경변수
- `NEXT_PUBLIC_API_URL`: 빌드 시 번들됨. docker-compose에서 `http://localhost:5001` 하드코딩.
  변경 시 반드시 **재빌드** 필요.
- `BRIEF_DATA_URL`: GitHub raw URL for `brief/latest.json` (backend 환경변수)
- `EARNINGS_DATA_URL`: GitHub raw URL for `earnings/latest.json` (backend 환경변수)
- `SENTIMENT_DATA_TOKEN`: GitHub PAT (private 리포인 경우 sentiment/brief/earnings 모두 사용)

---

## 8. 고정 심볼 목록

### 워치리스트 (`endpoints.py: WATCHLIST_SYMS`)
`["TSLA", "AAPL", "NVDA", "META", "AMZN", "GOOGL"]`

### 매크로 심볼 (`endpoints.py: MACRO_SYMBOLS`) — 21종
| 카테고리 | 심볼 |
|----------|------|
| 달러·금리·채권·원자재 | DX-Y.NYB, ^TNX, TLT, CL=F, GLD |
| 주요 지수 | SPY, QQQ |
| 변동성 | ^VIX, ^VVIX, ^VIX9D |
| 신용 스트레스 | HYG, JNK, LQD, IEF |
| 시장 폭 | RSP, MAGS, IWM |
| 섹터 ETF | SMH, XLE, XLY, XHB, ITA |

### Regime 계산용 심볼 (`endpoints.py: /regime`)
`['SPY', 'RSP', 'HYG', 'IEF', '^VIX']`

---

## 9. 알려진 제약사항 및 주의점

| 항목 | 내용 |
|------|------|
| 데이터 지연 | yfinance 무료 API → 15분 지연 데이터 |
| Intraday 기간 | yfinance 제한: 최근 5일치만 조회 가능 |
| 일봉 로드 시간 | 첫 요청 약 30초 (2년치 다운로드 + 지표 계산) |
| CORS | 개발용 `allow_origins=["*"]` — 운영 시 변경 필요 |
| API_BASE 재빌드 | `NEXT_PUBLIC_API_URL`은 빌드 시 번들되므로 런타임 변경 불가 |
| 매크로 데이터 | 시장 마감 후에는 당일 데이터 미갱신 |
| yfinance MultiIndex / accuracy | 멀티 종목 다운로드 시 컬럼 구조 주의. **data_adapter.py is the SINGLE SOURCE OF TRUTH for ALL yf data access (normalize + fetch)**: full delegation complete (Task 2: data_service thin wrapper only for intraday; endpoints daily paths direct import get_multi_daily). Phase 2: adj_close preserved in daily frames + used selectively in Stage2 long-horizon metrics (split symbols accurate 52w/RS etc while short-term/GC/raw paths unchanged for full backward compat). Task3: daily endpoints + meta on AI. Phase4/5: FE badges + full test+doc+manual verification green. Cross-repo: market-sentiment-data earnings collector hardening + linkage via GitHub raw + meta freshness. (Phase 5 2026-05-24) |

---

## 10. 코드 수정 시 참고 지점

| 수정 대상 | 파일 위치 |
|-----------|-----------|
| 신호 조건 변경 | `backend/core/signal_engine.py: get_vcp(), get_sniper(), ...` |
| Stage2 체크리스트 기준 | `backend/core/signal_engine.py: calculate_stage2_analysis()` |
| Regime 임계값 | `backend/core/regime_engine.py: TREND_LOW/HIGH, ...` 상수 |
| DD 기준일 변경 | `backend/core/distribution_day.py: DD_LOOKBACK, DD_THRESHOLD_PCT` |
| yfinance MultiIndex / daily+intraday data 정확도 | `backend/core/data_adapter.py` (SINGLE SOURCE OF TRUTH: normalize_yf_dataframe + get_* family) — full centralization+fetch. Task2 complete: full delegation (data_service thin; direct adapter in endpoints for daily paths) + extensive tests (get_multi_daily targeted + more). Task3: endpoints use hardened path + attach meta. Phase 2: adj_close preserve + selective adjusted in signal_engine.calculate_stage2_analysis (long-term only). Phase 4: types/hooks for meta + FE badges. Phase 5: full 29 tests green (adapter+signal_engine specific), docs updated per CLAUDE.md rules, manual verification (endpoints daily/AI meta, no-breakage non-split/intraday). Cross-repo linkage: market-sentiment-data earnings hardening reflected in collect_earnings.py + services. |
| Conviction Composite Score v1 (Phase 1) | `backend/core/conviction_calculator.py` (TDD, now with Regime-conditioned weights: RISK_ON boosts sentiment, RISK_OFF boosts regime). 7 tests. Exposed in /api/watchlist + /api/daily + minimal WatchlistBoard UI. (2026-05-25). |
| Watchlist / Daily 항목에 신규 필드 추가 | `backend/api/schemas.py` (WatchlistItemSchema, DailyResponse) + `endpoints.py` (get_watchlist_endpoint, get_daily_endpoint) |
| Brief Context Attribution (Phase 1) | `backend/api/endpoints.py:get_brief_endpoint` + `schemas.BriefResponse` now surface top-level `context` (popped from GitHub raw). Pairs with market-sentiment-data collect_brief.py context builder. (2026-05-25) |
| 워치리스트 종목 추가 | `backend/api/endpoints.py: WATCHLIST_SYMS` + `frontend/app/types.ts: SYMBOLS` |
| 매크로 심볼 추가 | `backend/api/endpoints.py: MACRO_SYMBOLS` |
| API 주소 변경 | `frontend/app/types.ts: API_BASE` + `docker-compose.yml: NEXT_PUBLIC_API_URL` |
| 신호 메타데이터(색상·설명) | `frontend/app/types.ts: SIGNAL_META` |
| FreshnessMeta + AI 응답 meta (Phase 4) | `frontend/app/types.ts` (SentimentData/BriefResponse/EarningsResponse); hooks useBrief/useEarnings expose *Meta; badges in OverviewBoard (AI+ Earnings) + light SentimentBoard |
| 폴링 간격 변경 | `frontend/hooks/useIntraday.ts` (현재 30초) |
| Brief/Earnings URL 변경 | `docker-compose.yml: BRIEF_DATA_URL / EARNINGS_DATA_URL` |
| Brief 캐시 TTL 변경 | `backend/services/brief_service.py: CACHE_TTL` (현재 1800초) |
| Earnings 캐시 TTL 변경 | `backend/services/earnings_service.py: CACHE_TTL` (현재 3600초) |
| Brief 워치리스트 변경 | `collect/collect_brief.py: WATCHLIST` + `collect/collect_earnings.py: WATCHLIST` |
