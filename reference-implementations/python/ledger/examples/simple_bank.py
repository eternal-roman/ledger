"""
Example mirroring TS examples/small-bank.ts and verify-determinism style.

Demonstrates:
- Defining accounts
- Creating balanced entries
- Applying to immutable Ledger
- Verifying equation + hash
- Full trace replay style using the kernel (for rigorous audits)

In a real audit, replace the hard-coded numbers with data extracted from the target repo
and compare to its reported values.
"""

import sys
from pathlib import Path
from decimal import Decimal

# Robust for running as script or module (PYTHONPATH=. from python/ dir recommended)
here = Path(__file__).resolve().parent
# Insert the directory that contains the 'ledger' package directory
sys.path.insert(0, str(here.parent.parent))
# Or set PYTHONPATH=. and run from python/ dir

from ledger.money import Money
from ledger.account import Account, AccountType
from ledger.journal import create_balanced_entry
from ledger.ledger import empty_ledger
from ledger.verify import verify_determinism

def main():
    print("=== Simple Bank / Capital Flow (Python Canonical) ===")

    loans = Account("120", "Loans Receivable", AccountType.Asset)
    deposits = Account("200", "Customer Deposits", AccountType.Liability)
    capital = Account("300", "Bank Capital", AccountType.Equity)

    ledger = empty_ledger()

    # Issue loan funded by deposit (balanced)
    e1 = create_balanced_entry(
        "loan1", "2026-06-22",
        loans, deposits,
        Money.from_("100000", "USD"),
        "Issue loan funded by deposit"
    )
    ledger, res = ledger.apply(e1)
    assert res.ok

    print("After loan:", ledger.balance(loans), "deposits:", ledger.balance(deposits))
    assert ledger.verify_fundamental_equation()

    # Additional capital contribution (asset increase vs equity)
    e2 = create_balanced_entry(
        "cap1", "2026-06-22",
        loans, capital,
        Money.from_("50000", "USD"),
        "Additional capital"
    )
    ledger, res2 = ledger.apply(e2)
    assert res2.ok
    print("After capital:", ledger.balance(loans), "capital/equity impact visible in trial")
    print("Equation holds:", ledger.verify_fundamental_equation())

    det = verify_determinism([e1])
    print("Determinism for sequence:", det["ok"], "hash prefix:", det["hash"][:8])

    print("=== End of simple bank example. Use this pattern for audit traces ===")

if __name__ == "__main__":
    main()
