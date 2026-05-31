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
