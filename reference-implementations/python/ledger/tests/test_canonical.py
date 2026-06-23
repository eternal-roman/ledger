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

from ledger.money import Money, FXRate
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


if __name__ == "__main__":
    tests = [test_money_from_forbids_float, test_money_exact_add_sub, test_balanced_entry_and_validate,
             test_unbalanced_rejected, test_ledger_apply_immutable_and_balance,
             test_determinism_and_equation, test_canonical_artifact_validator]
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
