"""
Basic canonical tests for Python reference implementation.
Run: python -m pytest reference-implementations/python/ledger/tests/ -q
or simply: python reference-implementations/python/ledger/tests/test_canonical.py
"""

import sys
from decimal import Decimal
from pathlib import Path

# Ensure importable when run directly
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ledger.money import Money, FXRate, register_scale_resolver
from ledger.account import Account, AccountType
from ledger.journal import (
    JournalEntry, make_line, create_balanced_entry, create_entry,
    validate_entry, ValidationViolation
)
from ledger.ledger import Ledger, empty_ledger
from ledger.verify import verify_determinism, validate_canonical_artifact


def test_money_from_forbids_float():
    try:
        Money.from_(0.1, "USD")
        assert False, "should have raised"
    except ValueError as e:
        assert "forbids raw float" in str(e)


def test_money_exact_add_sub():
    a = Money.from_("123.4567", "USD")
    b = Money.from_("0.0003", "USD")
    # compare decimals exactly
    assert a.add(b).to_decimal() == Decimal("123.4570")


def test_balanced_entry_and_validate():
    cash = Account("1000", "Cash", AccountType.Asset)
    equity = Account("3000", "Equity", AccountType.Equity)
    e = create_balanced_entry("cap1", "2026-06-22", cash, equity, Money.from_("10000", "USD"), "Seed")
    vr = validate_entry(e)
    assert vr.ok
    assert len(e.lines) == 2


def test_unbalanced_rejected():
    cash = Account("1000", "Cash", AccountType.Asset)
    equity = Account("3000", "Equity", AccountType.Equity)
    bad = JournalEntry("bad", "2026-06-22", [
        make_line(cash, Money.from_("100", "USD"), "debit"),
    ], "unbalanced")
    vr = validate_entry(bad)
    assert not vr.ok
    assert any(v.type == "TOO_FEW_LINES" or "UNBALANCED" in v.type or "UNBALANCED" in v.message for v in vr.violations)


def test_ledger_apply_immutable_and_balance():
    cash = Account("1000", "Cash", AccountType.Asset)
    equity = Account("3000", "Equity", AccountType.Equity)
    e = create_balanced_entry("c1", "2026-06-22", cash, equity, Money.from_("5000", "USD"), "Cap")
    l0 = empty_ledger()
    l1, res = l0.apply(e)
    assert res.ok
    assert l0 is not l1
    assert l0.entries == ()
    assert len(l1.entries) == 1
    assert l1.balance(cash).to_decimal() == Decimal("5000")


def test_determinism_and_equation():
    cash = Account("1000", "Cash", AccountType.Asset)
    equity = Account("3000", "Equity", AccountType.Equity)
    e1 = create_balanced_entry("c1", "2026-06-22", cash, equity, Money.from_("10000", "USD"), "C1")
    e2 = create_balanced_entry("c2", "2026-06-22", cash, equity, Money.from_("2500", "USD"), "C2")
    res = verify_determinism([e1, e2])
    assert res["ok"]
    l = res["ledger"]
    assert l.verify_fundamental_equation([cash, equity])


def test_canonical_artifact_validator():
    good = {
        "scope": "trade fill",
        "assumptions": ["rate 0.0025", "date 2026-06-22"],
        "citations": ["IFRS:revenue"],
        "kernel_plan": "Money.from + make_line + create_entry + Ledger.apply + validate_entry",
        "proof": "equation holds + hash match",
        "reproducibility": "seed=42",
    }
    v = validate_canonical_artifact(good)
    assert v["ok"]

    bad = good.copy()
    bad["kernel_plan"] = "just float math"
    v2 = validate_canonical_artifact(bad)
    assert not v2["ok"]


def test_allocate_edges_and_remainder():
    """Test remainder-to-last rule and exact sums (mirrors TS allocate)."""
    m = Money.from_("100", "USD")
    parts = m.allocate([0.5, 0.3, 0.2])
    assert sum(p.to_decimal() for p in parts) == Decimal("100")
    # Check last gets any remainder in non-nice cases
    m2 = Money.from_("1", "USD")
    parts2 = m2.allocate([Decimal("1")/3, Decimal("1")/3, Decimal("1")/3])
    total = sum(p.to_decimal() for p in parts2)
    assert total == Decimal("1")
    assert len(parts2) == 3


def test_from_json_restores_explicit_asset_scale():
    """Mirror of TS money.test.ts: a non-default scale must survive the JSON
    roundtrip even when no scale resolver is installed (asset registry absent)."""
    register_scale_resolver(None)  # ensure no asset registry installed
    # SOL is not in CURRENCY_SCALES -> scale_for() would yield DEFAULT_SCALE (2).
    asset = Money.from_("0.1234", "SOL", scale=4)
    assert asset.scale == 4
    restored = Money.from_json(asset.to_json())
    assert restored.scale == 4
    assert str(restored) == "0.1234 SOL"


def test_golden_replay_from_ts_style_sequence():
    """Replay a simple sequence equivalent to TS verify-determinism and examples.
    This is the start of 'replay golden sequence from TS examples' for Phase 1.
    """
    cash = Account("1000", "Cash", AccountType.Asset)
    equity = Account("3000", "Equity", AccountType.Equity)
    # Equivalent to capEntry 10000 + 2500
    e1 = create_balanced_entry("c1", "2026-06-22", cash, equity, Money.from_("10000", "USD"), "Seed1")
    e2 = create_balanced_entry("c2", "2026-06-22", cash, equity, Money.from_("2500", "USD"), "Seed2")

    l = empty_ledger()
    for e in [e1, e2]:
        l, res = l.apply(e)
        assert res.ok

    assert l.balance(cash).to_decimal() == Decimal("12500")
    assert l.verify_fundamental_equation([cash, equity])

    # Determinism check
    det = verify_determinism([e1, e2])
    assert det["ok"]
    assert det["ledger"].balance(cash).to_decimal() == Decimal("12500")


if __name__ == "__main__":
    tests = [test_money_from_forbids_float, test_money_exact_add_sub, test_balanced_entry_and_validate,
             test_unbalanced_rejected, test_ledger_apply_immutable_and_balance,
             test_determinism_and_equation, test_canonical_artifact_validator,
             test_allocate_edges_and_remainder, test_from_json_restores_explicit_asset_scale,
             test_golden_replay_from_ts_style_sequence]
    passed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
            passed += 1
        except AssertionError as ae:
            print(f"FAIL {t.__name__}: {ae}")
        except Exception as ex:
            print(f"ERROR {t.__name__}: {ex}")
    print(f"\n{passed}/{len(tests)} passed")
    if passed != len(tests):
        sys.exit(1)
