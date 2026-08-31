"""SniperBoard MCP server — stdio entry point.

Registers one MCP tool per entry in tool_registry.TOOLS and dispatches every
call to the running SniperBoard backend via client.call_tool. See
docs/superpowers/specs/2026-08-31-mcp-server-design.md for the design.

Must be run as a module (`python -m mcp_server.server`) with the repo root on
PYTHONPATH — package-absolute imports below break under plain script invocation.
"""
from __future__ import annotations

import asyncio
import logging

import mcp.server.stdio
import mcp.types as types
from mcp.server import Server

from mcp_server.client import SniperBoardAPIError, build_client
from mcp_server.client import call_tool as dispatch_call
from mcp_server.tool_registry import TOOLS, TOOLS_BY_NAME, ToolDef

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sniperboard-mcp")

server = Server("sniperboard")

_http_client = None  # type: ignore[var-annotated]  # set in main(); tests set/tear down directly


def _input_schema(tool: ToolDef) -> dict:
    properties: dict[str, dict] = {}
    required: list[str] = []
    for name, spec in tool.params.items():
        prop: dict = {"type": spec.type, "description": spec.description}
        if spec.type == "array":
            prop["items"] = {"type": spec.items_type or "string"}
        if spec.default is not None:
            prop["default"] = spec.default
        properties[name] = prop
        if spec.required:
            required.append(name)
    schema: dict = {"type": "object", "properties": properties}
    if required:
        schema["required"] = required
    return schema


def _tool_description(tool: ToolDef) -> str:
    return f"⚠️ {tool.description}" if tool.mutating else tool.description


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(name=t.name, description=_tool_description(t), inputSchema=_input_schema(t))
        for t in TOOLS
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    tool = TOOLS_BY_NAME.get(name)
    if tool is None:
        raise ValueError(f"Unknown tool: {name}")
    if _http_client is None:
        raise RuntimeError("HTTP client not initialized — server.main() must run first")
    try:
        text = await dispatch_call(_http_client, tool, arguments or {})
    except SniperBoardAPIError as exc:
        logger.warning("tool %s failed: %s", name, exc)
        return [types.TextContent(type="text", text=f"Error: {exc.detail}")]
    return [types.TextContent(type="text", text=text)]


async def main() -> None:
    global _http_client
    _http_client = build_client()
    try:
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
    finally:
        await _http_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
