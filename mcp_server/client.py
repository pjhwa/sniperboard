"""Thin HTTP passthrough from MCP tool calls to the running SniperBoard backend.

No business logic — every call is (query params + optional JSON body) -> httpx
request -> response text. Base URL is fully configurable via SNIPERBOARD_API_URL
since the real dev/docker port varies (see docs/superpowers/specs/2026-08-31-mcp-server-design.md).
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from mcp_server.tool_registry import ToolDef

DEFAULT_BASE_URL = "http://localhost:8000/api"
DEFAULT_TIMEOUT = 60.0
SWEEP_TIMEOUT = 300.0  # run_backtest_sweep can take several minutes


class SniperBoardAPIError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"SniperBoard API error {status_code}: {detail}")


def build_client() -> httpx.AsyncClient:
    base_url = os.environ.get("SNIPERBOARD_API_URL", DEFAULT_BASE_URL)
    return httpx.AsyncClient(base_url=base_url, timeout=DEFAULT_TIMEOUT)


async def call_tool(client: httpx.AsyncClient, tool: ToolDef, arguments: dict[str, Any]) -> str:
    """Dispatch one MCP tool call to SniperBoard. Returns the response body as text.

    tool.body_params names route to the JSON body; everything else becomes a query
    param. The registry only ever declares one body param per tool today (`symbols`
    on the two backtest endpoints), and FastAPI's `Optional[List[str]] = None`
    signature (no `Body(embed=True)`) expects the bare JSON list as the body, not
    `{"symbols": [...]}` — verified against backend/api/endpoints.py's actual
    run_backtest_endpoint signature via a FastAPI TestClient. So a single declared
    body param is unwrapped to its raw value rather than wrapped in a dict.
    """
    query_params: dict[str, Any] = {}
    json_body: Any = None
    for key, value in (arguments or {}).items():
        if key in tool.body_params:
            json_body = value
        else:
            query_params[key] = value

    timeout = SWEEP_TIMEOUT if tool.name == "run_backtest_sweep" else DEFAULT_TIMEOUT

    try:
        response = await client.request(
            tool.method,
            tool.path,
            params=query_params or None,
            json=json_body,
            timeout=timeout,
        )
    except httpx.ConnectError as exc:
        raise SniperBoardAPIError(
            0,
            f"Could not reach SniperBoard backend at {client.base_url}{tool.path}. "
            f"Is the backend running? Set SNIPERBOARD_API_URL to override the base URL. ({exc})",
        ) from exc

    if response.status_code >= 400:
        try:
            detail: Any = response.json()
        except ValueError:
            detail = response.text
        raise SniperBoardAPIError(response.status_code, str(detail))

    return response.text
