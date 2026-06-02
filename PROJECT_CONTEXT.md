> 한국어 문서: [PROJECT_CONTEXT.ko.md](./PROJECT_CONTEXT.ko.md)

# SniperBoard — Project Context (UPDATED 2026-06-02 competitive-improvements)

## 0. Purpose of This Document

An AI-readable context document synthesized from the entire codebase.
Read this file first when modifying code — it lets you understand the project structure and logic without reading every source file.

---

## 1. One-Line Summary

**SniperBoard** is a US stock trading signal dashboard based on the Livermore · O'Neil · Minervini methodologies.
A FastAPI (Python) backend fetches prices via yfinance and calculates signals; a Next.js frontend visualizes them across 7 specialized boards.
Grok/Hermes AI runs on an external cron job, generating market narratives, stock Briefs, and Earnings Intelligence, pushing them to GitHub; the backend serves them from cache.

---

## 2. Directory Structure

```
sniperboard/
├── backend/
│   ├── main.py                   # FastAPI app entry point (app name: "SniperBoard Signal API"), CORS allow_origins=["*"]
│   ├── requirements.txt          # fastapi, uvicorn, yfinance, pandas, python-dotenv, pytest
│   ├── Dockerfile
│   ├── api/
│   │   ├── endpoints.py          # REST endpoints (APIRouter prefix=/api). MACRO_SYMBOLS dict uses English names (e.g. "WTI Crude Oil", "Gold ETF (GLD)") — frontend overrides display via MACRO_SYMBOL_NAMES BiLang map.
│   │   └── schemas.py            # All Pydantic v2 request/response models. TopNews + SymbolSentiment/MarketSentiment top_news Optional. Bilingual _en/_ko Optional fields added (2026-05-31): MacroOverallInsight (summary_en/ko, bullets_en/ko), MacroGroupInsight (text_en/ko), UpcomingEarning (ai_summary_en/ko, action_note_en/ko), RecentResult (ai_reaction_en/ko). All v1.x fields kept as Optional for backward compat.
│   ├── core/
│   │   ├── signal_engine.py      # Core: all technical indicator and signal calculations (700+ lines). Phase 2: calculate_stage2_analysis detects 'adj_close' and uses adjusted (scaled high/low + adj_close series) for 52w/RS/ema200_slope/pullback/pivot/entry on split symbols. GC/intraday/raw unchanged.
│   │   ├── regime_engine.py      # Risk Regime 5-factor composite score (0~100)
│   │   ├── distribution_day.py   # O'Neil Distribution Day count (25 trading days)
│   │   └── data_adapter.py       # SINGLE SOURCE OF TRUTH: yfinance MultiIndex normalization + fetch (normalize_yf_dataframe + get_daily + get_ohlcv_intraday + get_multi_daily). yf 1.3+ compatible. Phase 2: adj_close preserved for daily paths → Stage2 long-term accuracy on splits. Phase 5: centralization verified via full tests + manual endpoint checks.
│   │   └── conviction_calculator.py  # Phase 1: Conviction Composite Score v1 (TDD). 40/30/30 weighted (Stage2 0-7 norm + Sentiment + Regime total). Pure function, regime=None → 50 neutral. Returns score+label+components. 12 tests. Labels are English: "Very High"(≥80) / "High"(≥65) / "Moderate"(≥50) / "Low"(≥35) / "Very Low"(<35). Notes also English. Frontend maps to BiLang via CONVICTION_LABEL_META.
│   │   └── macro_rules.py            # Macro Insight traffic-light rule engine. compute_macro_signals(items) → {overall:{judgment,green_count,red_count}, groups:{key:{signal,direction}}}. 6 groups (volatility/breadth/credit/rates/commodities/sectors) each with green/yellow/red + overall RISK_ON/MIXED/RISK_OFF. Pure function, dict list input. TDD 20 tests.
│   │   └── backtest_engine.py        # 백테스트 엔진 (2026-06-02). Stage2 신호 기반 일봉 백테스트. 핵심 함수: fetch_backtest_data(symbols) → yfinance start=2019-01-01 다운로드 / _compute_stage2_series(df, spy_df, rs_threshold=50, stop_atr_mult=2.0, rr_ratio=3.0) → 벡터 Stage2 7체크 + R:R 플랜 (look-ahead 없음, rs_threshold 파라미터화) / _simulate_trades(symbol, df, signals, ..., spy_ema200_filter=None) → bar-by-bar 시뮬레이션 (T-1 신호→T 체결, 갭 처리, 쿨다운, SPY>EMA200 시장필터) / compute_stats(trades) → win_rate/expectancy_r/profit_factor/mdd/max_consecutive_loss/equity_curve / compute_monte_carlo(trades, n_simulations=10000) → 부트스트랩 리샘플링 신뢰구간 (p5/p25/median/p75/p95 + prob_positive, 완전 벡터화, ~0.1초) / run_full_backtest(symbols, rs_threshold=70, use_spy_filter=True, ...) → 전 종목 집계 + IS/OOS 분리 + Stage2 점수별 분해 + monte_carlo + backtest_result.json 캐시 / run_parameter_sweep(symbols, configs) → 8개 파라미터 조합 일괄 실험. 권장설정: rs_threshold=70, use_spy_filter=True (기대값 +0.460R, OOS +0.511R, MC 양수확률 99.8%). AMZN 구조적 부적합 확인(21% 승률, 모든 조합 불개선). 설정: STAGE2_THRESHOLD=5, SLIPPAGE_PCT=0.0005, TIMEOUT_BARS=60, COOLDOWN_BARS=10, ENTRY_WINDOW_BARS=5, IN_SAMPLE_END=2023-12-31. TDD 22 tests.
│   ├── services/
│   │   ├── base.py               # BaseDataService abstract class
│   │   ├── data_service.py       # YFinanceDataService implementation + module-level helpers
│   │   ├── brief_service.py      # GitHub raw fetch + 30-min in-memory cache (BRIEF_DATA_URL)
│   │   ├── earnings_service.py   # GitHub raw fetch + 60-min in-memory cache (EARNINGS_DATA_URL)
│   │   └── overnight_service.py  # Yahoo Finance WebSocket → Blue Ocean ATS overnight price stream. Runs in a dedicated daemon thread (asyncio.run in thread) — NOT in uvicorn's event loop, to avoid handshake timeouts caused by blocking yfinance I/O. Protobuf base64 parsing (field1=symbol, field2=price/float32, field6=session_hours/varint:8=overnight, field12=chg_pct). start_overnight_service() called in FastAPI lifespan; spawns threading.Thread(daemon=True).
│   │   └── macro_insight_service.py  # GitHub raw fetch + 30-min in-memory cache (MACRO_INSIGHT_URL). fetch_macro_insight() → Optional[dict]. get_ai_meta(raw) → {generated_at,age_minutes}. Returns None gracefully if URL not set.
│   └── tests/
│       ├── test_data_adapter.py (29 tests — adapter + signal_engine; Phase 5 full suite green)
│       ├── test_signal_engine.py (incl. adjusted vs raw split symbol TDD)
│       ├── test_conviction_calculator.py (Phase 1 TDD: 3 tests for weighted Conviction v1)
│       ├── test_backtest_engine.py (22 tests — Stage2 벡터계산/look-ahead/청산우선순위/통계/MDD)
│       └── (service tests: brief/earnings/sentiment — test_sentiment_service.py: fixtures updated with top_news)
├── frontend/
│   ├── package.json              # Next.js 16.2.6, React 19.2.4, TanStack Query 5, Zustand 5, lightweight-charts 4.2.3, Tailwind v4
│   ├── next.config.ts            # API proxy rewrites: /api/* → BACKEND_URL/api/*
│   ├── Dockerfile                # Build arg: BACKEND_URL (Next.js bakes rewrites at build time)
│   ├── app/
│   │   ├── layout.tsx            # Root layout (theme init script, data-theme="dark", viewport-fit=cover for mobile safe-area)
│   │   ├── page.tsx              # App shell: Rail+Topbar+MarketStrip+Board router + ⌘K handler
│   │   ├── providers.tsx         # QueryClientProvider wrapper
│   │   ├── i18n.ts               # Locale type ('en'|'ko'), BiLang interface, t() and tField() helpers (2026-05-31)
│   │   ├── types.ts              # All TypeScript type definitions + metadata constants. REGIME_META/DD_META/SIGNAL_META/STAGE2_META/SENTIMENT_META/TREND_META/VOLUME_META all use BiLang for label/desc/action (2026-05-31).
│   │   ├── glossary.ts           # Context help data. GlossaryEntry{key, term: BiLang, body: BiLang} + GLOSSARY array (28 entries) + G map (key-based lookup). Used by InfoPopover, CommandPalette, BoardGuidePanel. Converted to BiLang (2026-05-31).
│   │   └── globals.css           # Plaid DS design tokens (CSS vars, dark/light toggle, component classes). .info-pop* + .guide-panel* + .guide-btn + .board-wrap classes included. .strip: align-items center (guide button vertical centering). Mobile responsive block: @media(max-width:767px){ .app 1-col grid/height:100dvh, .main display:block overflow-y:auto, .board flex-column, mob-order-1~8 utils, details.mob-collapse folding, .mob-chart-limit 300px, .bottom-tabs/.bottom-tabs__item, .mob-macro-groups/.mob-inner-stack/.mob-wrap 1-col forced } + @media(min-width:768px){ .mob-wrap/.mob-macro-groups display:contents desktop-transparent, details.mob-collapse display:contents }
│   ├── components/
│   │   ├── shell/
│   │   │   ├── Rail.tsx          # Left navigation rail (7 board icons + active indicator). deepdive=Layers icon in 2nd position. Mobile: hidden via hide-mobile class.
│   │   │   ├── Topbar.tsx        # Top bar (title, search, symbol buttons, Regime mini, theme toggle, EN/KO locale toggle). Mobile: topbar__symbols/topbar__regime/topbar__sep/topbar__search hidden → logo+board name+theme toggle only (48px slim). EN/KO toggle added 2026-05-31. BOARD_LABELS now includes all 9 boards (backtest/track added 2026-06-02) — fallback 'Overview' bug fixed.
│   │   │   ├── BottomTabs.tsx    # Mobile-only bottom tab bar (4 tabs: Overview/Analysis/Macro/Sentiment). Shows only at max-width:767px. Connected to useStore board/setBoard. safe-area-inset-bottom applied. Bilingual labels (2026-05-31).
│   │   │   ├── MarketStrip.tsx   # Slim market strip (selected symbol + SPY/QQQ/IWM/VIX/DXY/GLD/CL=F). PRE/POST price display (usePrePost). "? Guide" button on far right — dispatches 'guide:open' custom event on click. Mobile: hidden via hide-mobile class. Bilingual tooltips and guide button (2026-05-31).
│   │   │   └── CommandPalette.tsx # ⌘K command palette (symbol/board search). Typing '?' switches to glossary search mode — filters GLOSSARY array, shows "Glossary search mode — N results" banner. Bilingual nav subs and glossary entries (2026-05-31).
│   │   ├── ui/
│   │   │   ├── Icons.tsx         # SVG icons (Crosshair, Activity, Candles, Eye, Globe, Heart, etc.)
│   │   │   ├── Card.tsx          # Card/ScorePill wrapper. Optional info?: {term, body} prop — if provided, renders InfoPopover in card__hd.
│   │   │   ├── InfoPopover.tsx   # Inline ⓘ popover. Props: term, body. Click-toggle, closes on ESC/outside click. Singleton behavior via 'info-pop:close-all' custom event. Popup: position:fixed + getBoundingClientRect for auto right-edge correction (avoids card overflow:hidden clipping).
│   │   │   ├── BoardGuidePanel.tsx # Board-wide guide slide-over. Props: title, sections: GuideSection[], isOpen, onClose. Slides in from right, closes on ESC/overlay click. Rendered inside each board's board-wrap.
│   │   │   ├── ConvictionBadge.tsx # Conviction score badge (score/locale/size props). Derives BiLang label from score via CONVICTION_LABEL_META — does NOT use backend conviction_label string. score≥65=bull, ≥50=teal, ≥35=warn, <35=bear. size sm/md.
│   │   │   ├── Sparkline.tsx     # Canvas-based sparkline
│   │   │   ├── RadialGauge.tsx   # Canvas-based radial gauge
│   │   │   └── HeatStrip.tsx     # CSS-based heatmap strip
│   │   ├── boards/               # 7 board components. Common pattern: <div className="board-wrap"> wrapper → BoardGuidePanel is a direct child of board-wrap. Guide button lives in MarketStrip (moved there). Each board listens for 'guide:open' event via useEffect → setGuideOpen(true). GlossaryPanel fully removed. All boards converted to bilingual with t()/tField() (2026-05-31).
│   │   │   ├── OverviewBoard.tsx # Market overview (11 cards): AI Insight + Earnings Calendar + Regime + DD + Breadth + VIX + Credit + Entry Radar + Conviction Leaderboard + Sector + Watchlist Top3. ⏱ freshness badges. 7 cards have info={G.*} props (resolved to locale-aware strings via t()). Mobile: mob-order-1~8 for Big→Detail reordering, AI Insight details.mob-collapse.
│   │   │   ├── DeepDiveBoard.tsx # Full analysis (5-Row): Row1=symbol selector+price bar+badges(Stage2/Conviction/monthly/structure/signal)+PRE/POST price. Row2=DailyChart(3fr)|Stage2 checks+KPI4(2fr). Row3=Institutional Activity(3fr)|R:R Entry Plan(2fr). Row4(3×1fr)=Social Sentiment|AI Brief|Earnings. Row5=Regime(3fr)|Market-wide Sentiment(2fr). market_structure 배지에 '·D' 접미사 추가(일봉 구조 명시), 단기신호 배지에 '·{timeframe}' 접미사 추가 — UPTREND(D) vs downtrend(5m) 혼동 방지 (2026-06-02). tField() for all AI data fields.
│   │   │   ├── IntradayBoard.tsx # Intraday: IntradayChart + active signals + RSI + action bar. SIG_META BiLang map for signal name InfoPopovers. Bilingual all labels.
│   │   │   ├── DailyBoard.tsx    # Daily: DailyChart + Stage2 checklist + R:R panel. Stage2·R:R cards have info prop (t() applied to G.* entries). Earnings banner uses tField() for bilingual ai_summary/action_note fields (v2.0 _en/_ko pairs, v1.x fallback).
│   │   │   ├── WatchlistBoard.tsx # Watchlist: Stage2-sorted table. Table headers (Stage2/RS/Conviction) have InfoPopovers (t() applied). Monthly phase bilingual.
│   │   │   ├── MacroBoard.tsx    # Macro: overall RISK-ON/MIXED/RISK-OFF banner + sector rotation bar + 6 group cards. Each card: traffic light (🟢🟡🔴) · direction (↗↘) · AI interpretation text · freshness badge. useMacroInsight() combined. Graceful degrade when AI absent. Mobile: mob-order-1~3 (banner→groups→Sector), mob-macro-groups (display:contents desktop / flex-column mobile), bullets details.mob-collapse. Bilingual group labels and judgment text. Symbol names from MACRO_SYMBOL_NAMES BiLang map (not backend name field). AI text rendered via tField(text_en, text_ko, text, locale) for v2.0/v1.x compat; bullets via tField(bullets_en[i], bullets_ko[i], bullets[i], locale).
│   │   │   └── SentimentBoard.tsx # Sentiment: market gauge + per-symbol cards TIER1/TIER2 구분 (2026-06-02). TIER1(11종목) 섹션(하늘색 헤더) + TIER2(10종목) 섹션(보라 헤더) + 기타 섹션 순서. 각 섹션별 grid 렌더링. TopNewsBox tField() 이중언어. Composite Score card info prop. Bottom: "Social Sentiment Data" explainer card.
│   │   │   └── BacktestBoard.tsx  # 백테스트 결과 화면 (2026-06-02). 방법론 배너(투명성) + KPI 4카드(총거래/승률/기대값/손익비) + IS vs OOS 비교 + Stage2 점수별 분해 + SVG 자산곡선 + 종목별 성과 테이블 + 실행 버튼. useBacktest() hook 사용. GET /api/backtest/result 조회, POST /api/backtest/run 실행.
│   │   └── backtest_engine.py        # (unchanged)
│   │   └── signal_tracker.py         # 실거래 신호 트래킹 (2026-06-02). SQLite persistence (backend/data/signal_log.db). init_db() → 앱 시작 시 호출. scan_and_log(watchlist_items, regime) → Stage2 >= 5 신호 자동 로깅 (UNIQUE on symbol+signal_date, OPEN 신호 중복 방지). update_outcomes() → PENDING/ACTIVE 신호를 최신 일봉으로 바 단위 시뮬레이션하여 WIN/LOSS/TIMEOUT/CANCELLED 갱신 (get_multi_daily period="6mo" 사용). compute_live_stats() → n_closed/win_rate/expectancy_r/profit_factor/mdd/equity_curve/regime_breakdown/pipeline + health{status/confidence/deltas} + backtest_baseline. BACKTEST_BASELINE = {expectancy_r:0.460, win_rate:0.386, profit_factor:1.917, n:145}. 헬스 판단: expectancy_r >= 0.7*baseline → ON_TRACK, >= 0.0 → WATCH, < 0 → UNDERPERFORMING, n < 10 → INSUFFICIENT_DATA.
│   │   │   └── TrackBoard.tsx     # 실거래 트래킹 화면 (2026-06-02). 경쟁 차별화 핵심: 모든 신호 자동 기록 + 결과 추적 + 백테스트 기준값(+0.460R) 대조. 구성: 모델헬스 배너(ON_TRACK/WATCH/UNDERPERFORMING/INSUFFICIENT_DATA) + KPI 4카드(총신호/승률/기대값/손익비) + SVG 누적R 곡선(라이브+백테스트 기준선 비교) + 현재 파이프라인(PENDING/ACTIVE 신호) + 레짐별 성과 분해 + 신호 이력 테이블(상태 필터). useSignalLog/useSignalLogStats/useRefreshSignalLog hooks. GET /api/signal-log, /api/signal-log/stats, POST /api/signal-log/refresh.
│   │   │   └── SentimentTrendChart.tsx # Sentiment trend chart: stock price line (left axis) + composite_score overlay (right axis), 7/30d toggle
│   │   ├── charts/               # lightweight-charts components
│   │   │   ├── IntradayChart.tsx
│   │   │   └── DailyChart.tsx
│   │   └── (legacy tab components — files kept, no longer used in page.tsx)
│   └── hooks/
│       ├── useStore.ts           # Zustand persist: symbol, timeframe, board, theme, locale, cmdOpen, rrAccount, rrRiskPct. locale: Locale ('en'|'ko', default 'ko') added 2026-05-31.
│       ├── useIntraday.ts        # GET /api/ohlcv + /api/latest-signal (30-second polling)
│       ├── useDaily.ts           # GET /api/daily
│       ├── useWatchlist.ts       # GET /api/watchlist
│       ├── useMacro.ts           # GET /api/macro
│       ├── useRegime.ts          # GET /api/regime
│       ├── useSentiment.ts       # GET /api/sentiment
│       ├── useBrief.ts           # GET /api/brief (30-min staleTime)
│       ├── usePrePost.ts         # GET /api/prepost (60-second polling). prePostData: { market_state, pre/post price+chg_pct, regular_close }
│       ├── useEarnings.ts        # GET /api/earnings (60-min staleTime)
│       ├── useDistributionDays.ts # GET /api/distribution-days
│       └── useSignalLog.ts       # GET /api/signal-log, /api/signal-log/stats, POST /api/signal-log/refresh. Exports: useSignalLog(symbol?), useSignalLogStats(), useRefreshSignalLog(). Types: SignalLogEntry, SignalLogStats, SignalStatus.
└── docker-compose.yml            # backend 8000→5001, frontend 3000→4000. Frontend build arg+env: BACKEND_URL=http://backend:8000
```

---

## 3. Backend API Endpoints (`backend/api/endpoints.py`)

Base URL: `http://<host>:4000/api` (via Next.js proxy) or `http://<host>:5001/api` (direct)

| Path | Parameters | Returns |
|------|-----------|---------|
| `GET /ohlcv` | `symbol`, `tf` (default 5m) | OHLCV candles + 6 signal boolean arrays + ema21/50/rsi/atr |
| `GET /latest-signal` | `symbol`, `tf` (default 5m) | Latest candle signal summary (active_signals, price/RSI/EMA) |
| `GET /daily` | `symbol` | 252-candle daily data + EMA8/21/50/200/ATR14/GC + full Stage2 |
| `GET /macro` | — | 21 macro symbols: price · 1D/5D change · EMA8/21 · market structure · RSI14 |
| `GET /watchlist` | — | WATCHLIST_SYMS 6 symbols Stage2 score descending |
| `GET /regime` | — | Risk Regime 5-factor scores + regime string |
| `GET /distribution-days` | — | SPY·QQQ DD count/level/dates |
| `GET /sentiment` | — | Social sentiment JSON (GitHub raw 30-min cache) + `meta: {fetched_at, age_minutes, source}` |
| `GET /sentiment/history` | `symbol` (required), `days` (1-30, default 7) | N-day pre_open/post_close sentiment point array. Supports `symbol="MARKET"`. 5-min TTL cache. |
| `GET /prepost` | `symbol` | Pre/after-market price · change% · market_state (PRE/POST/REGULAR/CLOSED/OVERNIGHT). ticker.info first, PREPRE or CLOSED→OVERNIGHT conversion when WebSocket cache populated. regular_close always uses regularMarketPrice (not regularMarketPreviousClose) for non-REGULAR states. |
| `GET /brief` | — | AI Daily Brief JSON (GitHub raw 30-min cache) + `meta: {fetched_at, age_minutes, source}` |
| `GET /earnings` | — | Earnings Intelligence JSON (GitHub raw 60-min cache) + `meta: {fetched_at, age_minutes, source}` |
| `GET /macro/insight` | — | 6 group traffic lights (signal/direction) + AI interpretation text (text/text_en/text_ko) + overall judgment + summary/summary_en/summary_ko + bullets/bullets_en/bullets_ko + ai_meta (age_minutes). Rule-based real-time + GitHub-cached AI overlay. |
| `GET /backtest/result` | — | 캐시된 백테스트 결과 JSON. 없으면 404. 구조: generated_at/config(rs_threshold/use_spy_filter 포함)/methodology/aggregate(all/in_sample/out_of_sample)/breakdown_by_score/by_symbol. |
| `POST /backtest/run` | `symbols[]` (optional), `threshold` (1-7, default 5), `rs_threshold` (0-100, default 70), `use_spy_filter` (bool, default true) | 백테스트 즉시 실행 + 캐시 저장 후 요약 반환. symbols 미지정 시 WATCHLIST_SYMS 전체. 수십 초 소요. |
| `POST /backtest/sweep` | `symbols[]` (optional) | 8개 파라미터 조합 스윕 실행 + 비교 결과 반환. 수분 소요. |
| `GET /signal-log` | `symbol?`, `limit` (default 200) | 신호 로그 조회 (최신순). 상태 포함: PENDING/ACTIVE/WIN/LOSS/TIMEOUT/CANCELLED. |
| `GET /signal-log/stats` | — | 라이브 성과 통계 + 백테스트 기준값(+0.460R) 비교. health.status: ON_TRACK/WATCH/UNDERPERFORMING/INSUFFICIENT_DATA. |
| `POST /signal-log/refresh` | — | PENDING/ACTIVE 신호 결과를 최신 일봉으로 갱신 (백그라운드 실행). |

---

## 4. Core Business Logic

### 4-1. Intraday Indicators (`signal_engine.py: add_indicators`)

For intraday: EMA21, EMA50, RSI(14, Wilder's Smoothed MA), ATR(14), MACD histogram, vol_avg20

### 4-2. 6 Intraday Signals (`signal_engine.py: calculate_signals`)

| Signal | Key Conditions | Action |
|--------|---------------|--------|
| **VCP** | 30-candle high + volume≥avg×2 + EMA21>50 + ATR 8-candle contraction | Breakout entry |
| **Sniper** | EMA21 within 0.4% + RSI 38~58 + price>EMA21 + volume≥prior candle×1.4 | Entry |
| **Pullback** | 4.5~9% from 15-candle high + EMA approach + MACD 3-candle rebound + volume declining | Pullback entry |
| **StrongTrend** | price>EMA21>EMA50 + EMA21 slope +0.15% + RSI 52~78 + volume≥avg×0.9 | Hold |
| **Overbought** | RSI≥76 + 4 of 5 candles bullish + EMA21 deviation +3.2% + volume declining | Partial exit |
| **Downtrend** | price<EMA21 + EMA21 negative slope + volume≥avg×1.3 + 8-candle low | Avoid |

### 4-3. Daily Indicators (`signal_engine.py: add_daily_indicators`)

EMA8, EMA21, EMA50, EMA200, RSI14, ATR14, vol_avg20, Gaussian Channel (period=100, mult=1.5)

### 4-4. Gaussian Channel (`signal_engine.py: gaussian_channel`)

- Causal Gaussian kernel weighted moving average (no look-ahead bias)
- center = (gc_high + gc_low) / 2, upper/lower = center ± half×mult
- States: gc_above, gc_below, gc_breakout (breakout on that day), gc_retest (within 3% retest)

### 4-5. Stage2 Analysis (`signal_engine.py: calculate_stage2_analysis`)

Minervini 7-item checklist (score 0~7):
1. `price_above_emas`: price > EMA21 > EMA50 > EMA200
2. `ema200_rising`: EMA200 20-day slope > 0
3. `near_52w_high`: within -25% of 52-week high
4. `above_52w_low`: at least +30% above 52-week low
5. `pullback_shallow`: correction from 20-day high ≤ 15%
6. `rs_strong`: RS Score ≥ 50 (63-day return vs SPY)
7. `volume_contracting`: 5-day avg < 20-day avg

Additional calculations:
- Entry price = 20-day **daily high** max × 1.005 (based on high, not close)
- Stop price = Entry − 2 × ATR14
- Target price = Entry + 3 × (Entry − Stop)
- rs_score formula: min(100, max(0, 50 + (stock_63d_ret − spy_63d_ret) × 2))
- breadth_narrow: True when SPY is at 20-day high but RSP is not

Phase 2: long-horizon metrics (52w pcts, RS 63d, EMA200 slope 20d, pullback, pivot high/entry) now use adj_close + scaled high/low when 'adj_close' column present. Non-split or legacy path unchanged. GC/detects/short-term on raw.

Additional pattern detection:
- `market_structure` (UPTREND/DOWNTREND/DISTRIBUTION/ACCUMULATION/NEUTRAL): `detect_market_structure()`
- `rsi_divergence_bearish/bullish`: `detect_rsi_divergence()` — comparing last 40-candle swing points
- `bear_flag`: `detect_bear_flag()` — 5%+ drop followed by low-volume consolidation

### 4-6b. Monthly Phase Analysis (inside `signal_engine.py: calculate_stage2_analysis`)

Resamples 252 daily candles to monthly candles and evaluates against **10-month EMA**:
- `monthly_phase`: `CONFIRMED_UPTREND` (above monthly EMA10 + positive slope) / `WEAKENING` (above EMA10 but negative slope) / `NEUTRAL` (within ±3% of EMA10) / `DOWNTREND` / `UNKNOWN` (insufficient data)
- `monthly_uptrend_confirmed`: bool — True only when CONFIRMED_UPTREND
- `monthly_ema10`: latest 10-month EMA value
- `pct_from_monthly_ema10`: deviation from EMA10 (%)
- Included in Stage2Schema + WatchlistItemSchema. Displayed as badge in DailyBoard, "Monthly" column in WatchlistBoard.

### 4-6. Risk Regime (`regime_engine.py: compute_regime`)

5 factors each 0~20 points, calculated only when ≥3 valid components:
- **Trend**: SPY vs EMA200 deviation → linear map [−5%, +10%]
- **Breadth**: RSP−SPY 60-day relative performance → [−5%, +3%]
- **Credit**: HYG/IEF ratio 30-day change → [−2%, +1%]
- **Volatility**: ^VIX → [30, 14] (invert=True)
- **Momentum**: SPY 20-day RoC → [−5%, +5%]

Total = sum(valid) / len(valid) × 5 → RISK_ON(≥80) / CONSTRUCTIVE(≥60) / MIXED(≥40) / DEFENSIVE(≥20) / RISK_OFF(<20)

### 4-7. Distribution Day (`distribution_day.py: count_distribution_days`)

Last 25 trading days: days where (closing change ≤ -0.2%) AND (volume > prior day)
OK(<4) / WARNING(4~5) / DANGER(≥6)

---

## 5. Frontend Architecture

### 5-1. Global State (`hooks/useStore.ts` — Zustand)

| State | Default | Description |
|-------|---------|-------------|
| `symbol` | `'TSLA'` | Selected symbol |
| `timeframe` | `'5m'` | Intraday timeframe |
| `board` | `'overview'` | Current board (overview/deepdive/intraday/daily/watchlist/macro/sentiment) |
| `locale` | `'ko'` | UI language ('en' or 'ko'). Added 2026-05-31. Persisted to localStorage. |
| `rrAccount` | `'100000'` | R:R calculator account size |
| `rrRiskPct` | `'1'` | R:R calculator risk % |

### 5-2. API Hooks (TanStack Query v5)

- `useIntraday(symbol, timeframe)`: `/ohlcv` + `/latest-signal` combined, 30-second polling
- `useDaily(symbol)`: `/daily`
- `useWatchlist()`: `/watchlist`
- `useMacro()`: `/macro`
- `useMacroInsight()`: `/macro/insight` — 5-min staleTime, `{ insightData, insightLoading }`
- `useRegime()`: `/regime`
- `useDistributionDays()`: `/distribution-days`
- `useSentiment()`: `/sentiment` — 30-min staleTime, returns full (incl. `meta` for freshness badge)
- `useSentimentHistory(symbol, days)`: `/sentiment/history` — 5-min staleTime, enabled: !!symbol
- `useBrief()`: `/brief` — 30-min staleTime, `briefData` + `briefMeta` (FreshnessMeta) for ⏱ badge
- `useEarnings()`: `/earnings` — 60-min staleTime, `earningsData` + `earningsMeta` for badge

### 5-3. Type Definitions (`app/types.ts`) — Key Constants

```typescript
export const TIER1_SYMBOLS = ['TSM','NVDA','META','TSLA','PLTR','MU','CRWD','AMZN','MSFT','AAPL','GOOGL'];
export const TIER2_SYMBOLS = ['RKLB','CEG','VST','ALAB','OKLO','APP','ANET','NVO','QBTS','SOFI'];
export const ALL_SYMBOLS = [...TIER1_SYMBOLS, ...TIER2_SYMBOLS];  // 21개
export const SYMBOL_TIER: Record<string, 1|2> = { ...T1 map, ...T2 map };
export const SYMBOL_NAMES: Record<string, BiLang> = { /* 21개 회사명 */ };
export const SYMBOLS = ALL_SYMBOLS;  // 하위 호환
export const API_BASE = '';  // Empty string — all /api/* calls are relative, proxied by Next.js to BACKEND_URL

// All metadata constants now use BiLang for label/desc/action fields (2026-05-31):
export const SIGNAL_META = { sniper, vcp, pullback, strong_trend, overbought, downtrend }; // label: string, action: BiLang, desc: BiLang
export const STAGE2_META = { price_above_emas, ema200_rising, ... };                       // label: string, desc: BiLang
export const REGIME_META = { RISK_ON, CONSTRUCTIVE, MIXED, DEFENSIVE, RISK_OFF, UNKNOWN }; // label: BiLang, desc: BiLang
export const DD_META = { OK, WARNING, DANGER };                                             // label: BiLang, desc: BiLang
export const SENTIMENT_META = { very_fearful, fearful, neutral, optimistic, euphoric };     // label: BiLang
export const TREND_META = { heating, stable, cooling };                                     // label: BiLang
export const VOLUME_META = { low, normal, elevated, surging };                              // label: BiLang
export const SETUP_QUALITY_META = { 'A+': {color:'bull'}, 'A': {color:'teal'}, ... };
export const EARNINGS_RISK_META = { high: {color:'bear',dot:'●'}, ... };

// 21 macro symbol BiLang display names — MacroBoard uses this, not the backend name field:
export const MACRO_SYMBOL_NAMES: Record<string, BiLang> = {
  'CL=F': { en: 'WTI Crude Oil', ko: 'WTI 원유 (Crude)' },
  'GLD':  { en: 'Gold ETF (GLD)', ko: '금 ETF (GLD)' }, /* ... all 21 symbols */ };

// Conviction score → BiLang label (matches conviction_calculator.py score thresholds):
export const CONVICTION_LABEL_META: { min: number; label: BiLang }[] = [
  { min: 80, label: { en: 'Very High', ko: '매우 강한 확신' } },
  { min: 65, label: { en: 'High',      ko: '강한 확신 구간' } },
  { min: 50, label: { en: 'Moderate',  ko: '중립적 확신'   } },
  { min: 35, label: { en: 'Low',       ko: '약한 확신'     } },
  { min: 0,  label: { en: 'Very Low',  ko: '낮은 확신'     } },
];

// Bilingual AI data interfaces (v2.0 + v1.x compat):
// MarketSentiment: key_reason_en?, key_reason_ko?, key_reason? (v1.x)
// SymbolSentiment: key_reason_en?, key_reason_ko?, key_reason? (v1.x)
// TopNews: headline_en?, headline_ko?, summary_en?, summary_ko?, headline?, summary? (v1.x)
// MarketBrief: summary_en/ko?, key_themes_en/ko?, watch_points_en/ko?, summary/key_themes/watch_points? (v1.x)
// SymbolBrief: brief_en/ko?, key_risk_en/ko?, key_opportunity_en/ko?, brief/key_risk/key_opportunity? (v1.x)
// UpcomingEarning: ai_summary_en/ko?, action_note_en/ko?, ai_summary?, action_note? (v1.x)
// RecentResult: ai_reaction_en?, ai_reaction_ko?, ai_reaction? (v1.x)
// MacroOverallInsight: summary_en/ko?, bullets_en/ko[]?, summary?, bullets[]? (v1.x)
// MacroGroupInsight: text_en?, text_ko?, text? (v1.x)
```

### 5-4. i18n System (`app/i18n.ts`) — Added 2026-05-31

```typescript
export type Locale = 'en' | 'ko'
export interface BiLang { en: string; ko: string }
export const t = (obj: BiLang | undefined | null, locale: Locale): string => obj ? obj[locale] : ''
export const tField = (enVal, koVal, fallback, locale): string  // v2.0/v1.x AI data fallback
```

Usage pattern in all components:
- Static UI labels: `t(S.cardTitle, locale)` where `S` is a `const S: Record<string, BiLang>` at top of component
- AI data (may be v1.x or v2.0): `tField(data.key_reason_en, data.key_reason_ko, data.key_reason, locale)`
- Metadata constants: `t(REGIME_META[regime].label, locale)`, `t(DD_META[level].desc, locale)`, etc.
- Glossary: `t(G.risk_regime.term, locale)`, `t(G.risk_regime.body, locale)`

### 5-5. UI System (`app/globals.css`) — Plaid DS Redesign

- **Design system**: Plaid DS-based (Inter + JetBrains Mono fonts)
- **Dark/light toggle**: `[data-theme="dark"]` CSS selector, persisted to localStorage `sb_theme`
- **CSS variables**: `--bg`, `--fg`, `--border`, `--bull`, `--bear`, `--warn`, `--info`, `--teal`, `--purple`, `--em-500`, etc.
- **App layout**: CSS Grid `var(--rail)=64px / var(--topbar)=56px / var(--strip)=52px`
- **Component classes**: `.rail`, `.topbar`, `.strip`, `.board-wrap`, `.board`, `.card`, `.badge`, `.sig`, `.act-bar`, `.tbl`, `.rsi-gauge`, `.info-pop*`, `.guide-panel*`, `.guide-btn`
- **Zustand store** (`hooks/useStore.ts`): `board: Board`, `theme: Theme`, `locale: Locale`, `cmdOpen`, `symbol`, `timeframe`, `rrAccount`, `rrRiskPct` — persisted via persist middleware

### 5-6. Charts (`components/charts/`)

- **lightweight-charts v4** based
- `IntradayChart`: candles + volume + EMA21 (yellow) / EMA50 (indigo) + signal markers (▲▼)
- `DailyChart`: candles + volume + EMA8 (emerald) / 21 (yellow) / 50 (indigo) / 200 (rose) + GC channel (purple dashed) + Entry Pivot lines

### 5-7. DeepDiveBoard Layout (5-Row)

`gridTemplateColumns: '3fr 2fr'` + `alignItems: 'start'` — cards auto-adjust to content height.

**Row 1 (span 2): Symbol selector + price bar**
SYMBOLS buttons | current price + RSI + EMA21 + sparkline(60 candles) + PRE/POST price·change(usePrePost, 60-sec polling) | right: Stage2 ScorePill · ConvictionBadge · monthly badge · market structure badge · active signal badges (max 2)

**Row 2: Daily Chart (3fr) + Stage2 Analysis (2fr)**
- Left: `DailyChart` embedded (EMA8/21/50/200 + GC + Entry/Stop). min-height:440px.
- Right: 7-item 2-column checklist + monthly EMA10 banner + KPI 2×2 (RS Score · 52w deviation · recent correction · EMA200 slope)

**Row 3: Institutional Activity (3fr) + R:R Entry Plan (2fr)**
- Left: 60-day up/down heatmap (3 rows × 20 columns) + Up/Down volume ratio + volume trend + concentrated day detection + institutional score (0~100) + 10-day accumulation/distribution grid. Calculated from `dailyData.candles` as pure frontend functions.
- Right: Entry/Stop/Target 3-col + red-1:green-3 visual bar + position size (Max Loss/ATR) + pattern badges

**Row 4 (3×1fr, `alignItems: 'stretch'`)**
| Card | Data | Content |
|------|------|---------|
| Social Sentiment | `useSentiment` (symbol filter) | composite_score + ScoreBar(−2~+2) + prior-day delta + tField(key_reason_en/ko) + TopNews + sentiment trend chart toggle (7/30d) |
| AI Brief | `useBrief` (symbol filter) | Gradient card + Setup Quality badge + Action Bias + tField(brief_en/ko) + tField(opportunity/risk_en/ko) |
| Earnings | `useEarnings` (symbol filter) | Imminent: date·D-Day·EPS·Beat rate·ai_summary; else: recent_result (EPS actual/estimate/surprise/ai_reaction) |

**Row 5: Risk Regime (3fr) + Market-wide Sentiment (2fr)**
- Left: RadialGauge(80px) + regime description text + 5-factor bars (incl. raw values) — 2-column internal layout
- Right: market composite_score (large number) + ScoreBar + tField(key_reason_en/ko/key_reason) + TopNews

---

### 5-8. OverviewBoard Card Layout (4-column grid)

Top-right `? Guide` button → BoardGuidePanel slide-over (3 sections). 7 key cards have `info={{term: t(G.*.term, locale), body: t(G.*.body, locale)}}` → ⓘ popovers.

| Card | Span | Data Source | Content |
|------|------|-------------|---------|
| AI Market Snapshot | 2 | `useBrief` | tone badge · summary · key_themes · watch_points + symbol_briefs (2-col grid, Action Bias signal strength meter); falls back to regime text if briefData=null. ⏱ freshness badge. |
| Earnings Calendar | 1 | `useEarnings` | Earnings within 30 days + risk_level badge + relevance_tier (imminent/approaching/watching). ⏱ freshness badge. |
| Risk Regime | 1 | `useRegime` | RadialGauge + 5-factor bar + raw values |
| Distribution Days | 1 | `useDistributionDays` | SPY·QQQ DD count + dot visualization |
| Market Breadth | 1 | `useMacro` | SPY·RSP·MAGS·IWM 5D return bar + narrow rally warning |
| Volatility · VIX | 1 | `useMacro` | ^VIX + ^VIX9D levels + rsi-gauge bar + backwardation detection |
| Credit Stress | 1 | `useMacro` | HYG·JNK·LQD·IEF price·5D change |
| Entry Radar | 1 | `useWatchlist` | 6 symbols distance to Entry% ascending. ≤5% = em-soft highlight. "Breakout" badge if already above. |
| Conviction Leaderboard | 1 | `useWatchlist` | 6 symbols conviction_score descending bar chart + ConvictionBadge. |
| Sector Momentum | 1 | `useMacro` | SMH·XLE·XLY·XHB·ITA 5D return ranking bar + EMA21 above/below |
| Watchlist Top 3 | 1 | `useWatchlist` | Top 3 symbols by Stage 2 score preview |

### 5-9. WatchlistBoard Card Layout (3-column grid)

| Card | Span | Content |
|------|------|---------|
| Stage 2 Sorted Table | 3 | 6 symbols × 10 columns (Symbol · Price · Stage2 · RS · 52W · Entry · Stop · Target · Checks · Analyze button) |
| RS Score Ranking Bar | 1 | 6-symbol RS Score horizontal bar (≥70 green / 50~70 teal / <50 red) |
| Stage 2 Check Heatmap | 1 | 6 symbols × 7 conditions matrix (met = green cell) |
| Risk / Reward | 1 | Entry-centered left (risk, red) · right (reward, green) symmetric bar + 1:N ratio |

---

## 6. Data Flow

```
yfinance (external API, 15-min delayed, free)
    ↓ core/data_adapter.py  [SINGLE SOURCE OF TRUTH — full centralization]
        ├─ normalize_yf_dataframe (MultiIndex yf1.3+ handling + adj_close preserve)
        ├─ get_ohlcv_intraday (delegated by data_service)
        ├─ get_multi_daily (delegated by data_service + direct import in daily endpoints)
        └─ get_daily (for tests/adapter consumers)
    ↓ data_service (thin delegation layer for intraday only)
    ↓ signal_engine (Phase 2: Stage2 long-horizon metrics detect adj_close → use adjusted for 52w/RS/ema200_slope/pullback/pivot/entry on splits; raw/GC/short-term unchanged for compat)
    ↓ regime_engine / distribution_day (mostly raw recent windows)
FastAPI (port 8000 internal / 5001 external Docker)  [daily/watchlist/regime/distribution/macro use hardened adapter path + AI endpoints attach meta]
    ↓ JSON (Pydantic + FreshnessMeta for /sentiment /brief /earnings)
TanStack Query hooks (React component tree)
    ↓ props / Zustand state (locale: Locale for language selection)
lightweight-charts + Tailwind card UI  [Phase 4: minimal ⏱ freshness badges via age_minutes meta]

─── AI Pipeline + Cross-Repo Linkage (market-sentiment-data) ───────────────────────────────────────
Mac Mini cron (06:00/22:00 UTC)
    ↓ collect/collect_sentiment.py → GitHub: market-sentiment-data/sentiment/latest.json (schema v2.0: bilingual _en/_ko fields)
Mac Mini cron (06:30/22:30 UTC)
    ↓ collect/collect_brief.py
        ├─ GET /api/regime, /api/daily, /api/watchlist  (Sniperboard API)
        ├─ read sentiment/latest.json  (social sentiment)
        └─ Hermes/Grok → bilingual JSON (schema v2.0)
    ↓ GitHub push: market-sentiment-data/brief/latest.json
Mac Mini cron (06:30 UTC, once/day)
    ↓ collect_earnings.py (hardened)
        ├─ yfinance .calendar + .earnings_history
        └─ Hermes/Grok → JSON
    ↓ GitHub push: market-sentiment-data/earnings/latest.json

GitHub raw CDN
    ↓ brief_service.py / earnings_service.py (30~60-min in-memory cache; meta age_minutes computed)
FastAPI /api/brief, /api/earnings  [meta: {fetched_at, age_minutes, source}]
    ↓ TanStack Query useBrief / useEarnings
OverviewBoard (AI Insight card + Earnings Calendar) [freshness badges]
DailyBoard (⚡ EARNINGS IN Nd banner)
SentimentBoard (per-symbol Setup Quality A+~D badge)
```

---

## 7. Environment and Running

### Docker Compose (recommended)
```bash
cp .env.example .env          # first time only
docker compose up --build -d
# Backend: http://localhost:5001  (API docs: /docs)
# Frontend: http://localhost:4000
```

### Local Development
```bash
# Backend (port 8000)
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (port 3000) — proxy rewrites /api/* to BACKEND_URL
cd frontend && npm install
BACKEND_URL=http://localhost:8000 npm run dev
```

### Full Environment Variable Reference

#### Frontend — API Proxy (Next.js rewrites in `next.config.ts`)
The frontend uses **relative URLs** (`/api/*`). Next.js proxies them to `BACKEND_URL` at the server level — no IP is ever baked into the client bundle.

| Variable | Where set | Default | Description |
|----------|-----------|---------|-------------|
| `BACKEND_URL` | `docker-compose.yml` build arg + environment | `http://localhost:5001` | Backend URL used by Next.js rewrites. **Must be set at build time** (Next.js 16 bakes `rewrites()` at build) AND at runtime. |

Docker Compose passes `BACKEND_URL=http://backend:8000` as both a build arg (for `rewrites()` evaluation) and a runtime env var. For local dev without Docker, set `BACKEND_URL=http://localhost:8000` in shell before running `npm run dev`.

#### `docker-compose.yml` `environment` block — Backend runtime vars
| Variable | Required | If Unset | Description |
|----------|----------|----------|-------------|
| `SENTIMENT_DATA_URL` | Optional | Sentiment board disabled | Social sentiment JSON GitHub raw URL — points to `sentiment/latest.json` |
| `SENTIMENT_DATA_HISTORY_BASE` | Optional | History queries unavailable | Sentiment history base URL (without filename) — points to `sentiment/history` |
| `BRIEF_DATA_URL` | Optional | AI Insight falls back to Regime text | AI Brief JSON GitHub raw URL |
| `EARNINGS_DATA_URL` | Optional | Earnings Calendar card hidden | Earnings Intelligence JSON GitHub raw URL |
| `MACRO_INSIGHT_URL` | Optional | Macro Insight card has no AI text | Macro Insight JSON GitHub raw URL (macro/latest.json) |
| `SENTIMENT_DATA_TOKEN` | Optional | Not needed for public repos | GitHub PAT — set only when data repo is private |

#### Cache TTL (backend in-memory)
| Service | TTL | Constant Location |
|---------|-----|-------------------|
| Brief | 30 min (1800s) | `brief_service.py: CACHE_TTL` |
| Earnings | 60 min (3600s) | `earnings_service.py: CACHE_TTL` |
| Sentiment | 30 min (1800s) | `sentiment_service.py: CACHE_TTL` |

---

## 8. Fixed Symbol Lists

### Watchlist (`endpoints.py: WATCHLIST_SYMS` = TIER1 + TIER2, 21 total)

**TIER 1** (빅테크/대형주, 개별 심층 분석, 백테스트 포함):
`["TSM", "NVDA", "META", "TSLA", "PLTR", "MU", "CRWD", "AMZN", "MSFT", "AAPL", "GOOGL"]`

**TIER 2** (모멘텀/테마주, 배치 분석, 백테스트 제외):
`["RKLB", "CEG", "VST", "ALAB", "OKLO", "APP", "ANET", "NVO", "QBTS", "SOFI"]`

Note: Brief/Earnings 데이터는 TIER1 11종목 커버 (collect_brief.py, collect_earnings.py 업데이트 완료). 백테스트 기본값은 TIER1_SYMS. TIER2는 sentiment만 커버.

### Macro Symbols (`endpoints.py: MACRO_SYMBOLS`) — 21 total
| Category | Symbols |
|----------|---------|
| Dollar · Rates · Bonds · Commodities | DX-Y.NYB, ^TNX, TLT, CL=F, GLD |
| Major Indices | SPY, QQQ |
| Volatility | ^VIX, ^VVIX, ^VIX9D |
| Credit Stress | HYG, JNK, LQD, IEF |
| Breadth | RSP, MAGS, IWM |
| Sector ETFs | SMH, XLE, XLY, XHB, ITA |

### Regime Calculation Symbols (`endpoints.py: /regime`)
`['SPY', 'RSP', 'HYG', 'IEF', '^VIX']`

---

## 9. Known Constraints and Caveats

| Item | Details |
|------|---------|
| Data delay | yfinance free API → 15-minute delayed data |
| Intraday range | yfinance limit: only last 5 days available |
| Daily load time | First request ~30 seconds (2-year download + indicator calculation) |
| CORS | Dev mode `allow_origins=["*"]` — change for production |
| API proxy | Frontend uses relative `/api/*` — Next.js rewrites to `BACKEND_URL`. Next.js 16 bakes `rewrites()` at build time → `BACKEND_URL` must be set as a build arg (docker-compose handles this). |
| Macro data | Not refreshed after market close until next trading day |
| yfinance MultiIndex / accuracy | **data_adapter.py is the SINGLE SOURCE OF TRUTH for ALL yf data access**: full delegation complete. Phase 2: adj_close preserved in daily frames + used selectively in Stage2 long-horizon metrics (split symbols accurate 52w/RS etc while short-term/GC/raw paths unchanged). |

---

## 10. Mobile Responsive Implementation

### Breakpoint
`max-width: 767px` — covers iPhone SE through Pro Max, Galaxy S/A series.

### Core Layout Switch (`globals.css`)
| Desktop | Mobile |
|---------|--------|
| `.app` 2-col grid (rail+main), min-height:100dvh | `.app` 1-col, height:100dvh |
| `.main` flex-column, overflow:hidden | `.main` display:block, overflow-y:auto |
| `.board` grid (per-board gridTemplateColumns) | `.board` flex-column (mob-order controls sequence) |
| Rail + TopBar(full) + MarketStrip | hide-mobile → hidden, Topbar 48px slim, BottomTabs |

### Mobile-only CSS Utility Classes
| Class | Role |
|-------|------|
| `.mob-order-1`~`.mob-order-8` | CSS order property — control card display order |
| `.mob-wrap` | Mobile: flex box / Desktop: `display:contents` (transparent in grid) |
| `.mob-macro-groups` | Mobile: flex-column / Desktop: `display:contents` |
| `.mob-inner-stack` | DeepDive ROW4 3-col → forced 1-col flex-column |
| `.mob-chart-limit` | Chart container fixed height:300px |
| `.mob-symbol-bar` | DeepDive symbol selector overflow-x:auto (horizontal scroll) |
| `details.mob-collapse` | Collapsible — shows summary on mobile, `display:contents` on desktop |
| `.hide-mobile` / `.hide-on-mobile` | `display:none !important` |

### Board Mobile Card Order
- **Overview**: Regime(1) → Breadth·VIX(2) → Sector(3) → Entry Radar(4) → Conviction(5) → AI Insight(6, collapsible) → Earnings·DD·Credit(7) → Watchlist(8)
- **DeepDive**: Symbol bar(1) → Chart(2) → R:R(3) → Stage2(4) → Institutional(5) → Social·Brief·Earnings(6) → Regime·Sentiment(7)
- **Macro**: Banner(1) → 6 groups(2) → Sector(3)
- **Sentiment**: Market(1) → Symbol(2) → TopNews(3, collapsible) → Guide(4)

### Notes When Modifying
- Wrapper divs touching the desktop grid structure must have `mob-wrap` class + desktop `display:contents`
- `details.mob-collapse` renders as `display:contents` on desktop — no effect on existing layout
- `DailyChart.tsx`: reads height as `clientHeight || 480` — the `.mob-chart-limit` container must set `height` (not just `max-height`)

---

## 11. Code Modification Reference Points

| What to Modify | File Location |
|----------------|---------------|
| Signal conditions | `backend/core/signal_engine.py: get_vcp(), get_sniper(), ...` |
| Stage2 checklist thresholds | `backend/core/signal_engine.py: calculate_stage2_analysis()` |
| Regime thresholds | `backend/core/regime_engine.py: TREND_LOW/HIGH, ...` constants |
| DD lookback period | `backend/core/distribution_day.py: DD_LOOKBACK, DD_THRESHOLD_PCT` |
| yfinance data access | `backend/core/data_adapter.py` (SINGLE SOURCE OF TRUTH) |
| Conviction Composite Score | `backend/core/conviction_calculator.py` (TDD, 12 tests). Labels: English enum strings. |
| Conviction display labels (BiLang) | `frontend/app/types.ts: CONVICTION_LABEL_META` — score thresholds → BiLang (Very High/High/Moderate/Low/Very Low ↔ 매우 강한 확신 etc.) |
| Macro symbol display names | `frontend/app/types.ts: MACRO_SYMBOL_NAMES` — 21 BiLang entries. `backend/api/endpoints.py: MACRO_SYMBOLS` uses English fallback names. |
| Add field to Watchlist/Daily | `backend/api/schemas.py` (WatchlistItemSchema, DailyResponse) + `endpoints.py` |
| Add watchlist symbol | `backend/api/endpoints.py: WATCHLIST_SYMS` + `frontend/app/types.ts: SYMBOLS` |
| Add macro symbol | `backend/api/endpoints.py: MACRO_SYMBOLS` |
| Change backend URL | `docker-compose.yml: BACKEND_URL` env (frontend) or `BACKEND_URL` shell var for local dev |
| Signal metadata (color/desc) | `frontend/app/types.ts: SIGNAL_META` (BiLang action/desc) |
| UI language strings (static) | Per-component `const S: Record<string, BiLang>` at top of each board file |
| UI language toggle | `frontend/components/shell/Topbar.tsx` (EN/KO buttons) + `frontend/hooks/useStore.ts` (locale state) |
| AI data bilingual rendering | Use `tField(data.field_en, data.field_ko, data.field, locale)` |
| Glossary terms | `frontend/app/glossary.ts` (GLOSSARY array + G map). 28 entries, each with BiLang term/body. |
| Board guide content | Per-board `*_GUIDE` function (returns `GuideSection[]` based on locale). 3 sections: what this board shows / how to read key indicators / how to use it now. |
| Guide button location | `frontend/components/shell/MarketStrip.tsx` far right (margin-left:auto). Boards listen for 'guide:open' event. |
| InfoPopover positioning | `frontend/components/ui/InfoPopover.tsx` — uses `getBoundingClientRect()` for position:fixed rendering, auto right-edge correction |
| Polling interval | `frontend/hooks/useIntraday.ts` (currently 30 seconds) |
| Brief/Earnings URL | `docker-compose.yml: BRIEF_DATA_URL / EARNINGS_DATA_URL` |
| Brief cache TTL | `backend/services/brief_service.py: CACHE_TTL` (currently 1800s) |
| Earnings cache TTL | `backend/services/earnings_service.py: CACHE_TTL` (currently 3600s) |
| Brief watchlist | `collect/collect_brief.py: WATCHLIST` + `collect/collect_earnings.py: WATCHLIST` |
| Macro Insight traffic light rules | `backend/core/macro_rules.py` (compute_*_signal functions) |
| Macro Insight AI cache TTL/URL | `backend/services/macro_insight_service.py: CACHE_TTL / MACRO_INSIGHT_URL` |
| market-sentiment-data schema | `~/dev/market-sentiment-data/schema.json` (v2.0: bilingual _en/_ko fields) |
| market-sentiment-data pipeline | `~/dev/market-sentiment-data/collect_sentiment.py` + `collect/collect_brief.py` |
