"""Phase B1/B2 — mechanical briefing integrity (real verify entry)."""
from datetime import date
from pathlib import Path

from core.briefing_verify import (
    check_day_window_fitness,
    check_false_catalyst_attribution,
    check_theme_recurrence,
    gate_result_for_promotion,
    scan_briefing_artifacts,
    verify_briefing_integrity,
)


def test_good_briefing_passes():
    briefing = {
        "earnings_alert_ko": "TSM 7월 16일 실적 (3일 후 발표)",
        "watchlist": [
            {
                "symbol": "TSM",
                "sentiment_mood": "cautious",
                "analysis_ko": "$421.58에서 -1.20% 하락. Stage2 양호.",
            }
        ],
    }
    cal = [{"symbol": "TSM", "earnings_date": "2026-07-16"}]
    prices = {"TSM": 421.58}
    r = verify_briefing_integrity(
        briefing,
        upcoming_earnings=cal,
        price_table=prices,
        as_of=date(2026, 7, 13),
    )
    assert r.passed is True
    assert gate_result_for_promotion(r) is True


def test_bad_already_reported_fails():
    briefing = {
        "earnings_alert_ko": "TSM 오늘 미국 장 마감 후 실적 발표됨",
        "watchlist": [],
    }
    r = verify_briefing_integrity(
        briefing,
        upcoming_earnings=[{"symbol": "TSM", "earnings_date": "2026-07-16"}],
        as_of=date(2026, 7, 13),
    )
    assert r.passed is False
    assert any(i.code == "B1-rel-already" for i in r.issues)
    assert gate_result_for_promotion(r) is False


def test_bad_relative_day_fails():
    briefing = {
        "today_checkpoints_ko": ["TSM 1일 후 실적 주시"],  # live = 3 → off by 2
        "watchlist": [],
    }
    r = verify_briefing_integrity(
        briefing,
        upcoming_earnings=[{"symbol": "TSM", "earnings_date": "2026-07-16"}],
        as_of=date(2026, 7, 13),  # true days = 3
    )
    assert r.passed is False
    assert any(i.code == "B1-rel-day" for i in r.issues)


def test_mood_vs_drop_fails():
    briefing = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "sentiment_mood": "optimistic",
                "analysis_ko": "$203.53에서 -3.52% 하락 후 관망.",
            }
        ],
    }
    r = verify_briefing_integrity(briefing, as_of=date(2026, 7, 13))
    assert r.passed is False
    assert any(i.code == "B1-mood-drop" for i in r.issues)


def test_price_binding_fails():
    briefing = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "sentiment_mood": "neutral",
                "analysis_ko": "NVDA $999.00 돌파 시도",
            }
        ],
    }
    r = verify_briefing_integrity(
        briefing,
        price_table={"NVDA": 203.53},
        as_of=date(2026, 7, 13),
    )
    assert r.passed is False
    assert any(i.code == "B1-price-bind" for i in r.issues)


def test_price_binding_within_tolerance_passes():
    briefing = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "sentiment_mood": "neutral",
                "analysis_ko": "NVDA $205.00 부근",
            }
        ],
    }
    r = verify_briefing_integrity(
        briefing,
        price_table={"NVDA": 203.53},
        as_of=date(2026, 7, 13),
    )
    # 205 vs 203.53 ~0.7% < 3%
    assert r.passed is True


def test_serve_path_uses_watchlist_price_table():
    """Shipped morning_briefing_service._price_table_for_verify must feed B1 price binding."""
    from services.morning_briefing_service import _attach_integrity_verify, _price_table_for_verify

    data = {
        "watchlist": [
            {
                "symbol": "NVDA",
                "price": 200.0,
                "sentiment_mood": "neutral",
                "analysis_ko": "NVDA $999.00 돌파",
            }
        ],
        "_earnings_calendar": [],
    }
    table = _price_table_for_verify(data)
    assert table.get("NVDA") == 200.0
    out = _attach_integrity_verify(data)
    assert out.get("integrity_passed") is False
    codes = [i["code"] for i in (out.get("integrity") or {}).get("issues") or []]
    assert "B1-price-bind" in codes


def _pltr_false_catalyst_payload() -> dict:
    """Fixture derived from real 2026-08-03 briefing pattern (PLTR/chip misbind)."""
    return {
        "headline_en": "Chip export thaw and PLTR post-earnings surge set risk-on tone",
        "headline_ko": "칩 수출 규제 완화에 PLTR 급등",
        "executive_bullets_en": [
            "Risk-on regime at 84.9",
            "CRWD stands out",
            "Hormuz tanker restrictions remain developing risks",
        ],
        "executive_bullets_ko": [
            "리스크온 구간 84.9점",
            "CRWD 강세",
            "호르무즈 통항 제한이 변수",
        ],
        "spotlight": [
            {
                "symbol": "PLTR",
                "why_en": (
                    "PLTR jumped 2.10% to close at $125.65 with post-market surge "
                    "to $140.64 (+11.93%). Earnings reaction strong."
                ),
                "why_ko": "장 마감 후 $140.64(+11.93%)까지 급등. 실적 반응.",
            }
        ],
        "watchlist": [
            {
                "symbol": "PLTR",
                "sentiment_mood": "euphoric",
                "analysis_en": (
                    "PLTR closed at $125.65, up 2.10%. post-market surged to "
                    "$140.64 (+11.93%). Euphoric on earnings beat and guidance raise."
                ),
                "analysis_ko": "장 마감 후 $140.64(+11.93%) 급등. 실적 상회.",
                "action": "avoid",
            }
        ],
        "earnings_alert_en": "[PLTR] earnings 2026-08-04",
        "earnings_alert_ko": "[PLTR] 실적 2026-08-04",
        "global_context": {
            "issues": [
                {
                    "category": "trade_tariff",
                    "tier": "ongoing",
                    "direction": "stable_elevated",
                    "title_en": "US-China chip export controls shift to case-by-case licensing",
                    "title_ko": "미중 반도체 수출통제, 사례별 허가로 전환",
                    "asymmetric_impact_en": (
                        "NVDA: positive on approval news; TSM: positive; "
                        "MU: positive (memory export thaw); PLTR: unaffected"
                    ),
                    "asymmetric_impact_ko": (
                        "NVDA: 상방; TSM: 상방; MU: 상방; PLTR: 영향 없음"
                    ),
                }
            ]
        },
    }


def test_false_catalyst_pltr_chip_export_fails():
    """Historical PLTR pattern is a fixture only — logic must not special-case PLTR."""
    briefing = _pltr_false_catalyst_payload()
    issues = check_false_catalyst_attribution(briefing)
    assert any(i.code == "B2-false-catalyst" for i in issues)
    r = verify_briefing_integrity(briefing, as_of=date(2026, 8, 3))
    assert r.passed is False
    assert any(i.code == "B2-false-catalyst" for i in r.issues)
    assert gate_result_for_promotion(r) is False


def test_false_catalyst_is_ticker_agnostic():
    """Same structural contradiction with an arbitrary ticker/theme still fails (no allowlist)."""
    briefing = {
        "headline_en": "Export licensing thaw lifts ABC into the open",
        "headline_ko": "수출 허가 완화에 ABC 급등",
        "spotlight": [
            {
                "symbol": "ABC",
                "why_en": "post-market surge to $50 (+12.5%). earnings beat.",
            }
        ],
        "watchlist": [
            {
                "symbol": "ABC",
                "sentiment_mood": "euphoric",
                "analysis_en": "post-market surged to $50 (+12.5%). earnings beat.",
            }
        ],
        "earnings_alert_en": "[ABC] earnings 2026-08-04",
        "global_context": {
            "issues": [
                {
                    "category": "trade_tariff",
                    "title_en": "Export licensing rules shift case-by-case",
                    "title_ko": "수출 허가 규정 사례별 전환",
                    "summary_en": "Policy update on export licenses",
                    "asymmetric_impact_en": "NVDA: positive; ABC: unaffected",
                    "asymmetric_impact_ko": "ABC: 영향 없음",
                }
            ]
        },
    }
    issues = check_false_catalyst_attribution(briefing)
    assert any(i.code == "B2-false-catalyst" and "ABC" in i.message for i in issues)
    # Guard: shipped verifier code (comments stripped) has no ticker/theme allowlists
    import re
    import core.briefing_verify as bv
    src = Path(bv.__file__).read_text(encoding="utf-8")
    code = re.sub(r'"""[\s\S]*?"""', "", src)
    code = re.sub(r"'''[\s\S]*?'''", "", code)
    code = re.sub(r"#.*", "", code)
    for banned in (
        "PLTR", "Hormuz", "호르무즈", "chip export", "반도체 수출",
        "_CATEGORY_THEME_KW",
    ):
        assert banned not in code, f"hard-coded theme/ticker residue in verifier: {banned}"


def test_corrected_headline_passes_false_catalyst():
    """Corrected primary catalyst (earnings/post) with no false theme bind passes B2-false-catalyst."""
    briefing = _pltr_false_catalyst_payload()
    briefing["headline_en"] = "PLTR post-earnings surge +11.9% sets risk-on tone for software"
    briefing["headline_ko"] = "PLTR 실적 애프터 급등 시장 주도"
    issues = check_false_catalyst_attribution(briefing)
    assert not any(i.code == "B2-false-catalyst" for i in issues)
    r = verify_briefing_integrity(briefing, as_of=date(2026, 8, 3))
    # May still have day-window warns only — no fail from false-catalyst
    assert not any(i.code == "B2-false-catalyst" for i in r.issues)
    fails = [i for i in r.issues if i.severity == "fail"]
    assert fails == []
    assert r.passed is True


def test_theme_recurrence_flags_multi_day_clone_categories():
    """History of same-category issues must produce B2-theme-recurrence via shipped function."""
    def day(cat_title: str) -> dict:
        return {
            "global_context": {
                "issues": [
                    {
                        "category": "geopolitical",
                        "tier": "ongoing",
                        "direction": "stable_elevated",
                        "title_en": cat_title,
                        "title_ko": "호르무즈 해협 리스크 지속",
                    }
                ]
            }
        }

    history = [
        day("Iran Strait of Hormuz tanker traffic remains restricted"),
        day("Hormuz tanker lanes remain restricted amid Iran naval presence"),
        day("Strait of Hormuz traffic remains limited by Iran activity"),
        day("Iran Hormuz restrictions remain elevated for tankers"),
        day("Hormuz strait tanker traffic remains constrained"),
    ]
    current = {
        "headline_en": "Chip curbs and Hormuz risks linger while VIX stays calm",
        "headline_ko": "칩 규제·호르무즈 리스크 지속 속 VIX 유지",
        "global_context": {
            "issues": [
                {
                    "category": "geopolitical",
                    "tier": "ongoing",
                    "direction": "stable_elevated",
                    "title_en": "Iran Strait of Hormuz tanker traffic remains restricted",
                    "title_ko": "이란 호르무즈 해협 유조선 통행 제한 지속",
                },
                {
                    "category": "trade_tariff",
                    "tier": "ongoing",
                    "direction": "stable_elevated",
                    "title_en": "US-China chip export controls ongoing",
                    "title_ko": "미중 반도체 수출 규제 지속",
                },
            ]
        },
    }
    issues = check_theme_recurrence(current, history, min_streak=5)
    assert any(i.code == "B2-theme-recurrence" for i in issues)
    # Headline owns recurring Hormuz → severity fail path when streak high
    assert any(
        i.code == "B2-theme-recurrence" and i.severity == "fail" for i in issues
    )
    r = verify_briefing_integrity(current, history=history, as_of=date(2026, 8, 3))
    assert r.passed is False
    assert any(i.code == "B2-theme-recurrence" for i in r.issues)


def test_day_window_warns_on_evergreen_headline():
    briefing = {
        "headline_en": "Chip curbs and Hormuz risks linger as macro backdrop",
        "headline_ko": "칩·호르무즈 리스크 지속",
        "executive_bullets_en": [
            "Geopolitical risks remain ongoing",
            "Policy uncertainty continues to overhang",
        ],
        "executive_bullets_ko": ["지정학 리스크 지속", "정책 불확실성 여전"],
        "watchlist": [],
    }
    issues = check_day_window_fitness(briefing)
    assert any(i.code == "B2-day-window" for i in issues)
    r = verify_briefing_integrity(briefing, as_of=date(2026, 8, 3))
    # day-window alone is warn — does not fail promotion unless other fails
    assert any(i.code == "B2-day-window" for i in r.issues)
    assert all(i.severity == "warn" for i in r.issues if i.code == "B2-day-window")


def test_scan_briefing_artifacts_machine_readable():
    briefing = _pltr_false_catalyst_payload()
    rep = scan_briefing_artifacts(briefing, history=None, as_of=date(2026, 8, 3))
    assert rep["passed"] is False
    assert rep["flags"]["false_catalyst"] is True
    assert "B2-false-catalyst" in rep["codes"]
    assert isinstance(rep["issues"], list)
