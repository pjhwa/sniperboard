import asyncio
import json

import httpx
import pytest

from mcp_server.client import call_tool, SniperBoardAPIError
from mcp_server.tool_registry import TOOLS_BY_NAME


def _client_with(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url="http://test/api", transport=httpx.MockTransport(handler))


def test_get_tool_sends_query_params_and_returns_body_text():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/api/daily"
        assert request.url.params["symbol"] == "AAPL"
        return httpx.Response(200, json={"symbol": "AAPL", "stage2": {"score": 6}})

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["get_daily"]
            text = await call_tool(client, tool, {"symbol": "AAPL"})
            assert json.loads(text) == {"symbol": "AAPL", "stage2": {"score": 6}}

    asyncio.run(run())


def test_get_tool_with_no_params_sends_no_query_string():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/api/watchlist"
        assert request.url.query == b""
        return httpx.Response(200, json={"watchlist": []})

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["get_watchlist"]
            text = await call_tool(client, tool, {})
            assert json.loads(text) == {"watchlist": []}

    asyncio.run(run())


def test_post_tool_sends_bare_list_body_and_routes_rest_to_query():
    # FastAPI's `symbols: Optional[List[str]] = None` (no Body(embed=True)) expects the
    # bare JSON list as the request body, NOT {"symbols": [...]}. Verified empirically
    # against a FastAPI TestClient with the same signature as backend/api/endpoints.py's
    # run_backtest_endpoint: POST with json=["AAPL"] -> 200; json={"symbols": ["AAPL"]} -> 422.
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/api/backtest/run"
        assert json.loads(request.content) == ["AAPL", "MSFT"]
        assert request.url.params["threshold"] == "6"
        return httpx.Response(200, json={"status": "ok"})

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["run_backtest"]
            text = await call_tool(client, tool, {"symbols": ["AAPL", "MSFT"], "threshold": 6})
            assert json.loads(text) == {"status": "ok"}

    asyncio.run(run())


def test_post_tool_omits_body_when_body_param_not_supplied():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.content == b""
        assert request.url.params["threshold"] == "5"
        return httpx.Response(200, json={"status": "ok"})

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["run_backtest"]
            text = await call_tool(client, tool, {"threshold": 5})
            assert json.loads(text) == {"status": "ok"}

    asyncio.run(run())


def test_error_response_raises_sniperboard_api_error_with_upstream_detail():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "No daily data found for ZZZZ"})

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["get_daily"]
            with pytest.raises(SniperBoardAPIError) as exc_info:
                await call_tool(client, tool, {"symbol": "ZZZZ"})
            assert exc_info.value.status_code == 404
            assert "No daily data found for ZZZZ" in exc_info.value.detail

    asyncio.run(run())


def test_connect_error_raises_sniperboard_api_error_with_hint():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["get_watchlist"]
            with pytest.raises(SniperBoardAPIError) as exc_info:
                await call_tool(client, tool, {})
            assert "SNIPERBOARD_API_URL" in exc_info.value.detail

    asyncio.run(run())


def test_html_response_passes_through_as_text():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html><body>preview</body></html>")

    async def run():
        async with _client_with(handler) as client:
            tool = TOOLS_BY_NAME["preview_email_report"]
            text = await call_tool(client, tool, {})
            assert text == "<html><body>preview</body></html>"

    asyncio.run(run())
