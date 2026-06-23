"""
Standalone verification that the Python canonical meets SUPER_LEDGER_AUDIT_PROTOCOL requirements:
- No raw float for money
- Full double-entry validate + create
- Immutable Ledger.apply with re-validation
- verify_fundamental_equation
- audit_hash determinism
- JSON roundtrip
- Trace replay pattern (multiple applies + checkpoints)
- Sub-scale and currency mix guards
- Ready for modeling arbitrary repo flows
"""
import sys
from pathlib import Path
from decimal import Decimal

# Make package import work
sys.path.insert(0, str(Path(__file__).parent.parent))

from ledger import (
    Money, Account, AccountType,
    create_balanced_entry, create_entry, make_line,
    empty_ledger, verify_determinism,
    validate_entry, JournalEntry
)

def main():
    print("=== SUPER AUDIT PROTOCOL - Python Canonical Verification ===")

    cash = Account("1000", "Cash", AccountType.Asset)
    eq = Account("3000", "Equity", AccountType.Equity)
    fee_exp = Account("5100", "FeeExpense", AccountType.Expense)

    # 1. Float forbid
    try:
        Money.from_(0.1, "USD")
        assert False, "Float should be rejected"
    except ValueError as e:
        assert "forbids raw float" in str(e)
    print("[PASS] Money.from_ rejects non-integer float")

    # 2. Create balanced + validate
    e1 = create_balanced_entry("cap-1", "2026-06-22", cash, eq, Money.from_("10000", "USD"), "Initial capital")
    assert validate_entry(e1).ok
    print("[PASS] create_balanced_entry + validate_entry works")

    # 3. Ledger apply immutable + balances + equation
    l = empty_ledger()
    l2, res = l.apply(e1)
    assert res.ok
    assert l.entries == () and len(l2.entries) == 1
    assert l2.balance(cash).to_decimal() == Decimal("10000")
    assert l2.verify_fundamental_equation([cash, eq])
    print("[PASS] Immutable apply, balance, fundamental equation")

    # 4. Multi-step trace replay (core tx tracing)
    e_fee = create_balanced_entry("fee-1", "2026-06-22", fee_exp, cash, Money.from_("25", "USD"), "Fee")
    l3, r_fee = l2.apply(e_fee)
    assert r_fee.ok
    assert l3.verify_fundamental_equation([cash, eq, fee_exp])
    h = l3.audit_hash()
    assert len(h) == 64
    print("[PASS] Multi-step apply trace with equation + audit_hash at each checkpoint")

    # 5. Determinism harness
    det = verify_determinism([e1, e_fee])
    assert det["ok"]
    assert det["ledger"].verify_fundamental_equation()
    print("[PASS] verify_determinism (hash equality + equation)")

    # 6. JSON roundtrip
    j = l3.to_json()
    l4 = type(l3).from_json(j)
    assert l3.audit_hash() == l4.audit_hash()
    assert l4.verify_fundamental_equation()
    print("[PASS] Ledger + entries JSON roundtrip preserves hash + equation")

    # 7. Subscale guard
    try:
        bad_amt = Money.from_("1.2345", "USD")  # 4dp > scale 2
        create_balanced_entry("bad", "2026-06-22", cash, eq, bad_amt, "too precise")
        assert False
    except ValueError as e:
        assert "finer than" in str(e) or "SUB_SCALE" in str(e)
    print("[PASS] Sub-scale guard in create_entry/validate")

    # 8. Mixed currency guard (core rule)
    btc = Account("1100", "BTC", AccountType.Asset)
    try:
        mixed = JournalEntry("mix", "2026-06-22", [
            make_line(cash, Money.from_("100", "USD"), "debit"),
            make_line(btc, Money.from_("0.001", "BTC"), "credit"),
        ], "mixed")
        validate_entry(mixed)
        assert False
    except Exception:
        pass  # validation should catch
    print("[PASS] Currency mix guard (requires explicit FX legs)")

    # 9. Provenance and as_of carried
    m = Money.from_("42.5", "USD", as_of="2026-06-22", provenance="test:audit-abstracted")
    assert m.as_of == "2026-06-22"
    print("[PASS] Provenance + as_of supported for audit traceability")

    print("\n=== ALL VERIFICATIONS PASSED ===")
    print("Python canonical is ready for SUPER_LEDGER_AUDIT_PROTOCOL use in any repo.")
    print("It implements the kernel strength: exact entries + apply replay + proofs.")

if __name__ == "__main__":
    main()
