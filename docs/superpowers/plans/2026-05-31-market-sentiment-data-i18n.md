# market-sentiment-data i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the market-sentiment-data pipeline to produce bilingual JSON (English + Korean) in all AI-generated text fields, bump schema to v2.0, and split all documentation into `README.md` (EN) + `README.ko.md` (KO).

**Architecture:** AI prompts (Grok via Hermes) are updated to return `_en` / `_ko` suffix parallel fields in their JSON output. Validation and entry-builder functions are updated to match. The single-language unsuffixed fields (`key_reason`, `headline`, `summary`, etc.) are removed from the pipeline — backward-compat fallback is handled on the consumer side (SniperBoard).

**Tech Stack:** Python 3.11+, unittest, `collect_sentiment.py`, `collect_brief.py`, `schema.json`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `schema.json` | Modify | Add `"2.0"` to `schema_version` enum; add `_en`/`_ko` definitions; remove unsuffixed text fields |
| `collect_sentiment.py` | Modify | `_SYMBOL_PROMPT_BASE`, `MARKET_PROMPT`, `validate_symbol_fields`, `validate_market_fields`, `validate_top_news`, `build_symbol_entry`, `build_market_entry`, `main()` fallback, snapshot `schema_version` |
| `collect/collect_brief.py` | Modify | `build_brief_prompt` JSON schema block, `validate_brief`, snapshot `schema_version` |
| `collect/test_collect_sentiment.py` | Modify | Add bilingual field tests |
| `README.md` | Modify | Rewrite in English |
| `README.ko.md` | Create | Korean version (current README content) |
| `CLAUDE_CODE_INSTRUCTIONS_layer1_revised.md` | Modify | Rewrite in English |
| `CLAUDE_CODE_INSTRUCTIONS_layer1_revised.ko.md` | Create | Korean version |
| `CLAUDE_CODE_INSTRUCTIONS_sentiment.md` | Modify | Rewrite in English |
| `CLAUDE_CODE_INSTRUCTIONS_sentiment.ko.md` | Create | Korean version |

---

## Task 1: Update schema.json to v2.0

**Files:**
- Modify: `schema.json`

- [ ] **Step 1: Read the current SymbolSentiment definition in schema.json to understand the full structure**

```bash
grep -n "key_reason\|headline\|summary\|schema_version" ~/dev/market-sentiment-data/schema.json | head -30
```

- [ ] **Step 2: Add "2.0" to the schema_version enum**

In `schema.json`, find:
```json
"schema_version": {
  "type": "string",
  "enum": ["1.0", "1.1", "1.2", "1.3", "1.4"],
  "description": "1.0: 기본. 1.1: price_context+divergence. 1.2: slot+intraday_shift. 1.3: composite_score. 1.4: top_news 추가."
},
```

Replace with:
```json
"schema_version": {
  "type": "string",
  "enum": ["1.0", "1.1", "1.2", "1.3", "1.4", "2.0"],
  "description": "1.0: 기본. 1.1: price_context+divergence. 1.2: slot+intraday_shift. 1.3: composite_score. 1.4: top_news. 2.0: bilingual _en/_ko fields."
},
```

- [ ] **Step 3: Update TopNews definition in schema.json**

Find the `TopNews` definition block (search for `"TopNews"`) and replace:
```json
"TopNews": {
  "type": "object",
  "required": ["headline", "summary", "source"],
  "properties": {
    "headline": { "type": "string" },
    "summary": { "type": "string" },
    "source": { "type": "string" }
  }
}
```
With:
```json
"TopNews": {
  "type": "object",
  "required": ["headline_en", "headline_ko", "summary_en", "summary_ko", "source"],
  "properties": {
    "headline_en": { "type": "string", "description": "Original English headline or most-shared post caption" },
    "headline_ko": { "type": "string", "description": "Korean headline or translation" },
    "summary_en": { "type": "string", "description": "1-2 sentence English summary" },
    "summary_ko": { "type": "string", "description": "1-2문장 한국어 요약" },
    "source": { "type": "string", "description": "Source handle or publication (e.g. @Bloomberg, @username)" }
  },
  "additionalProperties": false
}
```

- [ ] **Step 4: Update key_reason in SymbolSentiment and MarketSentiment definitions**

In `schema.json`, find each `"key_reason"` property under `SymbolSentiment` and `MarketSentiment` and replace with:
```json
"key_reason_en": {
  "type": "string",
  "description": "One short sentence in English summarizing crowd sentiment"
},
"key_reason_ko": {
  "type": "string",
  "description": "한국어로 한 문장 — 소셜 심리의 핵심 이유"
},
```
Also remove `"key_reason"` from the `required` arrays and add `"key_reason_en"` and `"key_reason_ko"`.

- [ ] **Step 5: Validate the JSON is still valid**

```bash
cd ~/dev/market-sentiment-data && python3 -c "import json; json.load(open('schema.json')); print('schema.json valid')"
```
Expected output: `schema.json valid`

- [ ] **Step 6: Commit**

```bash
cd ~/dev/market-sentiment-data
git add schema.json
git commit -m "feat(schema): bump to v2.0 — bilingual _en/_ko text fields"
```

---

## Task 2: Update collect_sentiment.py — prompts, validation, builders

**Files:**
- Modify: `collect_sentiment.py`

- [ ] **Step 1: Write failing tests for bilingual validation**

Add to `collect/test_collect_sentiment.py`:

```python
class TestValidateBilingualFields(unittest.TestCase):
    def test_validate_symbol_fields_accepts_bilingual(self):
        data = {
            "symbol": "TSLA",
            "sentiment": "optimistic",
            "trend_vs_yesterday": "heating",
            "mention_volume": "elevated",
            "key_reason_en": "Robotaxi enthusiasm dominates",
            "key_reason_ko": "로보택시 열광이 지배적이다",
            "bot_suspected": "no",
            "confidence": "med",
        }
        self.assertTrue(cs.validate_symbol_fields(data, "TSLA"))

    def test_validate_symbol_fields_rejects_old_key_reason(self):
        data = {
            "symbol": "TSLA",
            "sentiment": "optimistic",
            "trend_vs_yesterday": "heating",
            "mention_volume": "elevated",
            "key_reason": "old field",  # v1.x field — should fail
            "bot_suspected": "no",
            "confidence": "med",
        }
        self.assertFalse(cs.validate_symbol_fields(data, "TSLA"))

    def test_validate_top_news_accepts_bilingual(self):
        news = {
            "headline_en": "Tesla announces new model",
            "headline_ko": "테슬라 신모델 발표",
            "summary_en": "Tesla announced a new affordable model targeting mass market.",
            "summary_ko": "테슬라가 대중 시장을 겨냥한 저가형 신모델을 발표했다.",
            "source": "@elonmusk",
        }
        self.assertTrue(cs.validate_top_news(news))

    def test_validate_top_news_rejects_old_headline(self):
        news = {
            "headline": "old headline",  # v1.x — should fail
            "summary": "old summary",
            "source": "@foo",
        }
        self.assertFalse(cs.validate_top_news(news))

    def test_validate_top_news_accepts_none(self):
        self.assertTrue(cs.validate_top_news(None))

    def test_build_symbol_entry_uses_bilingual_fields(self):
        raw = {
            "sentiment": "optimistic",
            "trend_vs_yesterday": "heating",
            "mention_volume": "elevated",
            "key_reason_en": "Robotaxi enthusiasm dominates",
            "key_reason_ko": "로보택시 열광이 지배적이다",
            "bot_suspected": "no",
            "confidence": "med",
            "top_news": {
                "headline_en": "Tesla new model",
                "headline_ko": "테슬라 신모델",
                "summary_en": "Summary in English",
                "summary_ko": "한국어 요약",
                "source": "@foo",
            },
        }
        entry = cs.build_symbol_entry(raw, "TSLA", "2026-05-31T21:00:00Z", {"available": False}, "none")
        self.assertEqual(entry["key_reason_en"], "Robotaxi enthusiasm dominates")
        self.assertEqual(entry["key_reason_ko"], "로보택시 열광이 지배적이다")
        self.assertNotIn("key_reason", entry)

    def test_build_market_entry_uses_bilingual_fields(self):
        raw = {
            "sentiment": "optimistic",
            "trend_vs_yesterday": "heating",
            "extreme_flag": "none",
            "key_reason_en": "S&P 500 at record highs",
            "key_reason_ko": "S&P 500 사상 최고 기록",
            "confidence": "med",
            "top_news": None,
        }
        entry = cs.build_market_entry(raw, "2026-05-31T21:00:00Z")
        self.assertEqual(entry["key_reason_en"], "S&P 500 at record highs")
        self.assertNotIn("key_reason", entry)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ~/dev/market-sentiment-data
python -m pytest collect/test_collect_sentiment.py::TestValidateBilingualFields -v
```
Expected: All 7 tests FAIL (functions not updated yet).

- [ ] **Step 3: Update `validate_top_news` to require `_en`/`_ko` fields**

In `collect_sentiment.py`, replace:
```python
def validate_top_news(data: dict | None) -> bool:
    """top_news 구조 검증. None은 허용(optional 필드)."""
    if data is None:
        return True
    if not isinstance(data, dict):
        return False
    for field in ("headline", "summary", "source"):
        if field not in data or not isinstance(data[field], str):
            return False
    return True
```
With:
```python
def validate_top_news(data: dict | None) -> bool:
    """top_news 구조 검증. None은 허용(optional 필드). v2.0: _en/_ko 필드 필수."""
    if data is None:
        return True
    if not isinstance(data, dict):
        return False
    for field in ("headline_en", "headline_ko", "summary_en", "summary_ko", "source"):
        if field not in data or not isinstance(data[field], str):
            return False
    return True
```

- [ ] **Step 4: Update `validate_symbol_fields` to require bilingual key_reason**

Replace the `key_reason` check at the end of `validate_symbol_fields`:
```python
    if "key_reason" not in data or not isinstance(data["key_reason"], str):
        print(f"[WARN] {symbol}: key_reason 누락 또는 타입 오류", file=sys.stderr)
        return False
    return True
```
With:
```python
    for field in ("key_reason_en", "key_reason_ko"):
        if field not in data or not isinstance(data[field], str):
            print(f"[WARN] {symbol}: {field} 누락 또는 타입 오류", file=sys.stderr)
            return False
    return True
```

- [ ] **Step 5: Update `build_symbol_entry` to use bilingual fields**

Replace:
```python
    entry = {
        "symbol": symbol,
        "as_of": now_iso,
        "sentiment": sentiment,
        "sentiment_score": SENTIMENT_SCORE_MAP[sentiment],
        "trend_vs_yesterday": raw["trend_vs_yesterday"],
        "mention_volume": raw["mention_volume"],
        "key_reason": raw.get("key_reason", ""),
        "bot_suspected": raw["bot_suspected"],
        "confidence": raw["confidence"],
        "source": f"{'grok-oauth' if not HERMES_PROVIDER else HERMES_PROVIDER} via hermes",
    }
```
With:
```python
    entry = {
        "symbol": symbol,
        "as_of": now_iso,
        "sentiment": sentiment,
        "sentiment_score": SENTIMENT_SCORE_MAP[sentiment],
        "trend_vs_yesterday": raw["trend_vs_yesterday"],
        "mention_volume": raw["mention_volume"],
        "key_reason_en": raw.get("key_reason_en", ""),
        "key_reason_ko": raw.get("key_reason_ko", ""),
        "bot_suspected": raw["bot_suspected"],
        "confidence": raw["confidence"],
        "source": f"{'grok-oauth' if not HERMES_PROVIDER else HERMES_PROVIDER} via hermes",
    }
```

- [ ] **Step 6: Update `build_market_entry` to use bilingual fields**

Replace:
```python
    return {
        "as_of": now_iso,
        "sentiment": sentiment,
        "sentiment_score": SENTIMENT_SCORE_MAP[sentiment],
        "trend_vs_yesterday": raw["trend_vs_yesterday"],
        "extreme_flag": raw["extreme_flag"],
        "key_reason": raw.get("key_reason", ""),
        "confidence": raw["confidence"],
        "top_news": raw.get("top_news") if validate_top_news(raw.get("top_news")) and raw.get("top_news") is not None else None,
    }
```
With:
```python
    return {
        "as_of": now_iso,
        "sentiment": sentiment,
        "sentiment_score": SENTIMENT_SCORE_MAP[sentiment],
        "trend_vs_yesterday": raw["trend_vs_yesterday"],
        "extreme_flag": raw["extreme_flag"],
        "key_reason_en": raw.get("key_reason_en", ""),
        "key_reason_ko": raw.get("key_reason_ko", ""),
        "confidence": raw["confidence"],
        "top_news": raw.get("top_news") if validate_top_news(raw.get("top_news")) and raw.get("top_news") is not None else None,
    }
```

- [ ] **Step 7: Update the fallback market_entry in `main()` to use bilingual fields**

Find:
```python
    if market_entry is None:
        market_entry = {
            "as_of": now_iso,
            "sentiment": "neutral",
            "sentiment_score": 0,
            "trend_vs_yesterday": "stable",
            "extreme_flag": "none",
            "key_reason": "시장 전체 데이터 수집 실패",
            "confidence": "low",
            "intraday_shift": None,
        }
```
Replace with:
```python
    if market_entry is None:
        market_entry = {
            "as_of": now_iso,
            "sentiment": "neutral",
            "sentiment_score": 0,
            "trend_vs_yesterday": "stable",
            "extreme_flag": "none",
            "key_reason_en": "Failed to collect market sentiment data",
            "key_reason_ko": "시장 전체 데이터 수집 실패",
            "confidence": "low",
            "intraday_shift": None,
        }
```

- [ ] **Step 8: Update snapshot schema_version to "2.0"**

In `main()`, find:
```python
    snapshot = {
        "generated_at": now_iso,
        "schema_version": "1.4",
        "slot": slot,
        "market": market_entry,
        "symbols": symbol_entries,
    }
```
Replace `"schema_version": "1.4"` with `"schema_version": "2.0"`.

- [ ] **Step 9: Update `_SYMBOL_PROMPT_BASE` JSON schema block**

Replace the `Schema (exact enums):` block inside `_SYMBOL_PROMPT_BASE`:
```python
Schema (exact enums):
{{
  "symbol": "{SYMBOL}",
  "sentiment": one of ["very_fearful","fearful","neutral","optimistic","euphoric"],
  "trend_vs_yesterday": one of ["cooling","stable","heating"],
  "mention_volume": one of ["low","normal","elevated","surging"],
  "key_reason": "one short sentence in Korean",
  "bot_suspected": one of ["yes","no","unclear"],
  "confidence": one of ["high","med","low"],
  "top_news": {{"headline": "원문 제목 또는 가장 많이 공유된 포스트 캡션", "summary": "1-2문장 한국어 요약", "source": "출처(Bloomberg/@username 등)"}} or null if no clear top story
}}
```
With:
```python
Schema (exact enums):
{{
  "symbol": "{SYMBOL}",
  "sentiment": one of ["very_fearful","fearful","neutral","optimistic","euphoric"],
  "trend_vs_yesterday": one of ["cooling","stable","heating"],
  "mention_volume": one of ["low","normal","elevated","surging"],
  "key_reason_en": "one short sentence in English",
  "key_reason_ko": "한국어로 한 문장",
  "bot_suspected": one of ["yes","no","unclear"],
  "confidence": one of ["high","med","low"],
  "top_news": {{"headline_en": "original English headline or most-shared post caption", "headline_ko": "한국어 제목 또는 번역", "summary_en": "1-2 sentence English summary", "summary_ko": "1-2문장 한국어 요약", "source": "출처(Bloomberg/@username 등)"}} or null if no clear top story
}}
```

Also update the `Rules:` block — change the top_news rule:
```
- top_news: pick the single most-shared or most-discussed news/post about this ticker. Provide headline and summary in BOTH English (headline_en, summary_en) and Korean (headline_ko, summary_ko). If nothing stands out, set it to null.
```

- [ ] **Step 10: Update `MARKET_PROMPT` JSON schema block**

Replace the schema block in `MARKET_PROMPT`:
```python
Schema (use these exact enum values):
{
  "sentiment": one of ["very_fearful","fearful","neutral","optimistic","euphoric"],
  "trend_vs_yesterday": one of ["cooling","stable","heating"],
  "extreme_flag": one of ["none","extreme_fear","extreme_greed"],
  "key_reason": "one short sentence in Korean",
  "confidence": one of ["high","med","low"],
  "top_news": {"headline": "원문 제목 또는 가장 많이 공유된 포스트 캡션", "summary": "1-2문장 한국어 요약", "source": "출처(Bloomberg/@username 등)"} or null if no clear top story
}
```
With:
```python
Schema (use these exact enum values):
{
  "sentiment": one of ["very_fearful","fearful","neutral","optimistic","euphoric"],
  "trend_vs_yesterday": one of ["cooling","stable","heating"],
  "extreme_flag": one of ["none","extreme_fear","extreme_greed"],
  "key_reason_en": "one short sentence in English",
  "key_reason_ko": "한국어로 한 문장",
  "confidence": one of ["high","med","low"],
  "top_news": {"headline_en": "original English headline", "headline_ko": "한국어 제목 또는 번역", "summary_en": "1-2 sentence English summary", "summary_ko": "1-2문장 한국어 요약", "source": "출처(Bloomberg/@username 등)"} or null if no clear top story
}
```

Update the top_news rule in `MARKET_PROMPT`:
```
- top_news: pick the single most-shared or most-discussed market news/macro post. Provide headline and summary in BOTH English and Korean. If nothing stands out, set it to null.
```

- [ ] **Step 11: Run tests to confirm they pass**

```bash
cd ~/dev/market-sentiment-data
python -m pytest collect/test_collect_sentiment.py::TestValidateBilingualFields -v
```
Expected: All 7 tests PASS.

- [ ] **Step 12: Run full test suite to confirm no regressions**

```bash
cd ~/dev/market-sentiment-data
python -m pytest collect/test_collect_sentiment.py -v
```
Expected: All tests PASS.

- [ ] **Step 13: Commit**

```bash
cd ~/dev/market-sentiment-data
git add collect_sentiment.py collect/test_collect_sentiment.py
git commit -m "feat: bilingual _en/_ko fields in sentiment pipeline (schema v2.0)"
```

---

## Task 3: Update collect_brief.py — prompts and validation

**Files:**
- Modify: `collect/collect_brief.py`

- [ ] **Step 1: Update `build_brief_prompt` JSON schema block**

In `collect/collect_brief.py`, inside `build_brief_prompt`, replace the JSON schema string that says:
```python
f"""...
Generate ONE JSON object with this EXACT schema (no prose, no code fences):
{{
  "market_brief": {{
    "summary": "시장 전체 한 문장 요약 (한국어, 30자 이내)",
    "tone": "one of bullish/cautious/bearish/neutral",
    "key_themes": ["테마1", "테마2"],
    "watch_points": "오늘 주의할 점 한 문장 (한국어)"
  }},
  "symbol_briefs": [
    {{
      "symbol": "TICKER",
      "setup_quality": "one of A+/A/B/C/D",
      "brief": "2-3문장 설명 (한국어)",
      "key_risk": "핵심 리스크 한 줄 (한국어)",
      "key_opportunity": "핵심 기회 한 줄 (한국어)",
      "action_bias": "one of buy/hold/watch/avoid"
    }}
  ]
}}
..."""
```
With:
```python
f"""...
Generate ONE JSON object with this EXACT schema (no prose, no code fences):
{{
  "market_brief": {{
    "summary_en": "One-sentence market summary in English",
    "summary_ko": "시장 전체 한 문장 요약 (한국어, 30자 이내)",
    "tone": "one of bullish/cautious/bearish/neutral",
    "key_themes_en": ["theme1", "theme2"],
    "key_themes_ko": ["테마1", "테마2"],
    "watch_points_en": "Key thing to watch today in one sentence",
    "watch_points_ko": "오늘 주의할 점 한 문장 (한국어)"
  }},
  "symbol_briefs": [
    {{
      "symbol": "TICKER",
      "setup_quality": "one of A+/A/B/C/D",
      "brief_en": "2-3 sentence analysis in English",
      "brief_ko": "2-3문장 설명 (한국어)",
      "key_risk_en": "Key risk in one line",
      "key_risk_ko": "핵심 리스크 한 줄 (한국어)",
      "key_opportunity_en": "Key opportunity in one line",
      "key_opportunity_ko": "핵심 기회 한 줄 (한국어)",
      "action_bias": "one of buy/hold/watch/avoid"
    }}
  ]
}}
..."""
```

- [ ] **Step 2: Update `validate_brief` to check bilingual fields**

Find `validate_brief` and update the `market_brief` checks:
```python
def validate_brief(data: dict) -> bool:
    mb = data.get("market_brief")
    if not isinstance(mb, dict):
        print("[WARN] market_brief 누락", file=sys.stderr)
        return False
    if mb.get("tone") not in VALID_TONES:
        print(f"[WARN] tone={mb.get('tone')!r} 허용값 아님", file=sys.stderr)
        return False
    if not isinstance(mb.get("key_themes_en"), list) or len(mb["key_themes_en"]) == 0:
        print("[WARN] key_themes_en 누락 또는 빈 배열", file=sys.stderr)
        return False
    if not isinstance(mb.get("key_themes_ko"), list) or len(mb["key_themes_ko"]) == 0:
        print("[WARN] key_themes_ko 누락 또는 빈 배열", file=sys.stderr)
        return False
    for field in ("summary_en", "summary_ko", "watch_points_en", "watch_points_ko"):
        if not isinstance(mb.get(field), str) or not mb[field]:
            print(f"[WARN] market_brief.{field} 누락", file=sys.stderr)
            return False
    sbs = data.get("symbol_briefs")
    if not isinstance(sbs, list) or len(sbs) == 0:
        print("[WARN] symbol_briefs 누락 또는 빈 배열", file=sys.stderr)
        return False
    for sb in sbs:
        if sb.get("setup_quality") not in VALID_SETUP_QUALITY:
            print(f"[WARN] setup_quality={sb.get('setup_quality')!r}", file=sys.stderr)
            return False
        if sb.get("action_bias") not in VALID_ACTION_BIAS:
            print(f"[WARN] action_bias={sb.get('action_bias')!r}", file=sys.stderr)
            return False
        for field in ("brief_en", "brief_ko", "key_risk_en", "key_risk_ko", "key_opportunity_en", "key_opportunity_ko"):
            if not isinstance(sb.get(field), str) or not sb[field]:
                print(f"[WARN] symbol_brief.{field} 누락", file=sys.stderr)
                return False
    return True
```

- [ ] **Step 3: Update snapshot schema_version to "2.0" in `main()`**

Find in `collect/collect_brief.py`:
```python
    snapshot = {
        "generated_at": now_iso,
        "schema_version": "1.0",
        "slot": slot,
        "market_brief": parsed["market_brief"],
        "symbol_briefs": parsed["symbol_briefs"],
        "context": context_snapshot,
    }
```
Change `"schema_version": "1.0"` to `"schema_version": "2.0"`.

- [ ] **Step 4: Add a brief validation test**

Create `collect/test_collect_brief.py`:

```python
"""
collect_brief 검증 함수 단위 테스트
python -m pytest collect/test_collect_brief.py -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from collect.collect_brief import validate_brief


class TestValidateBriefBilingual(unittest.TestCase):
    def _valid_brief(self):
        return {
            "market_brief": {
                "summary_en": "Market holds constructive regime despite distribution pressure.",
                "summary_ko": "분배 압력에도 불구하고 시장은 건설적 체제를 유지 중.",
                "tone": "cautious",
                "key_themes_en": ["AI infrastructure", "Big tech growth"],
                "key_themes_ko": ["AI 인프라", "빅테크 성장"],
                "watch_points_en": "SPY at 4 distribution days — watch for a 5th.",
                "watch_points_ko": "SPY 분배일 4일 — 5일째 주의.",
            },
            "symbol_briefs": [
                {
                    "symbol": "TSLA",
                    "setup_quality": "A",
                    "brief_en": "Stage2 6/7 with UPTREND structure. Robotaxi enthusiasm drives optimistic social sentiment.",
                    "brief_ko": "Stage2 6/7에 UPTREND 구조 유지. 로보택시 열광으로 소셜 낙관적.",
                    "key_risk_en": "RS 45.1 suggests underperformance vs. market.",
                    "key_risk_ko": "RS 45.1로 시장 대비 약세 가능성.",
                    "key_opportunity_en": "Robotaxi event momentum.",
                    "key_opportunity_ko": "로보택시 이벤트 모멘텀 기대.",
                    "action_bias": "watch",
                }
            ],
        }

    def test_valid_bilingual_brief_passes(self):
        import unittest
        self.assertTrue(validate_brief(self._valid_brief()))

    def test_missing_summary_en_fails(self):
        brief = self._valid_brief()
        del brief["market_brief"]["summary_en"]
        self.assertFalse(validate_brief(brief))

    def test_missing_brief_ko_fails(self):
        brief = self._valid_brief()
        del brief["symbol_briefs"][0]["brief_ko"]
        self.assertFalse(validate_brief(brief))

    def test_old_summary_field_fails(self):
        brief = self._valid_brief()
        del brief["market_brief"]["summary_en"]
        del brief["market_brief"]["summary_ko"]
        brief["market_brief"]["summary"] = "old field"  # v1.x field
        self.assertFalse(validate_brief(brief))


import unittest
if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 5: Run tests**

```bash
cd ~/dev/market-sentiment-data
python -m pytest collect/test_collect_brief.py -v
```
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd ~/dev/market-sentiment-data
git add collect/collect_brief.py collect/test_collect_brief.py
git commit -m "feat: bilingual _en/_ko fields in brief pipeline (schema v2.0)"
```

---

## Task 4: Documentation — bilingual split

**Files:**
- Modify: `README.md` (rewrite in English)
- Create: `README.ko.md` (Korean)
- Modify: `CLAUDE_CODE_INSTRUCTIONS_layer1_revised.md` (rewrite in English)
- Create: `CLAUDE_CODE_INSTRUCTIONS_layer1_revised.ko.md` (Korean)
- Modify: `CLAUDE_CODE_INSTRUCTIONS_sentiment.md` (rewrite in English)
- Create: `CLAUDE_CODE_INSTRUCTIONS_sentiment.ko.md` (Korean)

- [ ] **Step 1: Copy current README.md to README.ko.md**

```bash
cd ~/dev/market-sentiment-data
cp README.md README.ko.md
```

- [ ] **Step 2: Add cross-link header to README.ko.md**

At the very top of `README.ko.md`, add:
```markdown
> English docs: [README.md](./README.md)

```

- [ ] **Step 3: Rewrite README.md in English**

Replace the entire content of `README.md` with the English translation. Structure matches the Korean version exactly — same sections, same information. Add the cross-link at the top:

```markdown
> 한국어 문서: [README.ko.md](./README.ko.md)

# market-sentiment-data

Layer 2 — **shared data repository** for SniperBoard's social sentiment pipeline.

Collects social sentiment data from X (Twitter) via Hermes + Grok on a Mac mini cron job, stored in standard JSON format.
Any consuming program — including SniperBoard — only needs the raw GitHub URL.

---

## Repository Structure

```
market-sentiment-data/
├── README.md              # This document (English)
├── README.ko.md           # Korean version
├── schema.json            # Data contract (JSON Schema draft-07, v2.0)
├── latest.json            # Most recent snapshot — primary file consumers read
├── history/
│   ├── 2026-05-21_pre_open.json    # Pre-open slot (13:00 UTC)
│   ├── 2026-05-21_post_close.json  # Post-close slot (21:00 UTC)
│   └── ...
├── brief/
│   ├── latest.json             # AI Daily Brief latest snapshot
│   └── history/               # YYYY-MM-DD_<slot>.json
└── earnings/
    ├── latest.json             # Earnings Intelligence latest
    └── history/               # YYYY-MM-DD.json
```

- **`latest.json`**: Overwritten on every cron run. Always current.
- **`history/YYYY-MM-DD_pre_open.json`**: Pre-US-open snapshot (13:00 UTC).
- **`history/YYYY-MM-DD_post_close.json`**: Post-US-close snapshot (21:00 UTC). Includes `intraday_shift`.
- **`history/YYYY-MM-DD.json`**: Legacy pre-v1.2 files. Preserved for consumer fallback.

> **Schema version history:** 1.0 base | 1.1 price_context+divergence | 1.2 slot+intraday_shift | 1.3 composite_score | 1.4 top_news | **2.0 bilingual _en/_ko fields (current)**

---

## Consuming from Other Programs

### Public repo (no auth required)

```bash
curl https://raw.githubusercontent.com/<user>/market-sentiment-data/main/latest.json
```

### Private repo (PAT token required)

```bash
export SENTIMENT_DATA_TOKEN="github_pat_xxxx"
curl -H "Authorization: token $SENTIMENT_DATA_TOKEN" \
     https://raw.githubusercontent.com/<user>/market-sentiment-data/main/latest.json
```

> **Never hardcode tokens in source code or images.** Inject via docker-compose env or cron environment.

---

## Schema v2.0 Summary

See `schema.json` for full spec. Key enums:

| Field | Allowed values |
|-------|---------------|
| `sentiment` | `very_fearful` `fearful` `neutral` `optimistic` `euphoric` |
| `trend_vs_yesterday` | `cooling` `stable` `heating` |
| `mention_volume` | `low` `normal` `elevated` `surging` |
| `confidence` | `high` `med` `low` |
| `slot` | `pre_open` `post_close` |

**Bilingual text fields (v2.0):** All AI-generated human-readable text uses `_en`/`_ko` suffix pairs:
- `key_reason_en` / `key_reason_ko`
- `top_news.headline_en` / `top_news.headline_ko`
- `top_news.summary_en` / `top_news.summary_ko`
- Brief fields: `summary_en/ko`, `watch_points_en/ko`, `brief_en/ko`, `key_risk_en/ko`, `key_opportunity_en/ko`
```

- [ ] **Step 4: Copy and translate CLAUDE_CODE_INSTRUCTIONS files**

```bash
cd ~/dev/market-sentiment-data
cp CLAUDE_CODE_INSTRUCTIONS_layer1_revised.md CLAUDE_CODE_INSTRUCTIONS_layer1_revised.ko.md
cp CLAUDE_CODE_INSTRUCTIONS_sentiment.md CLAUDE_CODE_INSTRUCTIONS_sentiment.ko.md
```

Add `> English docs: [CLAUDE_CODE_INSTRUCTIONS_layer1_revised.md](./CLAUDE_CODE_INSTRUCTIONS_layer1_revised.md)` to the top of each `.ko.md` file.

Then rewrite each `.md` (non-ko) file in English — same content as the Korean version but translated, with `> 한국어 문서: [filename.ko.md](./filename.ko.md)` at the top.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/market-sentiment-data
git add README.md README.ko.md \
  CLAUDE_CODE_INSTRUCTIONS_layer1_revised.md CLAUDE_CODE_INSTRUCTIONS_layer1_revised.ko.md \
  CLAUDE_CODE_INSTRUCTIONS_sentiment.md CLAUDE_CODE_INSTRUCTIONS_sentiment.ko.md
git commit -m "docs: bilingual split — README and CLAUDE instructions (EN primary, KO secondary)"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| schema_version bump to 2.0 | Task 1 |
| key_reason_en/ko in market + symbols | Task 2 Steps 4-10 |
| top_news headline_en/ko + summary_en/ko | Task 2 Steps 3, 9-10 |
| brief: summary/watch_points/key_themes en/ko | Task 3 Steps 1-2 |
| brief: brief/key_risk/key_opportunity en/ko | Task 3 Steps 1-2 |
| Tests for bilingual validation | Tasks 2, 3 |
| README.md (EN) + README.ko.md (KO) | Task 4 |
| CLAUDE instructions bilingual split | Task 4 |
