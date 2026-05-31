> English docs: [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)

# SniperBoard — Project Context (UPDATED 2026-05-30 mobile-ui-verified)

## 0. 이 문서의 목적

AI가 이 프로젝트를 즉시 파악할 수 있도록 전체 코드베이스를 분석하여 작성한 컨텍스트 문서입니다.
코드를 수정할 때 이 문서를 먼저 읽으면 구조와 로직을 빠르게 파악할 수 있습니다.

---

## 1. 프로젝트 한 줄 요약

**SniperBoard**는 Livermore · O'Neil · Minervini 방법론에 기반한 미국 주식 트레이딩 신호 대시보드입니다.
FastAPI(Python) 백엔드가 yfinance로 시세를 가져와 신호를 계산하고, Next.js 프론트엔드가 7개 보드로 시각화합니다.
Grok/Hermes AI가 외부 cron으로 시장 내러티브·종목 Brief·실적 인텔리전스를 생성해 GitHub에 푸시하며, 백엔드가 캐시로 서빙합니다.

---

## 2. 디렉토리 구조 (전체)

```
sniperboard/
├── backend/
│   ├── main.py                   # FastAPI 앱 진입점 (앱명: "SniperBoard Signal API"), CORS allow_origins=["*"]
│   ├── requirements.txt          # fastapi, uvicorn, yfinance, pandas, python-dotenv, pytest
│   ├── Dockerfile
│   ├── api/
│   │   ├── endpoints.py          # 7개 REST 엔드포인트 (APIRouter prefix=/api)
│   │   └── schemas.py            # Pydantic v2 요청/응답 모델 전체. TopNews(headline/summary/source) + SymbolSentiment.top_news/MarketSentiment.top_news Optional 추가 (2026-05-28)
│   ├── core/
│   │   ├── signal_engine.py      # 핵심: 모든 기술적 지표·신호 계산 (700+ lines). Phase 2: calculate_stage2_analysis detects 'adj_close' and uses adjusted (scaled high/low + adj_close series) for 52w/RS/ema200_slope/pullback/pivot/entry on split symbols. GC/intraday/raw unchanged.
│   │   ├── regime_engine.py      # Risk Regime 5요소 종합 점수 (0~100)
│   │   ├── distribution_day.py   # O'Neil Distribution Day 카운트 (25거래일 기준)
│   │   └── data_adapter.py       # SINGLE SOURCE OF TRUTH: yfinance MultiIndex 정규화 + fetch 전담 (normalize_yf_dataframe + get_daily + get_ohlcv_intraday + get_multi_daily). yf 1.3+ 대응. Task2: full delegation (data_service thin layer; endpoints daily paths direct import). test_data_adapter.py full coverage (incl get_multi_daily targeted post-review). Phase 2: adj_close preserved (no longer dropped) for daily paths → Stage2 long-term accuracy (adjusted on splits). Phase 5: centralization verified in full tests + manual endpoint checks.
│   │   └── conviction_calculator.py  # Phase 1: Conviction Composite Score v1 (TDD). 40/30/30 weighted (Stage2 0-7 norm + Sentiment + Regime total). Pure function, regime=None → 50 neutral. Returns score+label+components. See test_conviction_calculator.py. Not yet wired to endpoints. (2026-05-25)
│   │   └── macro_rules.py            # Macro Insight 신호등 규칙 엔진. compute_macro_signals(items) → {overall:{judgment,green_count,red_count}, groups:{key:{signal,direction}}}. 6그룹(volatility/breadth/credit/rates/commodities/sectors) 각각 green/yellow/red 판정 + 종합 RISK_ON/MIXED/RISK_OFF. 순수 함수, dict 리스트 입력. TDD 20테스트. (2026-05-30)
│   ├── services/
│   │   ├── base.py               # BaseDataService 추상 클래스
│   │   ├── data_service.py       # YFinanceDataService 구현체 + 모듈 레벨 헬퍼 함수
│   │   ├── brief_service.py      # GitHub raw fetch + 30분 인메모리 캐시 (BRIEF_DATA_URL)
│   │   ├── earnings_service.py   # GitHub raw fetch + 60분 인메모리 캐시 (EARNINGS_DATA_URL)
│   │   └── overnight_service.py  # Yahoo Finance WebSocket → Blue Ocean ATS overnight 가격 실시간 수신. asyncio 백그라운드 루프 + 자동 재연결. Protobuf base64 파싱(field2=price, field6=session(8=overnight), field12=chg_pct). FastAPI lifespan에서 start_overnight_service() 호출.
│   │   └── macro_insight_service.py  # GitHub raw fetch + 30분 인메모리 캐시 (MACRO_INSIGHT_URL). fetch_macro_insight() → Optional[dict] (전체 AI JSON). get_ai_meta(raw) → {generated_at,age_minutes}. URL 미설정 시 None 반환(graceful). (2026-05-30)
│   └── tests/
│       ├── test_data_adapter.py (29 tests total incl. adapter+signal_engine; Phase 5 full suite green)
│       ├── test_signal_engine.py (incl. adjusted vs raw split symbol TDD)
│       ├── test_conviction_calculator.py (Phase 1 TDD: 3 tests for weighted Conviction v1, RED-GREEN passed 2026-05-25)
│       └── (service tests: brief/earnings/sentiment — test_sentiment_service.py: fixtures updated with top_news)
        └── (monthly_trend: new fields in signal_engine + schemas, no dedicated test yet)
├── frontend/
│   ├── package.json              # Next.js 16.2.6, React 19.2.4, TanStack Query 5, Zustand 5, lightweight-charts 4.2.3, Tailwind v4
│   ├── next.config.ts
│   ├── Dockerfile                # 빌드 arg: NEXT_PUBLIC_API_URL
│   ├── app/
│   │   ├── layout.tsx            # 루트 레이아웃 (테마 init 스크립트 포함, data-theme="dark", viewport-fit=cover 모바일 safe-area 대응)
│   │   ├── page.tsx              # App shell: Rail+Topbar+MarketStrip+Board 라우터 + ⌘K 핸들러
│   │   ├── providers.tsx         # QueryClientProvider 래퍼
│   │   ├── types.ts              # 모든 TypeScript 타입 정의 + 메타데이터 상수
│   │   ├── glossary.ts           # 컨텍스트 도움말 데이터 (2026-05-29). GlossaryEntry{key,term,body} + GLOSSARY 배열(28개 항목, rates_dollar·commodities 신규 추가) + G 맵(키 기반 조회). InfoPopover·CommandPalette·BoardGuidePanel에서 공유 사용.
│   │   └── globals.css           # Plaid DS 디자인 토큰 (CSS vars, 다크/라이트 토글, 컴포넌트 클래스). .info-pop* + .guide-panel* + .guide-btn + .board-wrap 클래스 포함. .strip: align-items center(가이드 버튼 세로 중앙정렬) (2026-05-29). + 모바일 반응형 블록: @media(max-width:767px){ .app 1컬럼그리드/height:100dvh, .main display:block overflow-y:auto, .board flex-column, mob-order-1~8 유틸, details.mob-collapse 접기, .mob-chart-limit 300px, .bottom-tabs/.bottom-tabs__item, .mob-macro-groups/.mob-inner-stack/.mob-wrap 1열강제 } + @media(min-width:768px){ .mob-wrap/.mob-macro-groups display:contents 데스크톱투명, details.mob-collapse display:contents }
│   ├── components/
│   │   ├── shell/
│   │   │   ├── Rail.tsx          # 좌측 네비게이션 레일 (7보드 아이콘 + 활성 인디케이터). deepdive=Layers 아이콘 2번째 위치. 모바일: hide-mobile 클래스로 숨김.
│   │   │   ├── Topbar.tsx        # 상단바 (제목, 검색, 종목 버튼, Regime mini, 테마 토글). 모바일: topbar__symbols/topbar__regime/topbar__sep/topbar__search 숨김 → 로고+보드명+테마토글만 표시 (48px 슬림).
│   │   │   ├── BottomTabs.tsx    # 모바일 전용 하단 탭바 (4탭: 시장/종합분석/매크로/심리). max-width:767px에서만 표시. useStore board/setBoard 연결. safe-area-inset-bottom 대응.
│   │   │   ├── MarketStrip.tsx   # 슬림 마켓 스트립 (선택종목 + SPY/QQQ/IWM/VIX/DXY/GLD/CL=F). PRE/POST 가격 표시 (usePrePost). 우측 끝에 "? 가이드" 버튼 렌더링 — 클릭 시 'guide:open' 커스텀 이벤트 dispatch (2026-05-29). 모바일: hide-mobile 클래스로 숨김.
│   │   │   └── CommandPalette.tsx # ⌘K 커맨드 팔레트 (종목·보드 검색). ? prefix 입력 시 용어 검색 모드 전환 — GLOSSARY 배열 필터링, "용어 검색 모드 — N개 결과" 배너 표시 (2026-05-29).
│   │   ├── ui/
│   │   │   ├── Icons.tsx         # SVG 아이콘 (Crosshair, Activity, Candles, Eye, Globe, Heart 등)
│   │   │   ├── Card.tsx          # Card/ScorePill 래퍼. optional info?: {term,body} prop 추가(2026-05-29) — 제공 시 card__hd에 InfoPopover 렌더링.
│   │   │   ├── InfoPopover.tsx   # 인라인 ⓘ 팝오버 (2026-05-29). Props: term, body. 클릭 토글, ESC/외부클릭 닫힘. 'info-pop:close-all' 커스텀 이벤트로 싱글턴 동작(하나만 열림). Card info prop 경유 또는 직접 임베드. 팝업은 position:fixed + getBoundingClientRect으로 뷰포트 우측 끝 overflow 자동 보정(card overflow:hidden 클리핑 회피) (2026-05-29).
│   │   │   ├── BoardGuidePanel.tsx # 보드 전체 가이드 슬라이드오버 (2026-05-29). Props: title, sections: GuideSection[], isOpen, onClose. 우측에서 슬라이드인, ESC/오버레이 클릭 닫힘. 각 보드의 board-wrap 안에 렌더링.
│   │   │   ├── ConvictionBadge.tsx # Conviction 점수 배지 (score/label/size props). score≥65=bull, ≥50=teal, ≥35=warn, <35=bear. size sm/md.
│   │   │   ├── Sparkline.tsx     # Canvas 기반 스파크라인
│   │   │   ├── RadialGauge.tsx   # Canvas 기반 라디얼 게이지
│   │   │   └── HeatStrip.tsx     # CSS 기반 히트맵 스트립
│   │   ├── boards/               # 7개 보드 컴포넌트. 공통 패턴(2026-05-29): <div className="board-wrap"> 래퍼 → BoardGuidePanel만 board-wrap 직계 자식. 가이드 버튼은 MarketStrip에 위치(이전됨). 각 보드는 useEffect로 'guide:open' 이벤트 수신 → setGuideOpen(true). GlossaryPanel 완전 제거.
│   │   │   ├── OverviewBoard.tsx # 시장 개요 (11카드): AI Insight + Earnings Calendar + Regime + DD + Breadth + VIX + Credit + 진입레이더 + Conviction리더보드 + Sector + Watchlist Top3. ⏱ freshness badges. 카드 7개에 info={G.*} prop. 모바일: mob-order-1~8로 Big→Detail 재배치, AI Insight details.mob-collapse 접기.
│   │   │   ├── DeepDiveBoard.tsx # 종합분석 (5-Row): Row1=종목선택+가격바+배지들(Stage2/Conviction/월봉/구조/신호)+PRE/POST가격. Row2=DailyChart(3fr)|Stage2체크+KPI4(2fr). Row3=세력참여도분석(3fr)|R:R진입계획(2fr). Row4(3×1fr)=소셜심리|AI Brief|실적. Row5=Regime(3fr)|시장전체심리(2fr). 세력참여도: Up/Down Vol비율+거래량추세+집중일+세력점수0-100+10일acc/dist그리드. InfoPopover 직접 임베드(Stage2/세력참여도/R:R/RS 등). 모바일: mob-wrap(display:contents 데스크톱) + mob-order 재배치, Row1 mob-symbol-bar 가로스크롤, 차트 mob-chart-limit 300px, ROW4 mob-inner-stack 1열, AI Brief details.mob-collapse.
│   │   │   ├── IntradayBoard.tsx # 단기: IntradayChart + 활성신호 + RSI + 액션바. SIG_INFO 맵으로 6개 신호명 옆 InfoPopover 표시. "진입 복사" 버튼 제거됨(2026-05-29).
│   │   │   ├── DailyBoard.tsx    # 일봉: DailyChart + Stage2 체크리스트 + R:R 패널. Stage2·R:R 카드에 info prop.
│   │   │   ├── WatchlistBoard.tsx # 워치리스트: Stage2 정렬 테이블. 테이블 헤더(Stage2/RS/Conviction)에 InfoPopover.
│   │   │   ├── MacroBoard.tsx    # 매크로: 종합 RISK-ON/MIXED/RISK-OFF 배너 + 섹터 로테이션 바 + 6그룹 카드. 각 카드: 신호등(🟢🟡🔴)·방향(↗↘)·AI 해석 텍스트·freshness badge. useMacroInsight() 결합. AI 없을 때 graceful degrade. (2026-05-30). 모바일: mob-order-1~3 재배치(배너→그룹→Sector), mob-macro-groups(display:contents 데스크톱/flex-column 모바일), bullets details.mob-collapse 접기.
│   │   │   └── SentimentBoard.tsx # 심리: 시장 게이지 + 종목별 카드 (클릭 시 SentimentTrendChart 펼침). TopNewsBox 컴포넌트. Composite Score 카드에 info prop. 하단에 "소셜 심리 데이터란?" 상설 카드 추가(데이터 수집 방식·점수 범위 시각화·역발상 원리·활용법·주의사항 5섹션) (2026-05-29). 모바일: sym-sentiment-grid 1열, TopNews 카드외부 details.mob-collapse, 기존 TopNewsBox hide-on-mobile.
│   │   │   └── SentimentTrendChart.tsx # 심리 추이 차트: 주가 라인(좌축) + composite_score 오버레이(우축), 7/30일 토글
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
│       ├── usePrePost.ts         # GET /api/prepost (60초 폴링). prePostData: { market_state, pre/post price+chg_pct, regular_close }
│       ├── useEarnings.ts        # GET /api/earnings (60분 staleTime)
│       └── useDistributionDays.ts # GET /api/distribution-days
└── docker-compose.yml            # backend 8000→5001, frontend 3000→4000
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
| `GET /sentiment/history` | `symbol`(required), `days`(1-30, 기본 7) | N일치 pre_open/post_close 심리 포인트 배열. `symbol="MARKET"` 지원. 5분 TTL 캐시. |
| `GET /prepost` | `symbol` | 프리/애프터마켓 가격·변화율·market_state (PRE/POST/REGULAR/CLOSED/OVERNIGHT). ticker.info 우선, PREPRE→OVERNIGHT 변환 + overnight_service WebSocket 캐시. |
| `GET /brief` | — | AI Daily Brief JSON (GitHub raw 30분 캐시) + `meta: {fetched_at, age_minutes, source}` (Task 3) |
| `GET /earnings` | — | Earnings Intelligence JSON (GitHub raw 60분 캐시) + `meta: {fetched_at, age_minutes, source}` (Task 3) |
| `GET /macro/insight` | — | 6그룹 신호등(signal/direction) + AI 해석 텍스트(text) + 종합 판정(judgment) + ai_meta(age_minutes). 규칙 기반 실시간 + GitHub 캐시 AI 오버레이. |

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

### 4-6b. 월봉 추세 분석 (`signal_engine.py: calculate_stage2_analysis` 내부)

일봉 252봉을 월봉으로 리샘플링해 **10개월 EMA** 기반 추세를 판별:
- `monthly_phase`: `CONFIRMED_UPTREND` (월봉 EMA10 위 + 기울기 양) / `WEAKENING` (EMA10 위지만 기울기 음) / `NEUTRAL` (EMA10 ±3% 이내) / `DOWNTREND` / `UNKNOWN` (데이터 부족)
- `monthly_uptrend_confirmed`: bool — CONFIRMED_UPTREND일 때만 True
- `monthly_ema10`: 최신 10개월 EMA 값
- `pct_from_monthly_ema10`: 현재가와 EMA10의 이격률 (%)
- Stage2Schema + WatchlistItemSchema에 포함. DailyBoard에 배지, WatchlistBoard에 "월봉" 열 표시.

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
| `tab` | `'intraday'` | 현재 탭 (Board: overview/deepdive/intraday/daily/watchlist/macro/sentiment) |
| `rrAccount` | `'100000'` | RR 계산기 계좌 크기 |
| `rrRiskPct` | `'1'` | RR 계산기 리스크 % |

### 5-2. API 훅 (TanStack Query v5)

- `useIntraday(symbol, timeframe)`: `/ohlcv` + `/latest-signal` 동시 조회, 30초 폴링
- `useDaily(symbol)`: `/daily`
- `useWatchlist()`: `/watchlist`
- `useMacro()`: `/macro`
- `useMacroInsight()`: `/macro/insight` — 5분 staleTime, `{ insightData, insightLoading }`
- `useRegime()`: `/regime`
- `useDistributionDays()`: `/distribution-days`
- `useSentiment()`: `/sentiment` — 30분 staleTime, returns full (incl. `meta` for freshness badge)
- `useSentimentHistory(symbol, days)`: `/sentiment/history` — 5분 staleTime, enabled: !!symbol
- `useBrief()`: `/brief` — 30분 staleTime, `briefData` + `briefMeta` (FreshnessMeta, Phase 4) for ⏱ badge in Overview
- `useEarnings()`: `/earnings` — 60분 staleTime, `earningsData` + `earningsMeta` (FreshnessMeta, Phase 4) for badge

### 5-3. 타입 정의 (`app/types.ts`) — 중요 상수

```typescript
export const SYMBOLS = ['TSLA', 'AAPL', 'NVDA', 'META', 'AMZN', 'GOOGL', 'PLTR'];
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
- **컴포넌트 클래스**: `.rail`, `.topbar`, `.strip`, `.board-wrap`, `.board`, `.card`, `.badge`, `.sig`, `.act-bar`, `.tbl`, `.rsi-gauge`, `.info-pop*`, `.guide-panel*`, `.guide-btn` 등
- **Zustand 스토어** (`hooks/useStore.ts`): `board: Board`, `theme: Theme`, `cmdOpen`, `symbol`, `timeframe`, `rrAccount`, `rrRiskPct` — persist 미들웨어로 localStorage 영속

### 5-5. 차트 (`components/charts/`)

- **lightweight-charts v4** 기반
- `IntradayChart`: 캔들 + 볼륨 + EMA21(황색)/EMA50(인디고) + 신호 마커(▲▼)
- `DailyChart`: 캔들 + 볼륨 + EMA8(에메랄드)/21(황색)/50(인디고)/200(로즈) + GC 채널(보라 점선) + Entry Pivot 라인

### 5-6. DeepDiveBoard 레이아웃 (5-Row)

`gridTemplateColumns: '3fr 2fr'` + `alignItems: 'start'` — 카드가 내용 높이에 맞게 자동 조정.

**Row 1 (span 2): 종목 선택 + 가격 바**
SYMBOLS 버튼 | 현재가 + RSI + EMA21 + 스파크라인(60봉) + PRE/POST 가격·변화율(usePrePost, 60초 폴링) | 우측: Stage2 ScorePill · ConvictionBadge · 월봉 배지 · 시장구조 배지 · 활성신호 배지(최대2)

**Row 2: Daily Chart (3fr) + Stage2 분석 (2fr)**
- 좌: `DailyChart` 임베드 (EMA8/21/50/200 + GC + Entry/Stop). min-height:440px.
- 우: 7항목 2컬럼 체크리스트 + 월봉 EMA10 배너 + KPI 2×2 (RS Score·52주이격·최근조정·EMA200기울기)

**Row 3: 세력참여도 분석 (3fr) + R:R 진입 계획 (2fr)**
- 좌: 최근 60거래일 등락 히트맵(3행×20열) + Up/Down 거래량 비율 + 거래량 추세 + 집중일 감지 + 세력 점수(0~100) + 10일 누적 매집/분산 그리드. 계산은 `dailyData.candles` 기반 프론트엔드 순수 함수.
- 우: Entry/Stop/Target 3-col + 빨강1:녹색3 시각 바 + 포지션 수량(Max Loss/ATR) + 패턴 배지

**Row 4 (3×1fr, `alignItems: 'stretch'`)**
| 카드 | 데이터 | 내용 |
|------|--------|------|
| 소셜 심리 | `useSentiment` (symbol 필터) | composite_score + ScoreBar(−2~+2) + 전일 델타 + key_reason + TopNews + 심리 추이 차트 토글(7/30일) |
| AI Brief | `useBrief` (symbol 필터) | 그라디언트 카드 + Setup Quality 배지 + Action Bias + brief + 기회/리스크 블록 |
| 실적 발표 | `useEarnings` (symbol 필터) | 임박: 발표일·D-Day·EPS·Beat율·ai_summary; 없으면 recent_result(EPS실제/추정/서프라이즈/ai_reaction) |

**Row 5: Risk Regime (3fr) + 시장 전체 심리 (2fr)**
- 좌: RadialGauge(80px) + 레짐 설명 텍스트 + 5요소 바(raw수치 포함) — 2컬럼 내부 레이아웃
- 우: 시장 composite_score(큰 숫자) + ScoreBar + key_reason + TopNews

---

### 5-7. OverviewBoard 카드 구성 (4컬럼 그리드)

우상단 `? 가이드` 버튼 → BoardGuidePanel 슬라이드오버(3섹션). 주요 카드 7개에 `info={G.*}` prop → ⓘ 팝오버 제공.

| 카드 | span | 데이터 소스 | 내용 |
|------|------|------------|------|
| AI Market Snapshot | 2 | `useBrief` | tone 배지·summary·key_themes·watch_points + symbol_briefs(워치리스트 전 종목 AI 분석: 2컬럼 그리드, Action Bias 신호강도 미터); briefData=null이면 regime 텍스트 fallback. ⏱ freshness badge. |
| Earnings Calendar | 1 | `useEarnings` | 30일 이내 실적 일정 + risk_level 배지 + relevance_tier(임박/진입권/관망). ⏱ freshness badge. |
| Risk Regime | 1 | `useRegime` | RadialGauge + 5요소 바 + 원시 수치 |
| Distribution Days | 1 | `useDistributionDays` | SPY·QQQ DD 카운트 + 도트 시각화 |
| Market Breadth | 1 | `useMacro` | SPY·RSP·MAGS·IWM 5D 수익률 바 + 협소 랠리 경고 |
| Volatility · VIX | 1 | `useMacro` | ^VIX + ^VIX9D 레벨 + rsi-gauge 바 + 백워데이션 감지 |
| Credit Stress | 1 | `useMacro` | HYG·JNK·LQD·IEF 가격·5D 변화율 |
| 진입 레이더 | 1 | `useWatchlist` | 6종목 Entry까지 거리% 오름차순. ≤5% = em-soft 강조. 이미 돌파시 "돌파" 배지. |
| Conviction 리더보드 | 1 | `useWatchlist` | 6종목 conviction_score 내림차순 바차트 + ConvictionBadge. |
| Sector Momentum | 1 | `useMacro` | SMH·XLE·XLY·XHB·ITA 5D 수익률 순위 바 + EMA21 위/아래 |
| Watchlist Top 3 | 1 | `useWatchlist` | Stage 2 점수 상위 3종목 미리보기 |

### 5-8. WatchlistBoard 카드 구성 (3컬럼 그리드)

| 카드 | span | 내용 |
|------|------|------|
| Stage 2 정렬 테이블 | 3 | 6종목 × 10컬럼 (Symbol·Price·Stage2·RS·52W·Entry·Stop·Target·Checks·분석버튼) |
| RS Score 순위 바 | 1 | 6종목 RS Score 가로 막대 정렬 (≥70 녹 / 50~70 청록 / <50 적) |
| Stage 2 체크 히트맵 | 1 | 6종목 × 7조건 매트릭스 (충족=녹 칸) |
| Risk / Reward | 1 | Entry 중심 좌(risk 적)·우(reward 녹) 대칭 바 + 1:N 비율 |

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
cp .env.example .env          # 최초 1회
# .env 수정 후
docker compose up --build -d
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

### 환경변수 전체 목록

#### `.env` (루트) — 프론트엔드 빌드 인자
| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5001` | 프론트가 호출하는 백엔드 주소. **빌드 시 번들** → 변경 시 재빌드 필수. |

`.env.example` → `.env`로 복사 후 수정. `docker-compose.yml`에서 `${NEXT_PUBLIC_API_URL:-http://localhost:5001}`으로 참조.

#### `docker-compose.yml` `environment` 블록 — 백엔드 런타임 변수
| 변수 | 필수 | 미설정 시 동작 | 설명 |
|------|------|----------------|------|
| `SENTIMENT_DATA_URL` | 선택 | Sentiment 보드 비활성화 | 소셜 심리 JSON GitHub raw URL |
| `SENTIMENT_DATA_HISTORY_BASE` | 선택 | 히스토리 조회 불가 | 심리 히스토리 디렉토리 base URL (파일명 제외) |
| `BRIEF_DATA_URL` | 선택 | AI Insight → Regime 텍스트로 fallback | AI Brief JSON GitHub raw URL |
| `EARNINGS_DATA_URL` | 선택 | Earnings Calendar 카드 숨김 | Earnings Intelligence JSON GitHub raw URL |
| `MACRO_INSIGHT_URL` | 선택 | Macro Insight 카드 AI 텍스트 없음 | Macro Insight JSON GitHub raw URL (macro/latest.json) |
| `SENTIMENT_DATA_TOKEN` | 선택 | Public 리포는 불필요 | GitHub PAT — private 리포일 때만 설정 |

#### 캐시 TTL (backend 인메모리)
| 서비스 | TTL | 상수 위치 |
|--------|-----|-----------|
| Brief | 30분 (1800초) | `brief_service.py: CACHE_TTL` |
| Earnings | 60분 (3600초) | `earnings_service.py: CACHE_TTL` |
| Sentiment | 30분 (1800초) | `sentiment_service.py: CACHE_TTL` |

---

## 8. 고정 심볼 목록

### 워치리스트 (`endpoints.py: WATCHLIST_SYMS`)
`["TSLA", "AAPL", "NVDA", "META", "AMZN", "GOOGL", "PLTR"]`

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

## 10. 모바일 반응형 구현 (2026-05-30)

### 브레이크포인트
`max-width: 767px` — iPhone SE~Pro Max, Galaxy S/A 시리즈 전체 커버.

### 핵심 레이아웃 전환 (globals.css)
| 데스크톱 | 모바일 |
|----------|--------|
| `.app` grid 2컬럼(rail+main), min-height:100dvh | `.app` 1컬럼, height:100dvh (고정→스크롤 컨텍스트) |
| `.main` flex-column, overflow:hidden | `.main` display:block, overflow-y:auto (스크롤 담당) |
| `.board` grid (각 보드별 gridTemplateColumns) | `.board` flex-column (mob-order로 순서 제어) |
| Rail + TopBar(full) + MarketStrip | hide-mobile → 숨김, Topbar 48px 슬림, BottomTabs |

### CSS 유틸 클래스 (모바일 전용)
| 클래스 | 역할 |
|--------|------|
| `.mob-order-1`~`.mob-order-8` | CSS order 프로퍼티 — 카드 표시 순서 제어 |
| `.mob-wrap` | 모바일: flex box / 데스크톱: `display:contents` (grid 투명화) |
| `.mob-macro-groups` | 모바일: flex-column / 데스크톱: `display:contents` |
| `.mob-inner-stack` | DeepDive ROW4 3열 → flex-column 1열 강제 |
| `.mob-chart-limit` | 차트 컨테이너 height:300px 고정 |
| `.mob-symbol-bar` | DeepDive 종목선택 바 overflow-x:auto (가로스크롤) |
| `details.mob-collapse` | 접기/펼치기 — 모바일에서 summary 표시, 데스크톱에서 `display:contents` |
| `.hide-mobile` / `.hide-on-mobile` | `display:none !important` |

### 보드별 모바일 카드 순서
- **Overview**: Regime(1) → Breadth·VIX(2) → Sector(3) → 진입레이더(4) → Conviction(5) → AI Insight(6,접기) → Earnings·DD·Credit(7) → Watchlist(8)
- **DeepDive**: 종목바(1) → 차트(2) → R:R(3) → Stage2(4) → 세력(5) → 소셜·Brief·실적(6) → Regime·심리(7)
- **Macro**: 배너(1) → 6그룹(2) → Sector(3)
- **Sentiment**: Market(1) → Symbol(2) → TopNews(3,접기) → 안내(4)

### 수정 시 주의사항
- 데스크톱 grid 구조를 건드리는 wrapper div는 반드시 `mob-wrap` 클래스 + 데스크톱 `display:contents` 적용
- `details.mob-collapse`는 데스크톱에서 `display:contents`로 투명 처리되므로 기존 레이아웃에 영향 없음
- `DailyChart.tsx`: height를 `clientHeight || 480`으로 읽으므로 `.mob-chart-limit` 컨테이너에 반드시 `height` 설정 필요 (max-height 불가)

---

## 11. 코드 수정 시 참고 지점

| 수정 대상 | 파일 위치 |
|-----------|-----------|
| 신호 조건 변경 | `backend/core/signal_engine.py: get_vcp(), get_sniper(), ...` |
| Stage2 체크리스트 기준 | `backend/core/signal_engine.py: calculate_stage2_analysis()` |
| Regime 임계값 | `backend/core/regime_engine.py: TREND_LOW/HIGH, ...` 상수 |
| DD 기준일 변경 | `backend/core/distribution_day.py: DD_LOOKBACK, DD_THRESHOLD_PCT` |
| yfinance MultiIndex / daily+intraday data 정확도 | `backend/core/data_adapter.py` (SINGLE SOURCE OF TRUTH: normalize_yf_dataframe + get_* family) — full centralization+fetch. Task2 complete: full delegation (data_service thin; direct adapter in endpoints for daily paths) + extensive tests (get_multi_daily targeted + more). Task3: endpoints use hardened path + attach meta. Phase 2: adj_close preserve + selective adjusted in signal_engine.calculate_stage2_analysis (long-term only). Phase 4: types/hooks for meta + FE badges. Phase 5: full 29 tests green (adapter+signal_engine specific), manual verification (endpoints daily/AI meta, no-breakage non-split/intraday). Cross-repo linkage: market-sentiment-data earnings hardening reflected in collect_earnings.py + services. |
| Conviction Composite Score v1 (Phase 1) | `backend/core/conviction_calculator.py` (TDD + refined Regime-conditioned + reliability). Error handling, loading states, and UI polish improved. 12 tests. (2026-05-25) |
| Watchlist / Daily 항목에 신규 필드 추가 | `backend/api/schemas.py` (WatchlistItemSchema, DailyResponse) + `endpoints.py` (get_watchlist_endpoint, get_daily_endpoint) |
| Brief Context Attribution (Phase 1) | `backend/api/endpoints.py:get_brief_endpoint` + `schemas.BriefResponse` now surface top-level `context` (popped from GitHub raw). Pairs with market-sentiment-data collect_brief.py context builder. (2026-05-25) |
| 워치리스트 종목 추가 | `backend/api/endpoints.py: WATCHLIST_SYMS` + `frontend/app/types.ts: SYMBOLS` |
| 매크로 심볼 추가 | `backend/api/endpoints.py: MACRO_SYMBOLS` |
| API 주소 변경 | `frontend/app/types.ts: API_BASE` + `docker-compose.yml: NEXT_PUBLIC_API_URL` |
| 신호 메타데이터(색상·설명) | `frontend/app/types.ts: SIGNAL_META` |
| FreshnessMeta + AI 응답 meta (Phase 4) | `frontend/app/types.ts` (SentimentData/BriefResponse/EarningsResponse); hooks useBrief/useEarnings expose *Meta; badges in OverviewBoard (AI+ Earnings) + light SentimentBoard |
| 컨텍스트 도움말 — 용어 추가/수정 | `frontend/app/glossary.ts` (GLOSSARY 배열 + G 맵). 28개 항목. key 기반 조회(G.risk_regime 등). InfoPopover에서 직접 사용하거나 Card info prop 경유. |
| 컨텍스트 도움말 — 보드 가이드 내용 수정 | 각 보드 파일의 `*_GUIDE: GuideSection[]` 상수 (예: OVERVIEW_GUIDE, INTRADAY_GUIDE 등). 3섹션: 이 화면은/핵심 지표 읽는 법/지금 이렇게 쓰세요. |
| 컨텍스트 도움말 — 가이드 버튼 위치 | `frontend/components/shell/MarketStrip.tsx` 우측 끝(margin-left:auto). 각 보드는 'guide:open' 이벤트 수신. 인라인 guide-btn 버튼 없음. |
| 컨텍스트 도움말 — UI 스타일 | `frontend/app/globals.css` — `.info-pop*`(팝오버), `.guide-panel*`(슬라이드오버), `.guide-btn`(트리거, strip 내에서 relative 포지셔닝), `.board-wrap`(포지셔닝 컨텍스트) 블록. |
| InfoPopover 팝오버 위치 로직 | `frontend/components/ui/InfoPopover.tsx` — open 시 `getBoundingClientRect()`로 trigger 좌표 계산, `position:fixed`+`zIndex:1000`으로 렌더링, 우측 overflow 자동 보정(`Math.min(rect.left, vpWidth-290)`) |
| 폴링 간격 변경 | `frontend/hooks/useIntraday.ts` (현재 30초) |
| Brief/Earnings URL 변경 | `docker-compose.yml: BRIEF_DATA_URL / EARNINGS_DATA_URL` |
| Brief 캐시 TTL 변경 | `backend/services/brief_service.py: CACHE_TTL` (현재 1800초) |
| Earnings 캐시 TTL 변경 | `backend/services/earnings_service.py: CACHE_TTL` (현재 3600초) |
| Brief 워치리스트 변경 | `collect/collect_brief.py: WATCHLIST` + `collect/collect_earnings.py: WATCHLIST` |
| Macro Insight 신호등 규칙 변경 | `backend/core/macro_rules.py` (compute_*_signal 함수들) |
| Macro Insight AI 캐시 TTL/URL | `backend/services/macro_insight_service.py: CACHE_TTL / MACRO_INSIGHT_URL` |
