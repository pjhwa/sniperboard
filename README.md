> 한국어 문서: [README.ko.md](./README.ko.md)

# SniperBoard

**Precision Signal Dashboard for US Equities**
*Swing trading dashboard based on Livermore · O'Neil · Minervini methodologies*

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

---

## Overview

SniperBoard is a web-based trading signal dashboard for US equity swing trading.

- **Backend**: FastAPI + yfinance + pandas — real-time calculation of technical indicators and trade signals
- **Frontend**: Next.js 16 + lightweight-charts — interactive charts and 7 specialized boards
- **AI Pipeline**: Grok/Hermes models combine technical indicators + social sentiment to generate market narratives (external cron job)
- **Signal Philosophy**: VCP · Sniper · Pullback (O'Neil/Livermore) + Stage 2 (Minervini) + Conviction composite score + Risk Regime + Distribution Days
- **Language Support**: EN/KO toggle in the Topbar — all UI labels, glossary (28 terms), signal descriptions, macro symbol names, and AI-generated text switch instantly. AI data uses bilingual `_en`/`_ko` fields (schema v2.0); v1.x data falls back gracefully.

Plaid DS-based dark/light theme. ⌘K command palette for fast symbol/board switching. ⓘ popover on each indicator/card for context (auto-corrects for viewport edges). `? Guide` button on MarketStrip opens a board-level slide-over guide. Type `?` in the ⌘K input to enter glossary search mode (28 terms).

---

## Why SniperBoard — Competitive Advantages

Most signal dashboards show signals but never prove they work. SniperBoard is built on a different principle: **show everything, prove everything**.

| Advantage | SniperBoard | Typical Competitors |
|-----------|-------------|---------------------|
| **Signal accountability** | Every Stage2 signal auto-logged. Every outcome tracked (WIN/LOSS/TIMEOUT). No cherry-picking. | Curated highlights only |
| **Backtest → Live validation loop** | Historical backtest (+0.460R expectancy, 99.8% MC confidence) compared against real-time live performance on the **Signal Tracker** board | Backtest results (if any) never updated with live outcomes |
| **Model Health indicator** | Real-time ON_TRACK / WATCH / UNDERPERFORMING status based on live trades vs. backtest baseline | Not provided |
| **Regime-aware signal quality** | Live performance broken down by market regime (RISK_ON / MIXED / RISK_OFF) — shows *when* signals work | Not provided |
| **Statistical confidence** | Monte Carlo bootstrap (10,000 simulations) proves edge is real, not luck (prob. of positive expectancy: 99.8%) | Not provided |
| **Transparent methodology** | Every limitation disclosed: survivorship bias, slippage, IS/OOS split, no look-ahead — in the UI | Rarely disclosed |
| **Conviction composite score** | Stage2 (40%) + Social Sentiment (30%) + Risk Regime (30%) = single actionable score per symbol | Single-factor only |
| **Bilingual (EN/KO)** | Full UI, AI narratives, glossary (28 terms) all switch instantly | English-only |
| **AI market narratives** | Grok/Hermes generates bilingual daily briefs, earnings intelligence, and macro interpretation from actual signal + sentiment data | Generic AI summaries |
| **Automated journaling** | Signals auto-logged when watchlist refreshes — no manual entry | Manual input required |

### Signal Tracker — The Key Differentiator

The **Signal Tracker** board (`🎯` in the Rail) implements a perpetual hypothesis test:

```
Hypothesis: "Stage2 ≥ 5 signals produce +0.460R expectancy (RS≥70 + SPY filter)"

Test: Every signal auto-logged → outcome resolved → live stats vs. baseline
Result: Model Health = ON_TRACK / WATCH / UNDERPERFORMING
```

As trades accumulate (30+ = MEDIUM confidence, 80+ = HIGH confidence), the live equity curve is overlaid against the backtest baseline on the same chart. Regime breakdown shows which market conditions amplify or suppress signal edge.

No other retail-facing tool for this methodology space offers this level of real-time accountability.

---

## Quick Start

### Requirements

- Docker & Docker Compose v2

### Run

```bash
git clone <repo-url>
cd sniperboard

# 1. Create environment file (first time only)
cp .env.example .env

# 2. Build and start
docker compose up --build -d
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:4000 |
| API Docs | http://localhost:5001/docs |

> First load may take 30 seconds to 2 minutes while yfinance downloads data.

---

## Mobile Support

Fully responsive mobile UI for iOS Safari and Android Chrome.

### Access

From a smartphone on the same Wi-Fi network:

1. Find your Mac's local IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
2. Bind the dev server to the network:
   ```bash
   cd frontend && npx next dev -H 0.0.0.0 -p 3000
   ```
3. Open `http://<Mac-IP>:3000` on your phone's browser.

### Mobile vs Desktop Layout

Breakpoint: `max-width: 767px`

| Desktop | Mobile |
|---------|--------|
| Left Rail navigation | Bottom tab bar (4 tabs: Market / Analysis / Macro / Sentiment) |
| MarketStrip across top | Hidden |
| Full topbar (search · symbols · Regime) | Slim header (logo · board name · theme toggle) |
| Multi-column grid layout | Single-column vertical stack |

### Mobile-Optimized Boards (4)

| Overview | DeepDive | Macro | Sentiment |
|:---:|:---:|:---:|:---:|
| <img src="assets/images/mobile-overview.jpg" width="200"/> | <img src="assets/images/mobile-deepdive.jpg" width="200"/> | <img src="assets/images/mobile-macro.jpg" width="200"/> | <img src="assets/images/mobile-sentiment.jpg" width="200"/> |

**Overview** — Big→Detail order: Risk Regime → Market Breadth → VIX → Sector Momentum → Entry Radar → Conviction Leaderboard → AI Insight (collapsible) → detail cards

**DeepDive** — Symbol selector (horizontal scroll) → Daily chart (300px) → R:R Entry Plan → Stage 2 Checklist → Institutional Activity → AI Brief (collapsible) → Social & Earnings

**Macro** — Overall judgment banner → 6 group cards (1 column) → Sector Rotation → detailed interpretation (collapsible)

**Sentiment** — Market Sentiment → Symbol Sentiment → Top News (collapsible) → Data guide

### iPhone Home Bar

`viewport-fit=cover` + `env(safe-area-inset-bottom)` applied so the bottom tab bar doesn't overlap the home indicator.

---

## Environment Variables

### 1. `.env` — Frontend build variables

```bash
cp .env.example .env
```

The frontend uses **relative API URLs** (`/api/*`) proxied by Next.js — no IP is baked into the client bundle. This means the app works correctly even when accessed via VPN or when the server IP changes.

| Variable | Where set | Default | Description |
|----------|-----------|---------|-------------|
| `BACKEND_URL` | `docker-compose.yml` build arg + environment | `http://localhost:5001` | Backend URL used by Next.js API proxy rewrites. Must be passed as a **build arg** (Next.js 16 evaluates `rewrites()` at build time). |

> **Docker Compose**: `BACKEND_URL=http://backend:8000` is automatically injected as both a build arg and runtime env — no manual configuration needed.
> **Local dev (no Docker)**: Set `BACKEND_URL=http://localhost:8000` in your shell before running `npm run dev`.

### 2. `docker-compose.yml` — Backend env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTIMENT_DATA_URL` | Optional | Social sentiment JSON GitHub raw URL. Sentiment board disabled if not set. |
| `SENTIMENT_DATA_HISTORY_BASE` | Optional | Sentiment history file base URL (without filename). |
| `BRIEF_DATA_URL` | Optional | AI Daily Brief JSON GitHub raw URL. AI Snapshot falls back to Regime text if not set. |
| `EARNINGS_DATA_URL` | Optional | Earnings Intelligence JSON GitHub raw URL. Earnings card hidden if not set. |
| `SENTIMENT_DATA_TOKEN` | Optional | GitHub PAT. Only required when the data repo is private. |

> **If optional vars are not set**: runs without errors. Core signals (Intraday · Daily · Watchlist · Macro · Regime) work without any env vars.

---

## Boards — 7 Views

Click **Rail** icons on the left to switch boards (mobile: bottom tab bar). Use the search bar or **⌘K** to quickly jump to any symbol or board.

Each board has a **3-tier help system**:
- **ⓘ Popover**: next to card titles and indicator names. Click for an easy explanation in a popover. Auto-detects viewport edges to prevent overflow.
- **? Guide button**: pinned to the right end of MarketStrip. Opens a slide-over panel with 3 sections: "What this board shows / How to read key indicators / How to use it now."
- **⌘K Glossary search**: type `?` in the palette input to enter glossary mode. Search `? vix`, `? stage2`, etc. across 28 terms.

---

### Overview — Market at a Glance

![Overview](assets/images/screenshot-overview.png)

The main board showing the full market picture in one view. 11 cards.

| Card | Content |
|------|---------|
| **AI Market Snapshot** | Grok AI-generated market narrative (tone · key_themes · watch_points) + per-symbol AI analysis (Setup Quality A+~D · Action Bias · one-line summary). Falls back to Regime text when briefData is unavailable. ⏱ Freshness badge. |
| **Earnings Calendar** | Upcoming earnings within 30 days for watchlist symbols. Risk tier (high/med/low) + imminent/approaching/watching tier. ⏱ Freshness badge. |
| **Risk Regime** | Macro environment score 0~100 (5 factors: Trend · Breadth · Credit · Volatility · Momentum + raw values). RadialGauge visualization. |
| **Distribution Days** | SPY·QQQ institutional selling day count (O'Neil, 25 trading days). OK / WARNING / DANGER levels. |
| **Market Breadth** | SPY · RSP · MAGS · IWM 5-day return comparison. Auto-warns on narrow Mag7-led rallies. |
| **Volatility · VIX** | ^VIX + ^VIX9D levels + RSI gauge bar. Auto-detects VIX backwardation (short-term > long-term). |
| **Credit Stress** | HYG · JNK · LQD · IEF price and 5-day change rate. Leading credit risk indicator. |
| **Entry Radar** | Distance to Entry price (%) for 6 watchlist symbols, ascending order. ≤5% highlighted. "Breakout" badge if already above entry. |
| **Conviction Leaderboard** | Conviction Score horizontal bar chart for 6 watchlist symbols in descending order + ConvictionBadge color grades. |
| **Sector Momentum** | SMH · XLE · XLY · XHB · ITA 5-day return ranking + EMA21 above/below status. |
| **Watchlist Top 3** | Preview of top 3 symbols by Stage 2 score. |

---

### Deep Dive — Full Stock Analysis

![Deep Dive](assets/images/screenshot-deepdive.png)

All perspectives on one symbol in a single continuous flow. Switch the symbol directly at the top of the board.

**Row 1 — Situation Bar (full width)**

Symbol selector buttons | Current price · RSI · EMA21 + intraday sparkline | Stage2 score · Conviction badge · Monthly phase · Market structure · Active signal badges in one line. PRE/POST market price and change % in real time (outside regular hours).

**Row 2 — Technical Deep Dive (60% : 40%)**
- **Daily Chart**: 1-year daily candles + EMA8/21/50/200 + Gaussian Channel (purple) + Entry·Stop lines
- **Stage 2 Checklist**: 7 items in 2 columns + Monthly EMA10 banner + RS Score · 52w deviation · pullback depth · EMA200 slope — 4 KPIs

**Row 3 — Institutional Activity (60%) + R:R Entry Plan (40%)**
- **Institutional Activity**: 60-day up/down heatmap (3 rows × 20 columns) + up/down volume ratio + volume trend + concentrated day detection + institutional score (0~100) + 10-day accumulation/distribution grid
- **R:R Entry Plan**: Entry/Stop/Target 3-column + red-1:green-3 visual bar + position size · Max Loss · ATR calculation

**Row 4 — Sentiment · AI · Earnings (3 equal columns)**
- **Social Sentiment**: composite_score ScoreBar (−2~+2) + prior-day delta + key reason + top news + sentiment trend chart toggle (7d/30d)
- **AI Analysis Brief**: Setup Quality (A+~D) + Action Bias badge + analysis text + opportunity/risk blocks
- **Earnings**: Shows upcoming date · D-Day · EPS · Beat rate when imminent; otherwise shows recent EPS surprise and AI reaction

**Row 5 — Macro Context (60% : 40%)**
- **Risk Regime**: RadialGauge (0~100) + regime description + 5-factor bar (Trend/Breadth/Credit/Volatility/Momentum)
- **Market-wide Sentiment**: composite_score ScoreBar + key reason + top news

---

### Intraday — Live Signals (30-second auto-refresh)

![Intraday](assets/images/screenshot-intraday.png)

- 1m/5m/15m/1h candle chart (EMA21 yellow · EMA50 indigo overlay)
- 6 signal markers overlaid on the chart (▲ buy / ▼ warning)
- **Active Signals panel**: entry condition guide per active signal (price · RSI · EMA criteria). ⓘ popover next to each signal name for detailed conditions.
- **RSI(14) gauge bar**: overbought/oversold zones visualized
- **R:R Calculator**: ATR-based auto entry/stop/target + position size (configure account size and risk %)

---

### Daily — Stage 2 + Gaussian Channel

![Daily](assets/images/screenshot-daily.png)

- 252-candle (1-year) daily chart (EMA8·21·50·200 + Gaussian Channel + Entry/Stop lines)
- **Minervini Stage 2 Checklist** (7 items): EMA alignment / EMA200 rising / Near 52w high / Above 52w low / Shallow pullback / RS Score / Volume contracting. Scored 0~7.
- **Monthly Phase badge**: Daily data resampled to monthly candles, evaluated against 10-month EMA (Confirmed Uptrend · Weakening · Neutral · Downtrend)
- **Market Structure detection**: HH·HL·LH·LL patterns (UPTREND / DOWNTREND / DISTRIBUTION / ACCUMULATION)
- **RSI Divergence**: Auto-detects bullish/bearish divergence (comparing last 40-candle swing points)
- **Bear Flag pattern** detection
- **Gaussian Channel state**: Breakout · Retest · Below (causal kernel, no look-ahead bias)
- **Conviction badge**: Weighted composite of Stage2 + Sentiment + Regime (0~100)
- **R:R Panel**: Entry/Stop/Target + position size. Card ⓘ button provides a R:R concept popover.

---

### Watchlist — Stage 2 Sorted Table

![Watchlist](assets/images/screenshot-watchlist.png)

- TIER1 (TSM · NVDA · META · TSLA · PLTR · MU · CRWD · AMZN · MSFT · AAPL · GOOGL · SPCX) + TIER2 (RKLB · CEG · VST · ALAB · OKLO · APP · ANET · NVO · QBTS · SOFI) sorted descending by Stage 2 score
- Columns: Price · Stage 2 (out of 7) · RS Score · 52w high deviation · Entry · Stop · Target · Check indicators · Monthly phase · **Conviction** badge
- Row click → switches to that symbol and navigates to Daily board
- **RS Score ranking bar**: Symbol relative strength horizontal bar (≥70 green / 50-70 teal / <50 red)
- **Stage 2 check heatmap**: 7 symbols × 7 conditions matrix (met = green cell)
- **Risk / Reward**: Left (risk, red) · Right (reward, green) symmetric bar centered on Entry + 1:N ratio

---

### Macro — Sector Rotation + Global Indicators

![Macro](assets/images/screenshot-macro.png)

- **AI Overall Judgment banner**: RISK-ON / MIXED / RISK-OFF traffic light + AI interpretation text (Grok-generated, 30-min cache). Click banner to expand detailed interpretation.
- **Sector Rotation bar**: ITA · XLE · SMH · XLY · XHB 1-day returns ranked (relative strength at a glance)
- **6 Group cards** (each with 🟢🟡🔴 signal · ↗↘ direction + ⓘ popover):
  - **Volatility**: VIX · VIX9D · VVIX (fear gauge — <14 calm / 20 caution / >30 fear)
  - **Breadth**: SPY · RSP · MAGS · IWM (RSP weaker than SPY = large-cap concentration warning)
  - **Credit Stress**: HYG · JNK · LQD · IEF (HYG strong = Risk-On, weak = fear)
  - **Rates & Dollar**: DXY · TNX · TLT (strong dollar + rising rates = equity headwind)
  - **Commodities**: CL=F (crude oil) · GLD (gold) (crude = economic leading indicator, gold = safe-haven demand)
  - **USD/KRW (KRW=X)**: displayed in MarketStrip as `USD/KRW` with comma-thousands format (e.g. `1,380`). KRW=X yfinance ticker returns Korean Won per 1 USD.
  - **Sector ETFs**: SMH · XLE · XLY · XHB · ITA (track where money is flowing)
- 21 symbols: price · 1D change · market structure · ⏱ AI freshness badge

---

### Backtest — Historical Signal Validation

Simulates Stage2 signals from 2019 to present with strict anti-overfitting design.

| Design Principle | Implementation |
|-----------------|----------------|
| **No look-ahead bias** | T-1 signal → T-day entry (never same-day fill). Verified by TDD test. |
| **Survivorship bias disclosed** | Current watchlist only — disclosed in methodology banner |
| **In-sample / Out-of-sample split** | IS: ~2023 (training) / OOS: 2024~ (real validation). OOS > IS = no overfitting |
| **Monte Carlo** | 10,000 bootstrap resamples → probability of positive expectancy = 99.8% |
| **Slippage** | 0.05% included. Commission 0% (US broker standard). |

**Best configuration** (RS≥70 + SPY>EMA200 filter): 145 trades · Win rate 38.6% · Expectancy +0.460R · OOS +0.511R

**AMZN structural note**: 21% win rate across all parameter combinations — Stage2 pivot breakout is incompatible with AMZN's range-bound price structure. Clearly flagged in the per-symbol table.

---

### Signal Tracker — Live vs. Backtest Validation

The accountability board that makes SniperBoard unique among signal tools.

| Section | Content |
|---------|---------|
| **Model Health banner** | ON_TRACK / WATCH / UNDERPERFORMING vs. +0.460R backtest baseline. Confidence: LOW (<30 trades) → MEDIUM → HIGH (80+). |
| **KPI comparison** | Live win rate / expectancy / profit factor vs. backtest values. Delta highlighted. |
| **Cumulative R curve** | Live equity curve overlaid on backtest baseline (grey dashed). Same chart, same R scale. |
| **Current Pipeline** | PENDING signals (waiting for entry price) and ACTIVE trades (currently held). Entry/Stop/Target + R:R displayed. |
| **Regime breakdown** | Expectancy grouped by RISK_ON / MIXED / RISK_OFF — shows when the model works. |
| **Signal history table** | All logged signals with outcomes. Filter by WIN / LOSS / TIMEOUT / CANCELLED. |

Auto-logging: every time `/watchlist` refreshes, Stage2 ≥ 5 signals are automatically recorded. No manual input.

---

### Sentiment — Social Sentiment Analysis

![Sentiment](assets/images/screenshot-sentiment.png)

- **Market-wide Sentiment gauge**: 5 levels from extreme fear to euphoric + composite_score (−2 ~ +2). ⓘ popover explains the composite score calculation.
- **Per-symbol sentiment cards**: sentiment score · ScoreBar visualization · trend · mention volume · bot suspicion · key reason · Setup Quality (A+~D) badge
- **Sentiment trend chart**: expands on card click with 7d/30d toggle — stock price line (left axis) + composite_score overlay (right axis, −2~+2)
- **Top News**: market-wide and per-symbol top news headline · summary · source
- **Social Sentiment explainer card** (always visible at bottom): 5 sections — data collection method · composite score range visualization · contrarian strategy principle · correct usage · caveats
- Social data is collected twice daily (06:00/22:00 UTC) by an external cron job on Mac Mini

---

## Core Features

### Signal System

#### 6 Intraday Signals

| Signal | Key Conditions | Action |
|--------|---------------|--------|
| **Sniper** | EMA21 within 0.4% + RSI 38~58 + volume 1.4x prior candle | Entry |
| **VCP** | 30-candle high breakout + 2x volume + ATR contracting 8 candles | Breakout entry |
| **Pullback** | 4.5~9% correction from 15-candle high + EMA support + MACD 3-candle rebound | Pullback entry |
| **StrongTrend** | Price>EMA21>EMA50 + EMA slope +0.15% + RSI 52~78 | Hold |
| **Overbought** | RSI≥76 + EMA21 deviation +3.2% + 4 of 5 candles bullish | Partial exit |
| **Downtrend** | Price<EMA21 + negative slope + volume surge + 8-candle low | Avoid |

#### Stage 2 Checklist (Minervini, Daily)

| Item | Threshold |
|------|-----------|
| Price > EMA21 > EMA50 > EMA200 | EMA alignment |
| EMA200 Rising | 20-day slope positive |
| Within 25% of 52w High | Near 52-week high |
| 30%+ Above 52w Low | Sufficient rebound from low |
| Recent Correction < 15% | Shallow pullback from 20-day high |
| RS Score ≥ 50 | 63-day return outperforming SPY (adjusted prices) |
| Volume Contracting | 5-day avg < 20-day avg |

**Scoring**: 6~7 = consider entry / 4~5 = watch / ≤3 = avoid

#### Conviction Composite Score

Weighted average of Stage 2 score (40%) + Social Sentiment (30%) + Risk Regime (30%), scaled 0~100. Displayed via ConvictionBadge across all boards:
- **65+ (bull)**: Strong entry signal
- **50~64 (teal)**: Consider entry
- **35~49 (warn)**: Watch
- **< 35 (bear)**: Avoid

#### Risk Regime

5 factors (Trend · Breadth · Credit · Volatility · Momentum), each scored 0~20, summed 0~100:

| Grade | Score | Meaning |
|-------|-------|---------|
| RISK_ON | 80~100 | Trend-following strategies effective |
| CONSTRUCTIVE | 60~79 | Selective entry possible |
| MIXED | 40~59 | Reduce position size |
| DEFENSIVE | 20~39 | Increase cash allocation |
| RISK_OFF | 0~19 | Avoid new buys |

#### R:R Calculator

```
Entry   = 20-day high × 1.005          (pivot breakout basis)
Stop    = Entry − 2 × ATR(14)
Target  = Entry + 3 × (Entry − Stop)   → R:R = 1:3
Qty     = (Account × Risk%) ÷ (Entry − Stop)
```

### AI Pipeline

Mac Mini cron generates external data twice daily, pushes to GitHub, and the backend serves it with a 30–60 minute cache.

```
06:00/22:00 UTC: collect_sentiment.py → GitHub latest.json (social sentiment)
06:30/22:30 UTC: collect_brief.py
    ├─ SniperBoard API (/regime, /daily, /watchlist)
    ├─ Social sentiment data
    └─ Grok/Hermes → market narrative + per-symbol Brief → GitHub brief/latest.json
06:30 UTC (once/day): collect_earnings.py
    ├─ yfinance earnings data
    └─ Grok → AI summary → GitHub earnings/latest.json
```

Each response includes `meta: {fetched_at, age_minutes, source}` — displayed as ⏱ freshness badges in the UI.

---

## API Endpoints

Base URL: `http://localhost:4000/api` (via Next.js proxy) or `http://localhost:5001/api` (direct to backend)

| Path | Description |
|------|-------------|
| `GET /ohlcv?symbol=&tf=` | Intraday OHLCV + 6 signal boolean arrays + EMA21/50/RSI/ATR |
| `GET /latest-signal?symbol=&tf=` | Latest candle signal summary |
| `GET /daily?symbol=` | 252-candle daily data + full Stage2 analysis (adjusted-price based for long-term indicators) |
| `GET /macro` | 21 macro symbol prices · change rates · indicators |
| `GET /watchlist` | Watchlist Stage2 scores descending + Conviction Score |
| `GET /regime` | Risk Regime 5-factor composite score |
| `GET /distribution-days` | SPY·QQQ Distribution Day count |
| `GET /prepost?symbol=` | Pre/after-market price · change % · market_state |
| `GET /sentiment` | Social sentiment data + `meta` |
| `GET /sentiment/history?symbol=&days=` | N-day sentiment points array (days: 1~30, 5-min TTL) |
| `GET /brief` | AI Daily Brief + `meta` |
| `GET /earnings` | Earnings Intelligence + `meta` |
| `GET /backtest/result` | Cached backtest results (config + aggregate + IS/OOS + Monte Carlo + per-symbol) |
| `POST /backtest/run` | Run backtest (sync, ~1min). Params: `rs_threshold`, `use_spy_filter`, `threshold` |
| `POST /backtest/sweep` | Run 8 parameter combinations and compare results |
| `GET /signal-log` | Live signal log (auto-logged from watchlist). Params: `symbol`, `limit` |
| `GET /signal-log/stats` | Live performance stats vs. backtest baseline. Includes model health + regime breakdown |
| `POST /signal-log/refresh` | Resolve PENDING/ACTIVE signals against latest prices (background task) |

Full response schemas: see `backend/api/schemas.py`

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.2 | React framework (App Router) |
| React | 19.2 | UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| lightweight-charts | 4.2 | Candlestick charts |
| TanStack Query | 5.x | Server state management · caching · polling |
| Zustand | 5.x | Client global state (localStorage persistence) |

### Backend

| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API server |
| pandas / numpy | Signal · indicator · pattern calculation |
| yfinance | OHLCV data (15-min delayed, free) |
| uvicorn | ASGI server |
| pytest | Testing |

---

## Local Development

```bash
# Backend (port 8000)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (port 3000)
cd frontend
npm install
BACKEND_URL=http://localhost:8000 npm run dev
```

---

## Notes

- yfinance is a free API intended for development and testing (15-minute delayed data). For production, a paid data source is recommended.
- For split-adjusted symbols (e.g., NVDA), long-term indicators (52w high/low, RS Score, EMA200 slope) are calculated using adjusted prices (adj_close) for accuracy. Short-term signals and the Gaussian Channel use raw prices as-is.
- Trading signals and analysis are for **reference only**. Users are solely responsible for any investment losses.
- Risk Regime and Distribution Days are **lagging indicators** — they diagnose market conditions, not generate buy/sell signals.
- Intraday data is not updated outside US market hours (ET 09:30~16:00).
- CORS currently allows all origins for development (`allow_origins=["*"]`).

---

## License

MIT © pjhwa
