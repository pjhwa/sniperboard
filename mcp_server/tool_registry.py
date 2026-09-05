"""Declarative registry mapping MCP tool names to SniperBoard REST endpoints.

Each ToolDef fully describes one /api/* call: name, HTTP method, path,
query/body params, and whether it mutates server state. server.py builds
MCP tool schemas from this table; client.py dispatches calls through it.
No business logic lives here or in client.py — every tool is a passthrough
to the running SniperBoard backend (see docs/superpowers/specs/2026-08-31-mcp-server-design.md).
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ParamSpec:
    type: str  # JSON schema type: "string" | "integer" | "boolean" | "array"
    description: str
    required: bool = False
    default: object | None = None
    items_type: str | None = None  # required when type == "array"


@dataclass(frozen=True)
class ToolDef:
    name: str
    method: str  # "GET" | "POST"
    path: str
    description: str
    params: dict[str, ParamSpec] = field(default_factory=dict)
    body_params: frozenset[str] = field(default_factory=frozenset)
    mutating: bool = False


TOOLS: list[ToolDef] = [
    ToolDef(
        name="get_prepost",
        method="GET",
        path="/prepost",
        description="Pre-market / after-hours / overnight price for one symbol.",
        params={"symbol": ParamSpec("string", "Stock symbol, e.g. AAPL", required=True)},
    ),
    ToolDef(
        name="get_ohlcv",
        method="GET",
        path="/ohlcv",
        description="Intraday OHLCV candles + 6 intraday signals + indicators (EMA21/50, RSI, ATR) for one symbol.",
        params={
            "symbol": ParamSpec("string", "Stock symbol, e.g. AAPL", required=True),
            "tf": ParamSpec("string", "Timeframe, e.g. 1m/5m/15m", default="5m"),
        },
    ),
    ToolDef(
        name="get_latest_signal",
        method="GET",
        path="/latest-signal",
        description="Most recent intraday signal snapshot for one symbol (active signals, latest RSI/EMA/ATR).",
        params={
            "symbol": ParamSpec("string", "Stock symbol, e.g. AAPL", required=True),
            "tf": ParamSpec("string", "Timeframe, e.g. 1m/5m", default="5m"),
        },
    ),
    ToolDef(
        name="get_daily",
        method="GET",
        path="/daily",
        description="Daily candles + Stage2 checklist/score + entry/stop/target + Conviction score for one symbol.",
        params={"symbol": ParamSpec("string", "Stock symbol, e.g. AAPL", required=True)},
    ),
    ToolDef(
        name="get_macro",
        method="GET",
        path="/macro",
        description="Macro overview: price/EMA/RSI/structure for ~23 macro symbols (dollar, rates, commodities, indices, vol, credit, breadth, sectors).",
    ),
    ToolDef(
        name="get_macro_insight",
        method="GET",
        path="/macro/insight",
        description="Macro traffic-light signals (RISK_ON/MIXED/RISK_OFF) per group + AI commentary.",
    ),
    ToolDef(
        name="get_watchlist",
        method="GET",
        path="/watchlist",
        description="Full 22-symbol watchlist: Stage2 score, RS, Conviction, entry/stop/target for every tracked symbol.",
    ),
    ToolDef(
        name="get_regime",
        method="GET",
        path="/regime",
        description="Risk Regime 5-factor composite score (0-100) for the overall market.",
    ),
    ToolDef(
        name="get_sentiment",
        method="GET",
        path="/sentiment",
        description="Latest social sentiment snapshot (market + per-symbol composite scores) plus today's slots.",
    ),
    ToolDef(
        name="get_sentiment_history",
        method="GET",
        path="/sentiment/history",
        description="N-day social sentiment history for one symbol or MARKET.",
        params={
            "symbol": ParamSpec("string", "Symbol or 'MARKET'", required=True),
            "days": ParamSpec("integer", "Number of days, 1-30", default=7),
        },
    ),
    ToolDef(
        name="get_insight",
        method="GET",
        path="/insight",
        description="Insight Lab analytics: divergence forward returns, AI action hit-rate, theme streaks, macro transitions. Historical only, not advice.",
        params={
            "days": ParamSpec("integer", "Analysis window in days, 14-120", default=60),
            "horizon": ParamSpec("integer", "Forward-return horizon in trading days, 1-20", default=5),
        },
    ),
    ToolDef(
        name="get_brief",
        method="GET",
        path="/brief",
        description="Latest AI Daily Brief snapshot (market narrative + per-symbol context).",
    ),
    ToolDef(
        name="get_morning_briefing",
        method="GET",
        path="/morning-briefing",
        description="Latest AI morning briefing snapshot (mood, big picture, sector analysis, spotlight, watchlist notes).",
    ),
    ToolDef(
        name="get_earnings",
        method="GET",
        path="/earnings",
        description="Earnings Intelligence snapshot: upcoming earnings calendar + recent results with AI commentary.",
    ),
    ToolDef(
        name="get_divergence",
        method="GET",
        path="/divergence",
        description="Social-sentiment-vs-price divergence list (interpretation aid, not a trading signal).",
        params={"only_divergences": ParamSpec("boolean", "Only return bullish/bearish divergence rows", default=True)},
    ),
    ToolDef(
        name="get_prediction",
        method="GET",
        path="/prediction",
        description="FOMC prediction-market odds (Polymarket, reference only).",
    ),
    ToolDef(
        name="get_backtest_result",
        method="GET",
        path="/backtest/result",
        description="Cached Stage2 backtest result (win rate, expectancy, profit factor, equity curve). 404 if never run.",
    ),
    ToolDef(
        name="run_backtest",
        method="POST",
        path="/backtest/run",
        description="⚠️ Runs a fresh Stage2 backtest (downloads yfinance history; can take tens of seconds) and overwrites the cached result.",
        params={
            "symbols": ParamSpec("array", "Symbols to backtest; defaults to the TIER1 watchlist if omitted", items_type="string"),
            "threshold": ParamSpec("integer", "Minimum Stage2 score to enter, 1-7", default=5),
            "rs_threshold": ParamSpec("integer", "Minimum RS strength, 0-100", default=70),
            "use_spy_filter": ParamSpec("boolean", "Require SPY > EMA200 market filter", default=True),
        },
        body_params=frozenset({"symbols"}),
        mutating=True,
    ),
    ToolDef(
        name="get_backtest_sweep",
        method="GET",
        path="/backtest/sweep",
        description="Cached parameter-sweep backtest result (8 parameter combinations). 404 if never run.",
    ),
    ToolDef(
        name="run_backtest_sweep",
        method="POST",
        path="/backtest/sweep",
        description="⚠️ Runs an 8-combination parameter-sweep backtest (can take several minutes) and overwrites the cached sweep result.",
        params={"symbols": ParamSpec("array", "Symbols to sweep; defaults to the TIER1 watchlist if omitted", items_type="string")},
        body_params=frozenset({"symbols"}),
        mutating=True,
    ),
    ToolDef(
        name="get_signal_log",
        method="GET",
        path="/signal-log",
        description="Live signal log entries (auto-logged Stage2 >= 5 signals with WIN/LOSS/TIMEOUT/PENDING outcomes).",
        params={
            "symbol": ParamSpec("string", "Filter to one symbol; omit for all"),
            "limit": ParamSpec("integer", "Max entries to return, 1-500", default=200),
        },
    ),
    ToolDef(
        name="get_alerts",
        method="GET",
        path="/alerts",
        description="Actionable alerts: upcoming earnings D-day, open signals, model health, briefing integrity issues.",
        params={"max_earnings_days": ParamSpec("integer", "Earnings alert horizon in days, 0-14", default=3)},
    ),
    ToolDef(
        name="get_signal_log_stats",
        method="GET",
        path="/signal-log/stats",
        description="Live signal performance stats (win rate, expectancy, MDD) vs. backtest baseline comparison.",
    ),
    ToolDef(
        name="refresh_signal_log",
        method="POST",
        path="/signal-log/refresh",
        description="⚠️ Rescans the watchlist for new signals and updates PENDING/ACTIVE outcomes against the latest daily candles. Runs in the background; can take tens of seconds.",
        mutating=True,
    ),
    ToolDef(
        name="get_distribution_days",
        method="GET",
        path="/distribution-days",
        description="O'Neil Distribution Day count (last 25 trading days) for SPY and QQQ.",
    ),
    ToolDef(
        name="send_email_report",
        method="POST",
        path="/email-report/send",
        description="⚠️ Sends the morning email report now, to whatever address(es) the backend is configured with. Runs in the background.",
        mutating=True,
    ),
    ToolDef(
        name="preview_email_report",
        method="GET",
        path="/email-report/preview",
        description="Renders the morning email report as HTML without sending it (preview only).",
    ),
    ToolDef(
        name="get_symbol_info",
        method="GET",
        path="/symbol-info",
        description="Market cap, 52-week high/low, sector, industry for one symbol.",
        params={"symbol": ParamSpec("string", "Stock symbol, 1-10 chars", required=True)},
    ),
    ToolDef(
        name="get_cap_leaderboard",
        method="GET",
        path="/cap-leaderboard",
        description="Global market-cap TOP 15 leaderboard with rank changes, sparklines, 52-week position.",
    ),
    ToolDef(
        name="get_insider",
        method="GET",
        path="/insider",
        description="Yahoo Form 4 insider transactions + 7-day cluster-buy flag. Reference only — not used in Conviction.",
        params={"symbol": ParamSpec("string", "Stock symbol", required=True)},
    ),
    ToolDef(
        name="get_short_float",
        method="GET",
        path="/short-float",
        description="Short percent of float. Reference only.",
        params={"symbol": ParamSpec("string", "Stock symbol", required=True)},
    ),
    ToolDef(
        name="get_rs_horizons",
        method="GET",
        path="/rs-horizons",
        description="Relative strength vs SPY at 1m/3m/6m/12m. Does not change Stage2 rs_score.",
        params={"symbol": ParamSpec("string", "Stock symbol", required=True)},
    ),
    ToolDef(
        name="get_calendar",
        method="GET",
        path="/calendar",
        description="US CPI/FOMC/NFP-class macro calendar for the current week.",
    ),
    ToolDef(
        name="get_alert_rules",
        method="GET",
        path="/alert-rules",
        description="User overlay alert rules (price cross, volume spike, Stage2≥5, RS≥70).",
    ),
    ToolDef(
        name="put_alert_rules",
        method="PUT",
        path="/alert-rules",
        description="Replace overlay alert rules list.",
        mutating=True,
    ),
    ToolDef(
        name="get_options_unusual",
        method="GET",
        path="/options-unusual",
        description="Unusual options (volume vs OI / premium). Reference only.",
        params={"symbol": ParamSpec("string", "Stock symbol", required=True)},
    ),
    ToolDef(
        name="get_sector_quadrants",
        method="GET",
        path="/sector-quadrants",
        description="Sector ETF momentum × acceleration quadrants. Reference only.",
    ),
    ToolDef(
        name="get_correlation",
        method="GET",
        path="/correlation",
        description="Pearson return correlation among SPY, QQQ, GLD, CL, DXY, TNX, VIX.",
    ),
    ToolDef(
        name="get_kelly",
        method="GET",
        path="/kelly",
        description="Kelly / half-Kelly / MaxDD-R from live or backtest win-rate and expectancy.",
    ),
    ToolDef(
        name="get_status",
        method="GET",
        path="/status",
        description="Connection, overnight cache, and Model Health for the status strip.",
    ),
]

TOOLS_BY_NAME: dict[str, ToolDef] = {t.name: t for t in TOOLS}
