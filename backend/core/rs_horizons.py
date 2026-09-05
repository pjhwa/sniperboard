"""Multi-horizon RS vs SPY. Display-only — does not change Stage2 rs_score/rs_strong."""
from __future__ import annotations

from typing import Optional

import pandas as pd

from core.quant_stats import excess_return_pct

HORIZON_BARS = {
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "12m": 252,
}


def rs_horizons(price: pd.Series, market_price: pd.Series) -> dict[str, Optional[float]]:
    out: dict[str, Optional[float]] = {}
    for key, window in HORIZON_BARS.items():
        val = excess_return_pct(price, market_price, window=window)
        out[key] = round(float(val), 2) if val is not None else None
    return out
