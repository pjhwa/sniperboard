# SniperBoard MCP Server — Usage Guide for AI Clients

This document is written **for you, the LLM** (Claude, Grok, or any other
MCP-capable model) that has the `sniperboard` MCP server connected. Read it
once and you should be able to use all 40 tools correctly without further
guidance from the user. It explains: what SniperBoard is, what each tool
returns, the domain concepts you need to interpret the numbers, safe usage
rules for the mutating tools, and ready-made multi-tool workflows for common
requests a user might make.

---

## 1. What SniperBoard is

SniperBoard is a US stock trading **signal dashboard**, not a broker and not
a trading bot. It computes technical signals (Livermore/O'Neil/Minervini
style) over a fixed universe of 22 watchlist symbols plus market-wide
indices, and separately ingests AI-generated market commentary (social
sentiment, daily briefs, earnings intelligence, macro insight) from a cron
pipeline that runs 1–2x/day. Every tool in this MCP server is a **read or
write passthrough** to that dashboard's REST API — none of the tools place
trades, and none of them give investment advice by themselves. When you
answer a user with SniperBoard data, present it as **signal/data
interpretation**, not as a recommendation to buy or sell, unless the user's
own question is explicitly about interpreting the system's own entry/stop/
target levels.

**The watchlist universe** (22 symbols, fixed — you cannot query arbitrary
tickers on `get_watchlist`/`get_daily`/`get_ohlcv`/etc. work for *any* valid
US-listed symbol, but the *watchlist-wide* tools like `get_watchlist` and
`get_signal_log` only ever return these):

- TIER1 (12, individually analyzed + backtested): `TSM, NVDA, META, TSLA, PLTR, MU, CRWD, AMZN, MSFT, AAPL, GOOGL, SPCX`
- TIER2 (10, batch-analyzed): `RKLB, CEG, VST, ALAB, OKLO, APP, ANET, NVO, QBTS, SOFI`

For any *other* symbol (e.g. a user asks about `JPM`), use the per-symbol
tools directly — `get_daily`, `get_ohlcv`, `get_prepost`, `get_symbol_info`
all accept any valid symbol string, not just the watchlist.

**Prerequisite:** the SniperBoard backend must be running for any tool to
work. If every tool call fails with a connection error mentioning
`SNIPERBOARD_API_URL`, tell the user the backend isn't running — you cannot
fix that yourself.

---

## 2. Domain concepts you need to interpret the data

These terms appear across many tool responses. Understand them before
answering questions that use the numbers.

### Stage 2 (Minervini) checklist — `score` (0–7), `checks`

A daily-timeframe checklist of 7 boolean conditions defining a healthy
uptrend stage a stock can be bought in:

| Check | Meaning |
|---|---|
| `price_above_emas` | Price > EMA21 > EMA50 > EMA200 (bullish alignment) |
| `ema200_rising` | EMA200's 20-day slope is positive |
| `near_52w_high` | Within 25% of the 52-week high |
| `above_52w_low` | At least 30% above the 52-week low |
| `pullback_shallow` | Recent correction from the 20-day high is under 15% |
| `rs_strong` | `rs_score` ≥ 50 (63-day return outperforming SPY) |
| `volume_contracting` | 5-day average volume < 20-day average volume |

**Interpreting `score`:** 6–7 = worth considering an entry; 4–5 = watch
only; ≤3 = avoid. This score feeds `run_backtest`'s `threshold` param and is
the entry criterion the live `get_signal_log` entries were auto-logged
against.

### Conviction score — `conviction_score` (0–100), `conviction_label`

A blended confidence score: 40% Stage2 score + 30% social sentiment
composite + 30% Risk Regime total. Labels: **Very High** (≥80) / **High**
(≥65) / **Moderate** (≥50) / **Low** (≥35) / **Very Low** (<35).
`conviction_reliability` (`high`/`medium`/`low`) tells you how much to trust
the score itself — `low` usually means sentiment data was missing and a
neutral 50 was substituted, so treat the conviction number as less
meaningful in that case. Always check `conviction_notes` for caveats before
quoting the score.

### Risk Regime — `total` (0–100), `regime` label, `components`

A market-wide (not per-symbol) composite of 5 factors — Trend, Breadth,
Credit, Volatility, Momentum, each 0–20:

| Grade | Score range | Meaning |
|---|---|---|
| `RISK_ON` | 80–100 | Trend-following strategies work well |
| `CONSTRUCTIVE` | 60–79 | Selective entries reasonable |
| `MIXED` | 40–59 | Reduce position size |
| `DEFENSIVE` | 20–39 | Increase cash |
| `RISK_OFF` | 0–19 | Avoid new buys |

`valid_count` in the response tells you how many of the 5 factors had
usable data (5 = full confidence).

### Entry / Stop / Target (R:R plan)

```
entry  = 20-day pivot high × 1.005
stop   = entry − 2 × ATR(14)
target = entry + 3 × (entry − stop)     → fixed 1:3 reward:risk
```
These are the system's mechanical levels, always present on `get_watchlist`
and `get_daily` rows — they are **not** a live buy signal by themselves.
Whether the setup is actually actionable depends on where the current price
sits relative to `entry`: within ~5% of (or above) entry with Stage2 ≥ 5 is
a live setup; far below entry (>15%) means the plan is stale/invalid even
though the numbers are still returned. If a user asks "is this a good entry
right now", compare `price` to `entry`/`pivot_high` yourself — the API does
not compute this "setup status" field for you.

### RS score / RS percentile

`rs_score` (0–100, SPY-relative, feeds the Stage2 `rs_strong` check) and
`rs_score_percentile` (0–100, this symbol's `rs_excess_63d` ranked against
the rest of the watchlist universe that has data) are two different
things — the first is an absolute pass/fail threshold, the second is a
same-day relative ranking. Prefer the percentile when a user asks
"which of my watchlist names is relatively strongest right now".

### Monthly phase — `monthly_phase`

One of `UPTREND` / `WEAKENING` / `DOWNTREND` / `UNKNOWN` (long-timeframe
context on top of the daily Stage2 score). `monthly_uptrend_confirmed`
(bool) is the stricter gate.

### Distribution Days

O'Neil-style count of institutional selling days (SPY/QQQ) over the last 25
trading days. `level`: `OK` (0–3) / `WARNING` (4–5) / `DANGER` (6+) — more
distribution days means broad-market distribution is underway, a bearish
market-timing signal independent of any single stock's Stage2 score.

### Divergence

A comparison of social-sentiment composite vs. same-day price change per
symbol. **Not a trading signal** — it's an interpretation aid the system
itself explicitly disclaims (`rule` field in the response spells out the
exact thresholds: bullish divergence = composite ≥ +0.5 and price ≤ −1.5%;
bearish = composite ≤ −0.5 and price ≥ +1.5%).

### AI-sourced data (`available: false` soft-fail pattern)

`get_sentiment`, `get_brief`, `get_morning_briefing`, `get_earnings`,
`get_prediction`, `get_divergence` all come from an external cron pipeline
that runs 1–2x/day and pushes to GitHub; the backend caches it (typically
30–60 min TTL). These endpoints **never HTTP-error on missing data** — they
return `200` with `{"available": false, "error": "..."}` instead. **Always
check `available` before reading `data`/`latest`.** When `available` is
true, check `meta.stale` / `meta.from_cache` / `meta.age_minutes` — a
`stale: true` response means the pipeline's most recent fetch failed and
you're looking at the last-known-good snapshot, which may be many hours
old. Say so to the user rather than presenting it as current.

### Bilingual fields (`_en` / `_ko` suffixes)

AI-generated text fields (in `brief`, `morning-briefing`, `earnings`,
`macro/insight`) come as English/Korean pairs, e.g. `summary_en` /
`summary_ko`, plus a legacy unsuffixed `summary` for older cached data. Pick
whichever language field is non-null and matches the conversation's
language; don't concatenate both.

---

## 3. Tool catalog

All 40 tools map 1:1 to a SniperBoard REST endpoint. GET tools are pure
reads — call them as often as you like. **The four tools marked ⚠️ mutate
server state** — see §4 before calling any of them.

### Per-symbol tools (any valid US ticker, not just the watchlist)

| Tool | Params | Returns | When to use |
|---|---|---|---|
| `get_daily` | `symbol` (required) | Daily candles (1y), indicators, full Stage2 breakdown, conviction | The default tool for "how does X look" — this is the richest single-symbol view |
| `get_ohlcv` | `symbol` (required), `tf` (default `5m`) | Intraday candles + 6 intraday signals (Sniper/VCP/Pullback/StrongTrend/Overbought/Downtrend) + EMA21/50/RSI/ATR | Intraday/day-trading questions only — daily swing questions should use `get_daily` instead |
| `get_latest_signal` | `symbol` (required), `tf` (default `5m`) | Just the most recent bar's active intraday signals + latest indicator values | Cheaper than `get_ohlcv` when you only need "is a signal firing right now" |
| `get_prepost` | `symbol` (required) | Pre-market / after-hours / overnight price + market state | "What's X doing after hours" |
| `get_symbol_info` | `symbol` (required) | Market cap, 52w high/low, sector, industry | Company fundamentals lookups, 1h cached |
| `get_sentiment_history` | `symbol` (required, or `"MARKET"`), `days` (1–30, default 7) | N-day social sentiment composite history | Trend of sentiment over time for one name |

### Watchlist-wide tools (fixed 22-symbol universe)

| Tool | Params | Returns | When to use |
|---|---|---|---|
| `get_watchlist` | none | Full Stage2/RS/Conviction/entry-stop-target table for all 22 symbols, sorted by Stage2 score descending | "What looks good right now" / "screen my watchlist" — this is the single most useful tool for a market-scan request |
| `get_signal_log` | `symbol` (optional filter), `limit` (1–500, default 200) | Auto-logged trade signals (Stage2≥5 entries) with WIN/LOSS/TIMEOUT/PENDING/ACTIVE outcomes | "How has the system actually performed" / reviewing a specific past signal |
| `get_signal_log_stats` | none | Aggregate live win rate, expectancy_r, profit factor, MDD, equity curve, regime breakdown, **and a side-by-side comparison against the cached backtest baseline** | The tool for "is this system actually working" — prefer this over raw `get_signal_log` for performance questions |
| `get_alerts` | `max_earnings_days` (0–14, default 3) | Unified feed: upcoming-earnings D-day, currently open signals, model health warnings, briefing data-integrity issues | "What needs my attention today" — this is the one tool that already aggregates several other endpoints for you |

### Market-wide tools

| Tool | Params | Returns | When to use |
|---|---|---|---|
| `get_regime` | none | Risk Regime composite (see §2) | Always check this before making any "should I buy" style statement — it's the market-timing backdrop |
| `get_macro` | none | Price/EMA/RSI/structure for ~23 macro symbols (dollar, rates, commodities, indices, VIX family, credit spreads, breadth, sectors) | Raw macro data table |
| `get_macro_insight` | none | Same universe collapsed into 6 group traffic lights (`green`/`yellow`/`red`) + overall `RISK_ON`/`MIXED`/`RISK_OFF` judgment + optional AI commentary | Prefer this over `get_macro` when the user wants an interpreted "is the macro backdrop supportive" answer, not raw numbers |
| `get_distribution_days` | none | SPY/QQQ distribution day counts (see §2) | Market-timing / broad-market health questions |

### AI-sourced content (always soft-fails — see §2's `available` note)

| Tool | Params | Returns | When to use |
|---|---|---|---|
| `get_sentiment` | none | Latest social sentiment snapshot, market + per-symbol composites | "What's the social mood" |
| `get_brief` | none | AI Daily Brief — market narrative + per-symbol context | Broad "what's the AI's read on the market today" |
| `get_morning_briefing` | none | Structured morning briefing — mood, big picture, sector analysis, spotlight names, full watchlist notes, today's checkpoints | More structured/actionable than `get_brief`; prefer this for a "give me today's briefing" request |
| `get_earnings` | none | Upcoming earnings calendar + recent results with AI reaction commentary | Earnings-specific questions |
| `get_prediction` | none | Polymarket FOMC odds | Only when explicitly asked about rate-decision odds; the API itself marks this `reference_only` — never treat it as feeding into Conviction or Stage2 |
| `get_divergence` | `only_divergences` (bool, default `true`) | Sentiment-vs-price divergence list (see §2) | Only when asked specifically about sentiment/price disconnects; always relay the tool's own disclaimer that this isn't a trading signal |

### Backtest tools

| Tool | Params | Returns | When to use |
|---|---|---|---|
| `get_backtest_result` | none | Cached Stage2 backtest result (win rate, expectancy, profit factor, equity curve). **404 if nothing has been run yet.** | Check this before offering to run a fresh backtest — if a cached result exists and is recent enough for the user's question, don't re-run |
| `run_backtest` ⚠️ | `symbols` (optional list, default TIER1), `threshold` (1–7, default 5), `rs_threshold` (0–100, default 70), `use_spy_filter` (bool, default true) | Runs a real backtest against yfinance history, overwrites the cache, returns summary stats | Only when the user explicitly wants a fresh/different-parameter backtest — see §4 |
| `get_backtest_sweep` | none | Cached 8-combination parameter sweep. **404 if never run.** | Parameter sensitivity questions |
| `run_backtest_sweep` ⚠️ | `symbols` (optional list, default TIER1) | Runs 8 backtests across a parameter grid, overwrites the sweep cache | Rare — only for explicit "what parameters work best" requests; this is slow (minutes), see §4 |

### Operational / mutating tools

| Tool | Params | Returns | When to use |
|---|---|---|---|
| `refresh_signal_log` ⚠️ | none | Kicks off a background rescan (new signals + outcome resolution); returns immediately with `status: refresh_started` | Only if the user explicitly wants the live log updated right now — it updates automatically on a schedule otherwise |
| `send_email_report` ⚠️ | none | Triggers sending the real morning email report to whatever address the backend is configured with; returns immediately | **Never call this speculatively.** Only on an explicit, unambiguous user request to send the email |
| `preview_email_report` | none | Renders the same email as HTML **without sending it** | Use this instead of `send_email_report` whenever the user wants to *see* what the email would contain |
| `get_cap_leaderboard` | none | Global market-cap TOP 15 with rank changes, 52-week position, sparkline data | "Biggest companies by market cap" — unrelated to the watchlist |
| `get_insight` | `days` (14–120, default 60), `horizon` (1–20, default 5) | Historical-only analytics: divergence→forward-return stats, AI action-recommendation hit rate, theme streaks, macro regime transitions | Retrospective/analytical questions ("has following the AI's calls actually paid off historically") — this tool explicitly does not give live signals, only backward-looking stats |

---

## 4. Rules for the four mutating tools

`run_backtest`, `run_backtest_sweep`, `refresh_signal_log`,
`send_email_report` all change server-side state or trigger a real-world
side effect (an email send). For all four:

1. **Never call one speculatively** to "see what happens" or as a default
   step in a workflow. Only call when the user's request cannot be
   satisfied by a read-only tool, or when they explicitly ask for the
   action itself ("run a backtest on X", "send me the report now").
2. **Tell the user before calling**, briefly — e.g. "this will re-run the
   backtest and overwrite the cached result, which may take up to a
   minute" — the same way you'd flag any other side-effecting action.
3. **Prefer the cheaper alternative when one exists**: `preview_email_report`
   over `send_email_report` unless sending was explicitly requested;
   `get_backtest_result` over `run_backtest` if a cached result already
   answers the question.
4. `run_backtest` and `run_backtest_sweep` hit real yfinance downloads and
   can take tens of seconds to several minutes — don't assume a fast
   response; if your client has a tool-call timeout, warn the user
   `run_backtest_sweep` in particular may take minutes.
5. None of these tools ask for confirmation themselves — the safety check
   is entirely on you, the calling model.

---

## 5. Common workflows (multi-tool recipes)

**"What looks good to buy right now?"**
1. `get_regime` — check the market backdrop first; if `RISK_OFF` or
   `DEFENSIVE`, lead with that caveat regardless of individual setups.
2. `get_watchlist` — already sorted by Stage2 score descending; look at the
   top few rows with `score` ≥ 6.
3. For each candidate, compare `price` (if present) to `entry`/`pivot_high`
   to judge whether the setup is live vs. extended vs. still forming.
4. Mention `conviction_label` and `conviction_reliability` alongside Stage2,
   not instead of it.

**"Give me today's market briefing"**
1. `get_morning_briefing` — the primary structured source; check
   `available` first.
2. `get_regime` + `get_macro_insight` for the quantitative backdrop to pair
   with the narrative.
3. `get_alerts` for anything time-sensitive (earnings today/tomorrow, open
   signals, data-integrity issues) that the narrative might not mention.

**"Is the system actually working / should I trust these signals?"**
1. `get_signal_log_stats` — this already includes the live-vs-backtest
   comparison and a `health` status; lead with that.
2. Only fall back to `get_backtest_result` / `run_backtest` if the user
   wants backtest detail beyond what the comparison already surfaced.

**"Tell me about earnings coming up"**
1. `get_earnings` for the calendar + AI commentary.
2. `get_alerts` with a larger `max_earnings_days` if the user wants a wider
   window than the default 3-day alert horizon.

**"How's [some non-watchlist stock] doing?"**
1. `get_daily` for the Stage2/technical view — works for any symbol.
2. `get_symbol_info` for fundamentals (market cap, sector).
3. Do **not** expect `get_sentiment`, `get_brief`, or `get_signal_log` to
   have data for a symbol outside the 22-name watchlist — those are
   watchlist-scoped; say so if asked.

**"What's the macro backdrop like?"**
1. `get_macro_insight` first (interpreted traffic lights + AI commentary).
2. `get_distribution_days` to add the O'Neil market-timing angle.
3. Use `get_macro` only if the user wants the raw numbers behind a specific
   group (e.g. "what exactly is VIX doing").

---

## 6. Error handling

Every tool returns its result as a single text block. On a backend error
(4xx/5xx), you'll get plain text like `Error: 404 not found: {"detail":
"No daily data found for XYZ"}` instead of structured JSON — read the
message and relay the actual cause to the user (e.g. "XYZ doesn't have
enough trading history for Stage2 analysis yet" for a 404 on `get_daily`,
which happens for recent IPOs). A connection-refused style error mentioning
`SNIPERBOARD_API_URL` means the backend isn't running — this is not
something you can fix by retrying or changing your call; tell the user.
