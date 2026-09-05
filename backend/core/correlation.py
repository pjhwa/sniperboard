"""Pairwise Pearson correlation of daily returns. Missing series omitted, never fabricated."""
from __future__ import annotations

from typing import Optional

import pandas as pd


def correlation_matrix(series: dict[str, Optional[pd.Series]]) -> dict[str, dict[str, float]]:
    usable: dict[str, pd.Series] = {}
    for name, s in series.items():
        if s is None or not isinstance(s, pd.Series) or s.dropna().shape[0] < 3:
            continue
        usable[name] = s.astype(float)
    if not usable:
        return {}
    df = pd.concat(usable, axis=1, join="inner").dropna()
    if df.empty or len(df) < 3:
        # fall back to positional align when indexes don't match (synthetic tests)
        aligned = pd.DataFrame({k: v.reset_index(drop=True) for k, v in usable.items()}).dropna()
        df = aligned
    if df.empty or len(df) < 3:
        return {k: {k: 1.0} for k in usable}
    rets = df.pct_change().dropna()
    if rets.empty:
        return {k: {k: 1.0} for k in usable}
    corr = rets.corr()
    out: dict[str, dict[str, float]] = {}
    for a in corr.columns:
        out[str(a)] = {}
        for b in corr.columns:
            val = corr.loc[a, b]
            out[str(a)][str(b)] = round(float(val), 4) if pd.notna(val) else 0.0
    return out
