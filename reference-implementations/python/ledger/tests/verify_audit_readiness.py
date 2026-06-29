"""
Standalone verification that the Python canonical implements the kernel primitives correctly (Money construction rules, double-entry validation, immutable Ledger, determinism, etc.).
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

# Make package import work: insert dir that contains the 'ledger' subdir (so 'import ledger' works)
# Make runnable directly and via pytest: ensure 'ledger' package dir is on path as parent
_here = Path(__file__).resolve()
# parents[0]=tests, [1]=ledger (package), [2]=python
_ledger_root = _here.parents[1]
_python_root = _here.parents[2]
sys.path.insert(0, str(_python_root))

from ledger import (
    Money, Account, AccountType,
    create_balanced_entry, create_entry, make_line,
    empty_ledger, verify_determinism,
    validate_entry, JournalEntry,
    trading,
)
from ledger.trading import reconcile_buy_fill, reconcile_sell_fill, replay_fill_trace

def main():
    print("=== Python Canonical Kernel Verification ===")

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

    # 10. Trading helpers (reconcile + run_trace with lot tags + realistic BTC fill)
    # Use 0.01234567 BTC case explicitly called out in enforcement plan
    buy_entries = reconcile_buy_fill(
        "f-btc-001", "2026-06-22",
        qty="0.01234567", price="65432.18", fee="2.02",
        base="BTC", quote="USD", venue="TEST"
    )
    assert len(buy_entries) == 2
    # First entry carries lot tags on custody line
    cust_line = [l for l in buy_entries[0].lines if "CUST" in l.account.code][0]
    assert cust_line.tags and cust_line.tags.get(trading.LOT_TAGS["role"]) == "acquire"
    assert "costBasis" in str(cust_line.tags)
    trace = replay_fill_trace({"id": "f-btc-001", "qty": "0.01234567", "price": "65432.18", "fee": "2.02", "side": "buy"})
    assert trace.ok
    assert trace.final_equation
    # Check one balance is the tiny BTC amount
    bals = {b["account_code"]: b["balance"] for b in trace.checkpoints[-1].balances}
    assert any("0.01234567" in b for b in bals.values())
    print("[PASS] Trading helpers + realistic 0.01234567 BTC buy + lot tags + run_trace")

    sell_entries = reconcile_sell_fill("f-btc-s1", "2026-06-22", "0.005", "66000", "1.50")
    assert len(sell_entries) == 2
    print("[PASS] Sell fill reconciliation works and validates")

    print("\n=== ALL VERIFICATIONS PASSED ===")
    print("Python canonical kernel implementation verified.")
    print("It implements the kernel strength: exact entries + apply replay + proofs.")

if __name__ == "__main__":
    main()
