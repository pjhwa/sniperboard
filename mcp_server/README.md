# SniperBoard MCP Server

Exposes all SniperBoard `/api/*` endpoints (watchlist, signals, macro,
sentiment, briefings, backtests, alerts, overlays, etc — 40 tools total) as MCP tools
over stdio, so any MCP-capable client (Claude Desktop, Claude Code, and
future clients like Grok once they support MCP) can query and operate
SniperBoard directly.

This server does not run any business logic itself — every tool call is a
thin HTTP passthrough to an already-running SniperBoard backend
(`backend/main.py`, normally `uvicorn`). **The backend must be running
before you use these tools.**

**For the connected AI client (Claude, Grok, etc.):** read
[`USAGE.md`](./USAGE.md) — it's written directly for you and covers every
tool, the domain concepts needed to interpret the numbers (Stage2,
Conviction, Risk Regime, etc.), safety rules for the mutating tools, and
ready-made multi-tool workflows for common requests.

## Setup

```bash
python3 -m venv mcp_server/.venv
mcp_server/.venv/bin/pip install -r mcp_server/requirements.txt
```

## Configuration

Set `SNIPERBOARD_API_URL` to wherever your backend is actually listening.
Defaults to `http://localhost:8000/api` if unset. Note that port 8000 may
already be taken by something else on your machine (it was during
development here — OrbStack was squatting on it) — pick whatever free port
your local `uvicorn` actually bound to. Docker Compose maps the backend to
host port `5001` (`http://localhost:5001/api`).

## Running

`server.py` uses package-absolute imports (`from mcp_server.client import
...`), so it must be run as a module — `python -m mcp_server.server` — with
the repo root on `PYTHONPATH`. Running it as a bare script (`python
mcp_server/server.py`) puts `mcp_server/` itself on `sys.path` instead of the
repo root and the import fails.

## Register with Claude Code

```bash
claude mcp add sniperboard \
  --env PYTHONPATH=/absolute/path/to/sniperboard \
  --env SNIPERBOARD_API_URL=http://localhost:8010/api \
  -- /absolute/path/to/mcp_server/.venv/bin/python -m mcp_server.server
```

## Register with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sniperboard": {
      "command": "/absolute/path/to/mcp_server/.venv/bin/python",
      "args": ["-m", "mcp_server.server"],
      "env": {
        "PYTHONPATH": "/absolute/path/to/sniperboard",
        "SNIPERBOARD_API_URL": "http://localhost:8010/api"
      }
    }
  }
}
```

## Tools

40 tools, one per `/api/*` endpoint — see `tool_registry.py` for the full
list with descriptions. Four are mutating (their description is prefixed
`⚠️`) and change server state when called: `run_backtest`,
`run_backtest_sweep`, `refresh_signal_log`, `send_email_report`.

## Tests

```bash
mcp_server/.venv/bin/python -m pytest mcp_server/tests/ -v
```
