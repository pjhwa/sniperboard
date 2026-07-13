"""Morning email report service.

Collects data from internal Python functions (no self-HTTP),
renders matplotlib charts, injects into Jinja2 HTML template,
and sends via Gmail SMTP TLS.

Env vars required:
  GMAIL_USER           — sender Gmail address
  GMAIL_APP_PASSWORD   — 16-char App Password from Google Account settings
  REPORT_TO            — comma-separated recipient addresses
  DASHBOARD_URL        — optional, link in email footer (default: http://localhost:4000)
"""

import base64
import logging
import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader

from core.data_adapter import get_multi_daily
from core.regime_engine import compute_regime
from core.signal_engine import add_daily_indicators, calculate_stage2_analysis
from core.conviction_calculator import calculate_conviction
from services.morning_briefing_service import fetch_morning_briefing
from services.macro_insight_service import fetch_macro_insight
from services.sentiment_service import fetch_latest
from services.charts import render_regime_gauge, render_watchlist_sparklines, render_macro_bar

logger = logging.getLogger(__name__)

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
REPORT_TO = os.environ.get("REPORT_TO", "")
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://localhost:4000")

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)

_KST = ZoneInfo("Asia/Seoul")

_WATCHLIST_SYMS = [
    "TSM", "NVDA", "META", "TSLA", "PLTR", "MU", "CRWD", "AMZN", "MSFT", "AAPL", "GOOGL",
    "RKLB", "CEG", "VST", "ALAB", "OKLO", "APP", "ANET", "NVO", "QBTS", "SOFI",
]

_CONVICTION_CSS = {
    "Very High": "b-vhigh",
    "High": "b-high",
    "Moderate": "b-mod",
    "Low": "b-low",
    "Very Low": "b-vlow",
}

_REGIME_CSS = {
    "RISK_ON": "risk-on",
    "CONSTRUCTIVE": "constructive",
    "MIXED": "mixed",
    "DEFENSIVE": "defensive",
    "RISK_OFF": "risk-off",
}

_MOOD_DOT = {"green": "🟢", "yellow": "🟡", "red": "🔴"}
_SIGNAL_ICON = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}
_SENTIMENT_ICON = {
    "euphoric": "🚀", "optimistic": "😊", "neutral": "😐",
    "cautious": "😟", "fearful": "😨",
}
_ACTION_CLASS = {"buy": "act-buy", "hold": "act-hold", "watch": "act-watch", "avoid": "act-avoid"}
_MACRO_GROUP_KO = {
    "volatility": "변동성 (VIX)",
    "breadth": "시장 폭 (RSP)",
    "credit": "신용 스프레드",
    "rates": "금리 (IEF)",
    "commodities": "원자재",
    "sectors": "섹터 로테이션",
}


def collect_email_data() -> dict:
    """Gather all data needed for the morning email report.

    Calls internal Python functions directly — no HTTP self-calls.
    Returns a dict with keys: briefing, regime, watchlist, sparkline_data, macro, generated_at.
    """
    briefing = fetch_morning_briefing()

    try:
        regime_dfs = get_multi_daily(["SPY", "RSP", "HYG", "IEF", "^VIX"], period="1y")
        regime = compute_regime(regime_dfs)
    except Exception as e:
        logger.warning(f"Regime data fetch failed, using neutral fallback: {e}")
        regime = {"total": 50.0, "regime": "UNKNOWN"}

    try:
        all_syms = _WATCHLIST_SYMS + ["SPY", "RSP"]
        dfs = get_multi_daily(all_syms, period="2y")
    except Exception as e:
        logger.warning(f"Watchlist data fetch failed: {e}")
        dfs = {}
    spy_df = dfs.get("SPY")
    rsp_df = dfs.get("RSP")
    spy_close = spy_df["close"] if spy_df is not None and not spy_df.empty else None
    rsp_close = rsp_df["close"] if rsp_df is not None and not rsp_df.empty else None

    regime_total = regime.get("total", 50.0) if regime else 50.0
    regime_label = regime.get("regime") if regime else None

    watchlist_items = []
    sparkline_data = {}

    # Live sentiment composites (−2..+2); None → calculator neutral
    symbol_sentiment_map: dict[str, float] = {}
    market_sentiment = None
    try:
        sent = fetch_latest()
        if sent and sent.get("available") is not False:
            m = (sent.get("market") or {}).get("composite_score")
            if m is not None:
                market_sentiment = float(m)
            for s in sent.get("symbols") or []:
                k = s.get("symbol")
                cs = s.get("composite_score")
                if k is not None and cs is not None:
                    symbol_sentiment_map[str(k).upper()] = float(cs)
    except Exception as e:
        logger.warning(f"email report sentiment fetch failed: {e}")

    for sym in _WATCHLIST_SYMS:
        df = dfs.get(sym)
        if df is None or df.empty:
            continue
        try:
            df = add_daily_indicators(df)
            stage2 = calculate_stage2_analysis(df, spy_close, rsp_close)
            stage2_score = stage2.get("score", 0)
            rs_score = stage2.get("rs_score")

            try:
                sym_sent = symbol_sentiment_map.get(sym, market_sentiment)
                conv = calculate_conviction(
                    stage2_score=stage2_score,
                    sentiment_composite=sym_sent,
                    regime_total=regime_total,
                    regime_label=regime_label,
                )
                c_score = conv["score"]
                c_label = conv["label"]
            except Exception:
                c_score = None
                c_label = None

            watchlist_items.append({
                "symbol": sym,
                "price": round(float(df["close"].iloc[-1]), 2),
                "stage2_score": stage2_score,
                "rs_score": round(rs_score, 1) if rs_score is not None else None,
                "conviction_score": c_score,
                "conviction_label": c_label,
                "conviction_class": _CONVICTION_CSS.get(c_label, "b-mod"),
            })
            sparkline_data[sym] = df["close"].tail(30).tolist()
        except Exception as e:
            logger.warning(f"Skipping {sym} in email data collection: {e}")

    watchlist_items.sort(key=lambda x: x["stage2_score"], reverse=True)

    try:
        macro = fetch_macro_insight()
    except Exception as e:
        logger.warning(f"Macro insight fetch failed: {e}")
        macro = None

    return {
        "briefing": briefing,
        "regime": regime or {"total": 50.0, "regime": "UNKNOWN"},
        "watchlist": watchlist_items,
        "sparkline_data": sparkline_data,
        "macro": macro,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def render_html(data: dict, gauge_png: bytes, sparklines_png: bytes,
                macro_bar_png: bytes | None) -> str:
    """Render Jinja2 template to HTML string with base64-embedded PNG images."""
    now_kst = datetime.now(_KST)
    date_str = now_kst.strftime("%Y-%m-%d (%a)")
    generated_kst = now_kst.strftime("%H:%M KST")

    regime = data["regime"]
    regime_raw = regime.get("regime", "UNKNOWN")
    regime_score = round(regime.get("total", 50.0))
    regime_class = _REGIME_CSS.get(regime_raw, "mixed")
    regime_label_display = regime_raw.replace("_", " ")

    briefing_data = data.get("briefing", {})
    briefing_available = briefing_data.get("available", False)
    bdata = briefing_data.get("data", {}) if briefing_available else {}

    # ── existing fields (ko/en priority) ────────────────────────────────────
    headline = bdata.get("headline_ko") or bdata.get("headline_en") or bdata.get("headline", "")
    executive_bullets = (bdata.get("executive_bullets_ko")
                         or bdata.get("executive_bullets_en")
                         or bdata.get("executive_bullets") or [])
    today_checkpoints = (bdata.get("today_checkpoints_ko")
                         or bdata.get("today_checkpoints_en")
                         or bdata.get("today_checkpoints") or [])
    earnings_alert = (bdata.get("earnings_alert_ko")
                      or bdata.get("earnings_alert_en")
                      or bdata.get("earnings_alert", ""))

    # ── ② Morning Mood ──────────────────────────────────────────────────────
    mood_raw = bdata.get("market_mood") or {}
    mood_light = mood_raw.get("traffic_light", "yellow")
    mood_dot = _MOOD_DOT.get(mood_light, "🟡")
    mood_label = mood_raw.get("label_ko") or mood_raw.get("label_en", "")
    mood_explanation = mood_raw.get("explanation_ko") or mood_raw.get("explanation_en", "")

    # ── ③ Macro ─────────────────────────────────────────────────────────────
    macro = data.get("macro") or {}
    macro_summary = (macro.get("summary_ko") or macro.get("summary")
                     or macro.get("summary_en", ""))
    macro_bullets_raw = (macro.get("bullets_ko") or macro.get("bullets")
                         or macro.get("bullets_en") or [])
    macro_bullets = [b for b in macro_bullets_raw if b][:5]
    macro_bar_b64 = base64.b64encode(macro_bar_png).decode() if macro_bar_png else ""

    macro_groups_detail = []
    for key, val in (macro.get("groups") or {}).items():
        if not isinstance(val, dict):
            continue
        text = val.get("text_ko") or val.get("text_en") or val.get("text", "")
        macro_groups_detail.append({
            "name": _MACRO_GROUP_KO.get(key, key),
            "signal_icon": _SIGNAL_ICON.get(val.get("signal", "YELLOW"), "🟡"),
            "direction": val.get("direction", ""),
            "text": text,
        })

    # ── ③ Big Picture ───────────────────────────────────────────────────────
    bp = bdata.get("big_picture") or {}
    big_picture_items = []
    for label, key in [("VIX", "vix_note"), ("금리", "rates_note"),
                        ("달러", "dollar_note"), ("BTC", "btc_note")]:
        note = bp.get(f"{key}_ko") or bp.get(f"{key}_en", "")
        if note:
            big_picture_items.append({"label": label, "note": note})

    # ── ④ Sector Analysis ───────────────────────────────────────────────────
    sa = bdata.get("sector_analysis") or {}
    sector_leaders = sa.get("leaders_ko") or sa.get("leaders_en", "")
    sector_laggards = sa.get("laggards_ko") or sa.get("laggards_en", "")
    sector_rotation = sa.get("rotation_signal_ko") or sa.get("rotation_signal_en", "")

    # ── ⑥ Spotlight ─────────────────────────────────────────────────────────
    spotlight_items = []
    for s in (bdata.get("spotlight") or []):
        if not isinstance(s, dict):
            continue
        spotlight_items.append({
            "symbol": s.get("symbol", ""),
            "company": s.get("company", ""),
            "why": s.get("why_ko") or s.get("why_en", ""),
            "watch_level": s.get("watch_level_ko") or s.get("watch_level_en", ""),
        })

    # ── ⑥ Morning Watchlist (AI per-symbol analysis) ────────────────────────
    morning_watchlist = []
    for w in (bdata.get("watchlist") or []):
        if not isinstance(w, dict):
            continue
        action = w.get("action", "watch")
        analysis = w.get("analysis_ko") or w.get("analysis_en", "")
        morning_watchlist.append({
            "symbol": w.get("symbol", ""),
            "action": action,
            "action_class": _ACTION_CLASS.get(action, "act-watch"),
            "sentiment_icon": _SENTIMENT_ICON.get(w.get("sentiment_mood", ""), "😐"),
            "analysis": analysis[:90] + "…" if len(analysis) > 90 else analysis,
        })

    tmpl = _jinja_env.get_template("email_report.html.j2")
    return tmpl.render(
        date_str=date_str,
        generated_kst=generated_kst,
        regime_class=regime_class,
        regime_label_display=regime_label_display,
        regime_score=regime_score,
        gauge_b64=base64.b64encode(gauge_png).decode(),
        watchlist=data["watchlist"],
        sparklines_b64=base64.b64encode(sparklines_png).decode(),
        macro_summary=macro_summary,
        macro_bullets=macro_bullets,
        macro_bar_b64=macro_bar_b64,
        macro_groups_detail=macro_groups_detail,
        big_picture_items=big_picture_items,
        briefing_available=briefing_available,
        headline=headline,
        executive_bullets=executive_bullets[:5],
        today_checkpoints=today_checkpoints,
        earnings_alert=earnings_alert,
        mood_dot=mood_dot,
        mood_label=mood_label,
        mood_explanation=mood_explanation,
        sector_leaders=sector_leaders,
        sector_laggards=sector_laggards,
        sector_rotation=sector_rotation,
        spotlight_items=spotlight_items,
        morning_watchlist=morning_watchlist,
        dashboard_url=DASHBOARD_URL,
    )


def send_report_email(html: str, subject: str) -> None:
    """Send HTML email via Gmail SMTP TLS. No-op if env vars not configured."""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD or not REPORT_TO:
        logger.warning("Email report skipped: GMAIL_USER/GMAIL_APP_PASSWORD/REPORT_TO not set.")
        return

    recipients = [r.strip() for r in REPORT_TO.split(",") if r.strip()]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            smtp.send_message(msg)
        logger.info(f"Morning report emailed to {recipients}")
    except Exception as exc:
        logger.error(f"Failed to send morning report email: {exc}", exc_info=True)
        raise


def run_morning_report() -> None:
    """Collect data, render charts, render HTML, and send email. Called by APScheduler."""
    logger.info("Morning email report starting...")
    try:
        data = collect_email_data()

        regime = data["regime"]
        gauge_png = render_regime_gauge(
            score=regime.get("total", 50.0),
            regime_label=regime.get("regime", "UNKNOWN"),
        )
        sparklines_png = render_watchlist_sparklines(
            price_data=data["sparkline_data"],
            items=data["watchlist"],
        )
        macro_groups = (data.get("macro") or {}).get("groups", {})
        macro_bar_png = render_macro_bar(groups=macro_groups)

        html = render_html(
            data=data,
            gauge_png=gauge_png,
            sparklines_png=sparklines_png,
            macro_bar_png=macro_bar_png,
        )

        date_str = datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d")
        send_report_email(html=html, subject=f"SniperBoard Morning Brief — {date_str}")
        logger.info("Morning email report sent successfully.")
    except Exception:
        logger.exception("Morning email report failed.")
