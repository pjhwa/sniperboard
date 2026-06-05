"""Matplotlib chart renderers — return PNG bytes for email embedding."""
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


_BG = "#1a1a2e"
_FG = "white"
_GREEN = "#22c55e"
_YELLOW = "#f59e0b"
_RED = "#ef4444"
_GRAY = "#334155"

_SIGNAL_COLOR = {"GREEN": _GREEN, "YELLOW": _YELLOW, "RED": _RED}

_REGIME_COLOR = {
    "RISK_ON": _GREEN,
    "CONSTRUCTIVE": "#4ade80",
    "MIXED": _YELLOW,
    "DEFENSIVE": "#fb923c",
    "RISK_OFF": _RED,
    "UNKNOWN": _GRAY,
}


def _to_png(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=96, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def render_regime_gauge(score: float, regime_label: str) -> bytes:
    """Semicircle gauge showing regime score 0–100. Returns PNG bytes."""
    fig, ax = plt.subplots(figsize=(4, 2.4), facecolor=_BG)
    ax.set_facecolor(_BG)

    # Background arc
    theta_bg = np.linspace(np.pi, 0, 200)
    ax.plot(np.cos(theta_bg), np.sin(theta_bg), linewidth=16, color=_GRAY,
            solid_capstyle="round")

    # Score arc
    clamped = max(0.0, min(100.0, score))
    ratio = clamped / 100.0
    score_end = np.pi * (1.0 - ratio)
    theta_score = np.linspace(np.pi, score_end, 200)
    color = _REGIME_COLOR.get(regime_label, _YELLOW)
    ax.plot(np.cos(theta_score), np.sin(theta_score), linewidth=16, color=color,
            solid_capstyle="round")

    ax.text(0, 0.15, f"{clamped:.0f}", ha="center", va="center",
            fontsize=30, fontweight="bold", color=_FG)
    ax.text(0, -0.25, regime_label.replace("_", " "), ha="center", va="center",
            fontsize=9, color=color, fontweight="bold")

    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-0.5, 1.2)
    ax.axis("off")
    return _to_png(fig)


def render_watchlist_sparklines(price_data: dict, items: list) -> bytes:
    """2×N grid of sparklines for watchlist symbols. Returns PNG bytes."""
    valid = [item for item in items if item["symbol"] in price_data]
    n = len(valid)
    if n == 0:
        fig, ax = plt.subplots(figsize=(9, 1), facecolor=_BG)
        ax.axis("off")
        return _to_png(fig)

    cols = 3
    rows = max(1, (n + cols - 1) // cols)
    fig, axes = plt.subplots(rows, cols, figsize=(9, rows * 1.6), facecolor=_BG)
    fig.subplots_adjust(hspace=0.5, wspace=0.3)

    # np.array().flatten() handles scalar (n=1,cols=1), 1D (rows=1), and 2D cases
    axes_flat = np.array(axes).flatten()

    for i, item in enumerate(valid):
        ax = axes_flat[i]
        ax.set_facecolor(_BG)
        prices = price_data[item["symbol"]]
        color = _GREEN if prices[-1] >= prices[0] else _RED
        ax.plot(prices, color=color, linewidth=1.5)
        score = item.get("stage2_score", "")
        ax.set_title(f"{item['symbol']}  {score}/7", color=_FG, fontsize=7.5,
                     pad=2, fontweight="bold")
        ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.set_facecolor(_BG)

    for j in range(len(valid), len(axes_flat)):
        axes_flat[j].set_visible(False)

    fig.patch.set_facecolor(_BG)
    return _to_png(fig)


def render_macro_bar(groups: dict) -> bytes:
    """Horizontal color bar showing signal per macro group. Returns PNG bytes."""
    if not groups:
        fig, ax = plt.subplots(figsize=(7, 0.8), facecolor=_BG)
        ax.set_facecolor(_BG)
        ax.text(0.5, 0.5, "No macro data", ha="center", va="center",
                color=_GRAY, transform=ax.transAxes)
        ax.axis("off")
        return _to_png(fig)

    labels = list(groups.keys())
    colors = [_SIGNAL_COLOR.get(groups[g].get("signal", "YELLOW"), _YELLOW) for g in labels]

    fig, ax = plt.subplots(figsize=(7, 1.0), facecolor=_BG)
    ax.set_facecolor(_BG)

    for i, (label, color) in enumerate(zip(labels, colors)):
        ax.barh(0, 1, left=i, color=color, height=0.7, edgecolor=_BG, linewidth=2)
        display = label[:9].upper()
        ax.text(i + 0.5, 0, display, ha="center", va="center",
                fontsize=7, color=_BG, fontweight="bold")

    ax.set_xlim(0, len(labels))
    ax.set_ylim(-0.5, 0.5)
    ax.axis("off")
    fig.patch.set_facecolor(_BG)
    return _to_png(fig)
