> 한국어 문서: [CLAUDE.ko.md](./CLAUDE.ko.md)

# SniperBoard — Claude Instructions

## Required at Session Start

When starting a new session, always read these two files first:
1. `PROJECT_CONTEXT.md` — full structure, logic, API, file locations
2. `README.md` — user-facing feature descriptions

These two files give you an immediate understanding of the project without reading the entire codebase.

---

## Required After Code Changes

**Before ending any session where you modified code files, you must:**

1. Update `PROJECT_CONTEXT.md`
   - Reflect any changed logic, API, file structure, constants, or data flow
   - Update the "AUTO-GENERATED" date to today

2. Update `README.md`
   - Reflect any user-facing feature changes
   - Update relevant sections if API endpoints, signal conditions, or board layout changed

3. Include both files in the git commit

**Exception**: Style, comment, or test-only changes may skip this.

---

## Key Project Entry Points

- **Backend**: `backend/core/signal_engine.py` — all signal calculations
- **Frontend types**: `frontend/app/types.ts` — centralized metadata constants (BiLang: REGIME_META, DD_META, SIGNAL_META, STAGE2_META, SENTIMENT_META, TREND_META, VOLUME_META, MACRO_SYMBOL_NAMES, CONVICTION_LABEL_META)
- **i18n**: `frontend/app/i18n.ts` — `Locale`, `BiLang`, `t()`, `tField()`. Per-component `const S: Record<string, BiLang>` for static strings. `tField(en, ko, fallback, locale)` for AI data.
- **API router**: `backend/api/endpoints.py` — 7+ endpoints. `MACRO_SYMBOLS` uses English names.
- **Global state**: `frontend/hooks/useStore.ts` — Zustand (symbol, board, theme, locale: 'en'|'ko' default 'ko')

See `PROJECT_CONTEXT.md` Section 10 "Code Modification Reference Points" for details.

---

## Contamination Firewall (Sentiment Data)

When working on any code that touches sentiment collection or the Grok prompt pipeline:

> **Price direction must never be passed to Grok. Only magnitude, volume ratio, and key-level position are allowed.**

- `price_context.py` in `market-sentiment-data` returns neutral cues only — mechanical `_assert_no_direction()` on every dict
- `build_prompt()` in `collect_sentiment.py` asserts no direction words before every Grok call
- `fetch_close_direction()` result flows **only** into divergence post-processing, never into the prompt

Violating this rule makes sentiment data analytically worthless (it becomes an echo of price). This principle lives in `market-sentiment-data` but must be respected when modifying SniperBoard's `/api/sentiment` consumer or any code that feeds data back to the collector.

---

## Related Repository: market-sentiment-data

SniperBoard consumes AI-generated data from a separate repository: **`https://github.com/pjhwa/market-sentiment-data`**

| Data type | Source file | SniperBoard service |
|-----------|-------------|---------------------|
| Social sentiment | `latest.json` / `history/` | `backend/services/sentiment_service.py` |
| AI Daily Brief | `brief/latest.json` | `backend/services/brief_service.py` |
| Earnings Intelligence | `earnings/latest.json` | `backend/services/earnings_service.py` |
| Macro Insight | `macro/latest.json` | `backend/services/macro_insight_service.py` |

- Data is collected by server cron jobs (4 collectors) and pushed to that repo as JSON.
- SniperBoard fetches via raw GitHub URL; token injected via `SENTIMENT_DATA_TOKEN` env var.
- See `market-sentiment-data/PROJECT_CONTEXT.md` for collector architecture, schema, and data contract.
- **Schema version**: 2.0 — all AI text fields use `_en`/`_ko` suffix pairs. Use `tField()` in frontend.
