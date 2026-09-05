"""US macro calendar normalize — CPI / FOMC / NFP-class filter."""
from core.calendar_normalize import normalize_calendar_events, is_macro_class


def test_is_macro_class_keywords():
    assert is_macro_class("CPI m/m") is True
    assert is_macro_class("Non-Farm Payrolls") is True
    assert is_macro_class("FOMC Rate Decision") is True
    assert is_macro_class("Federal Funds Rate") is True
    assert is_macro_class("Unemployment Rate") is True
    assert is_macro_class("German IFO") is False
    assert is_macro_class("Existing Home Sales") is False


def test_normalize_keeps_us_high_impact_macro():
    raw = [
        {"date": "2026-09-10", "time": "08:30", "country": "USD", "title": "CPI m/m",
         "impact": "High", "forecast": "0.2%", "previous": "0.1%"},
        {"date": "2026-09-10", "time": "02:00", "country": "EUR", "title": "CPI m/m",
         "impact": "High", "forecast": "", "previous": ""},
        {"date": "2026-09-11", "time": "08:30", "country": "USD", "title": "Existing Home Sales",
         "impact": "High", "forecast": "", "previous": ""},
        {"date": "2026-09-12", "time": "14:00", "country": "USD", "title": "FOMC Rate Decision",
         "impact": "High", "forecast": "4.50%", "previous": "4.50%"},
    ]
    out = normalize_calendar_events(raw)
    titles = [e["event"] for e in out]
    assert "CPI m/m" in titles
    assert "FOMC Rate Decision" in titles
    assert "Existing Home Sales" not in titles
    assert all(e["country"] in ("USD", "US") for e in out)
    assert all("date" in e and "impact" in e for e in out)


def test_normalize_empty_and_garbage():
    assert normalize_calendar_events([]) == []
    assert normalize_calendar_events([{"foo": 1}]) == []
