from mcp_server.tool_registry import TOOLS, TOOLS_BY_NAME, ToolDef

MUTATING_NAMES = {"run_backtest", "run_backtest_sweep", "refresh_signal_log", "send_email_report", "put_alert_rules"}

BODY_PARAM_NAMES = {"run_backtest": {"symbols"}, "run_backtest_sweep": {"symbols"}}


def test_tool_count():
    assert len(TOOLS) == 40


def test_tool_names_are_unique():
    names = [t.name for t in TOOLS]
    assert len(names) == len(set(names))


def test_tools_by_name_matches_tools():
    assert set(TOOLS_BY_NAME.keys()) == {t.name for t in TOOLS}
    for t in TOOLS:
        assert TOOLS_BY_NAME[t.name] is t


def test_mutating_flags_match_known_mutating_endpoints():
    mutating = {t.name for t in TOOLS if t.mutating}
    assert mutating == MUTATING_NAMES


def test_only_mutating_tools_use_post():
    write_methods = {"POST", "PUT", "PATCH", "DELETE"}
    for t in TOOLS:
        if t.method in write_methods:
            assert t.mutating, f"{t.name} is {t.method} but not flagged mutating"
        if t.mutating:
            assert t.method in write_methods, f"{t.name} is mutating but not a write method"


def test_body_params_only_on_backtest_symbols():
    for t in TOOLS:
        expected = BODY_PARAM_NAMES.get(t.name, set())
        assert set(t.body_params) == expected, t.name


def test_required_params_have_no_default():
    for t in TOOLS:
        for pname, spec in t.params.items():
            if spec.required:
                assert spec.default is None, f"{t.name}.{pname} required but has a default"


def test_get_daily_schema():
    t = TOOLS_BY_NAME["get_daily"]
    assert t.method == "GET"
    assert t.path == "/daily"
    assert t.params["symbol"].required is True
    assert t.params["symbol"].type == "string"


def test_run_backtest_schema():
    t = TOOLS_BY_NAME["run_backtest"]
    assert t.method == "POST"
    assert t.path == "/backtest/run"
    assert t.mutating is True
    assert t.body_params == frozenset({"symbols"})
    assert t.params["symbols"].type == "array"
    assert t.params["symbols"].items_type == "string"
    assert t.params["threshold"].default == 5
    assert t.params["rs_threshold"].default == 70
    assert t.params["use_spy_filter"].default is True
