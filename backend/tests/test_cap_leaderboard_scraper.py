"""
스크래핑 파서 단위 테스트. 실제 네트워크 없이 HTML 픽스처로 검증.
"""
import pytest
from unittest.mock import patch, MagicMock


# ── _parse_* 헬퍼 테스트 ──────────────────────────────────────────────────────

from services.cap_leaderboard_service import (
    _parse_market_cap,
    _parse_price,
    _parse_change,
    _market_structure,
    _scrape_global_rankings,
    _LEADERBOARD_SIZE,
)


def test_parse_market_cap_trillion():
    assert _parse_market_cap("$5.145 T") == pytest.approx(5.145e12)


def test_parse_market_cap_billion():
    assert _parse_market_cap("$250.3 B") == pytest.approx(250.3e9)


def test_parse_market_cap_million():
    assert _parse_market_cap("$800 M") == pytest.approx(800e6)


def test_parse_price():
    assert _parse_price("$212.45") == pytest.approx(212.45)


def test_parse_price_with_comma():
    assert _parse_price("$1,234.56") == pytest.approx(1234.56)


def test_parse_change_positive():
    assert _parse_change("3.54%") == pytest.approx(3.54)


def test_parse_change_negative():
    assert _parse_change("-1.20%") == pytest.approx(-1.20)


# ── _market_structure 테스트 ──────────────────────────────────────────────────

def test_market_structure_uptrend():
    closes = [100.0] * 50
    assert _market_structure(105.0, closes) == "UPTREND"


def test_market_structure_downtrend():
    closes = [100.0] * 50
    assert _market_structure(95.0, closes) == "DOWNTREND"


def test_market_structure_neutral():
    closes = [100.0] * 50
    assert _market_structure(101.0, closes) == "NEUTRAL"


def test_market_structure_insufficient_data():
    assert _market_structure(100.0, [100.0] * 10) == "NEUTRAL"


# ── _scrape_global_rankings HTML 픽스처 테스트 ───────────────────────────────

SAMPLE_HTML = """
<html><body><table>
<thead><tr><th></th><th>#</th><th>Name</th><th>Market Cap</th><th>Price</th><th>Change</th><th></th><th>Country</th></tr></thead>
<tbody>
<tr>
  <td></td><td>1</td>
  <td class="name-td"><div class="logo-container"></div>
    <div class="name-div"><a href="/nvidia/">
      <div class="company-name">NVIDIA</div>
      <div class="company-code"><span class="rank d-none"></span>NVDA</div>
    </a></div></td>
  <td>$5.145 T</td><td>$212.45</td><td>3.54%</td><td></td><td>🇺🇸USA</td>
</tr>
<tr>
  <td></td><td>2</td>
  <td class="name-td"><div class="logo-container"></div>
    <div class="name-div"><a href="/apple/">
      <div class="company-name">Apple</div>
      <div class="company-code"><span class="rank d-none"></span>AAPL</div>
    </a></div></td>
  <td>$4.353 T</td><td>$296.42</td><td>1.82%</td><td></td><td>🇺🇸USA</td>
</tr>
<tr>
  <td></td><td>3</td>
  <td class="name-td"><div class="logo-container"></div>
    <div class="name-div"><a href="/spacex/">
      <div class="company-name">SpaceX</div>
      <div class="company-code"><span class="rank d-none"></span>SPCX</div>
    </a></div></td>
  <td>$2.500 T</td><td>$185.00</td><td>-0.50%</td><td></td><td>🇺🇸USA</td>
</tr>
</tbody>
</table></body></html>
"""


def test_scrape_parses_rows():
    mock_resp = MagicMock()
    mock_resp.text = SAMPLE_HTML
    mock_resp.raise_for_status = MagicMock()

    with patch("services.cap_leaderboard_service.requests.get", return_value=mock_resp):
        rows = _scrape_global_rankings()

    assert len(rows) == 3
    assert rows[0]["symbol"] == "NVDA"
    assert rows[0]["rank"] == 1
    assert rows[0]["market_cap"] == pytest.approx(5.145e12)
    assert rows[0]["price"] == pytest.approx(212.45)
    assert rows[0]["change_pct_1d"] == pytest.approx(3.54)
    assert rows[0]["company_name"] == "NVIDIA"


def test_scrape_includes_spcx():
    mock_resp = MagicMock()
    mock_resp.text = SAMPLE_HTML
    mock_resp.raise_for_status = MagicMock()

    with patch("services.cap_leaderboard_service.requests.get", return_value=mock_resp):
        rows = _scrape_global_rankings()

    symbols = [r["symbol"] for r in rows]
    assert "SPCX" in symbols
    spcx = next(r for r in rows if r["symbol"] == "SPCX")
    assert spcx["change_pct_1d"] == pytest.approx(-0.50)
