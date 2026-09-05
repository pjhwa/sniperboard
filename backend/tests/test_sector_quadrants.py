"""Sector rotation momentum × acceleration quadrant labels."""
from core.sector_quadrants import quadrant_label, label_sectors


def test_quadrant_labels():
    assert quadrant_label(momentum=2.0, acceleration=1.0) == "leading"
    assert quadrant_label(momentum=2.0, acceleration=-1.0) == "weakening"
    assert quadrant_label(momentum=-2.0, acceleration=-1.0) == "lagging"
    assert quadrant_label(momentum=-2.0, acceleration=1.0) == "improving"


def test_zero_momentum_uses_acceleration_sign():
    assert quadrant_label(momentum=0.0, acceleration=0.5) == "improving"
    assert quadrant_label(momentum=0.0, acceleration=-0.5) == "weakening"
    assert quadrant_label(momentum=0.0, acceleration=0.0) == "lagging"


def test_label_sectors_computes_accel_from_two_windows():
    rows = [
        {"symbol": "XLK", "name": "Tech", "ret_recent": 4.0, "ret_prior": 1.0},
        {"symbol": "XLE", "name": "Energy", "ret_recent": -3.0, "ret_prior": 1.0},
    ]
    out = label_sectors(rows)
    by = {r["symbol"]: r for r in out}
    assert by["XLK"]["quadrant"] == "leading"
    assert by["XLK"]["momentum"] == 4.0
    assert by["XLK"]["acceleration"] == 3.0
    assert by["XLE"]["quadrant"] == "lagging"
