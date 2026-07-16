"""P2+ source citation resolvers — pure, no invented article IDs."""
from core.source_citations import (
    enrich_briefing_citations,
    enrich_global_issue,
    enrich_top_news,
    extract_handles,
    resolve_source_hint,
)


def test_empty_hint():
    r = resolve_source_hint(None)
    assert r["kind"] == "empty"
    assert r["urls"] == []


def test_direct_url_passthrough():
    r = resolve_source_hint("https://www.reuters.com/world/example")
    assert r["kind"] == "url"
    assert r["urls"][0].startswith("https://www.reuters.com/")


def test_x_handle():
    r = resolve_source_hint("@dnystedt @RanjitAlpha")
    assert r["kind"] == "x_handle"
    assert "https://x.com/dnystedt" in r["urls"]
    assert "https://x.com/RanjitAlpha" in r["urls"]


def test_reuters_search_not_fake_article():
    r = resolve_source_hint(
        "Reuters 2026-07-10 / BIS licensing update",
        title="US-China chip export controls",
    )
    assert r["kind"] == "outlet_search"
    assert r["outlet"] == "Reuters"
    assert any("reuters.com" in u for u in r["urls"])
    assert any("news.google.com" in u for u in r["urls"])
    # Must NOT invent a single article path like /article/2026/...
    assert not any("/article/" in u for u in r["urls"])


def test_extract_handles():
    assert extract_handles("via @Foo_bar and @x") == ["Foo_bar", "x"]


def test_enrich_global_issue_adds_source_urls():
    issue = {
        "rank": 1,
        "source_hint": "Bloomberg 2026-07-01 / rates",
        "title_en": "Fed hold",
    }
    out = enrich_global_issue(issue)
    assert out["source_urls"]
    assert out["source_resolved"]["kind"] == "outlet_search"
    assert "source_hint" in out  # original preserved


def test_enrich_briefing_walk():
    data = {
        "global_context": {
            "issues": [{"rank": 1, "source_hint": "Reuters 2026-01-01", "title_en": "A"}],
        }
    }
    out = enrich_briefing_citations(data)
    urls = out["global_context"]["issues"][0]["source_urls"]
    assert urls and urls[0].startswith("http")


def test_enrich_top_news_handles():
    tn = enrich_top_news({"headline_en": "Hi", "source": "@alpha"})
    assert tn["source_urls"] == ["https://x.com/alpha"]
