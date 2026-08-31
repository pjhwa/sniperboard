import asyncio

import httpx

import mcp_server.server as srv
from mcp_server.tool_registry import TOOLS_BY_NAME


def test_input_schema_marks_required_params():
    schema = srv._input_schema(TOOLS_BY_NAME["get_daily"])
    assert schema["type"] == "object"
    assert schema["properties"]["symbol"]["type"] == "string"
    assert schema["required"] == ["symbol"]


def test_input_schema_omits_required_key_when_no_required_params():
    schema = srv._input_schema(TOOLS_BY_NAME["get_watchlist"])
    assert "required" not in schema
    assert schema["properties"] == {}


def test_input_schema_includes_default_and_array_items():
    schema = srv._input_schema(TOOLS_BY_NAME["run_backtest"])
    assert schema["properties"]["threshold"]["default"] == 5
    assert schema["properties"]["symbols"]["type"] == "array"
    assert schema["properties"]["symbols"]["items"] == {"type": "string"}


def test_tool_description_prefixes_warning_only_for_mutating_tools():
    assert srv._tool_description(TOOLS_BY_NAME["run_backtest"]).startswith("⚠️ ")
    assert not srv._tool_description(TOOLS_BY_NAME["get_watchlist"]).startswith("⚠️")


def test_list_tools_returns_one_entry_per_registry_tool():
    async def run():
        tools = await srv.list_tools()
        assert len(tools) == 29
        assert {t.name for t in tools} == set(TOOLS_BY_NAME.keys())

    asyncio.run(run())


def test_call_tool_dispatches_through_http_client_and_wraps_text_content():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"watchlist": []})

    async def run():
        srv._http_client = httpx.AsyncClient(base_url="http://test/api", transport=httpx.MockTransport(handler))
        try:
            result = await srv.call_tool("get_watchlist", {})
        finally:
            await srv._http_client.aclose()
            srv._http_client = None
        assert len(result) == 1
        assert result[0].type == "text"
        assert "watchlist" in result[0].text

    asyncio.run(run())


def test_call_tool_unknown_name_raises_value_error():
    async def run():
        try:
            await srv.call_tool("does_not_exist", {})
        except ValueError as exc:
            assert "does_not_exist" in str(exc)
        else:
            raise AssertionError("expected ValueError")

    asyncio.run(run())


def test_call_tool_api_error_returns_error_text_instead_of_raising():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "No daily data found for ZZZZ"})

    async def run():
        srv._http_client = httpx.AsyncClient(base_url="http://test/api", transport=httpx.MockTransport(handler))
        try:
            result = await srv.call_tool("get_daily", {"symbol": "ZZZZ"})
        finally:
            await srv._http_client.aclose()
            srv._http_client = None
        assert len(result) == 1
        assert "No daily data found for ZZZZ" in result[0].text

    asyncio.run(run())
