"""
Demonstration of deep transaction tracing using the canonical Python Ledger.

In a real kernel-grounded audit this pattern is repeated for every critical money lifecycle:
1. Define domain Accounts.
2. For a realistic numeric scenario, construct exact JournalEntry using Money.from_.
3. Apply step-by-step to a Ledger.
4. At each boundary checkpoint: capture balances, verify equation, capture audit_hash.
5. Compare reconstructed values to what the subject code reports (float vs exact).

This is how you "actually use the strength of the audit kernel".
"""

import sys
from pathlib import Path
from decimal import Decimal
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ledger.money import Money
from ledger.account import Account, AccountType
from ledger.journal import create_balanced_entry, create_entry, make_line
from ledger.ledger import empty_ledger

# Domain accounts (example for a trading bot — abstract)
CASH_USD = Account("1000", "CashUSD", AccountType.Asset)
INVENTORY_BTC = Account("1100", "InventoryBTC", AccountType.Asset)
FEE_EXPENSE = Account("5100", "FeeExpense", AccountType.Expense)
REALIZED_PNL = Account("4100", "RealizedPnL", AccountType.Income)

def run_btc_buy_fill_trace():
    print("=== TRACE: BTC Buy Fill Lifecycle (using canonical kernel) ===")
    # Realistic inputs (would come from target's data or synthetic attack data)
    # IMPORTANT: accounting legs must respect currency scale (USD=2). High prec price * qty must be rounded for money legs.
    price_str = "65432.17890123"
    qty_str = "0.01234567"
    fee_rate = "0.0025"

    # In real code: compute gross in high prec then .quantize to scale or use explicit rounding in mul.
    # Here we construct the monetary amounts at proper scale for the entry.
    gross_val = (Decimal(price_str) * Decimal(qty_str)).quantize(Decimal('0.01'))
    fee_val = (gross_val * Decimal(fee_rate)).quantize(Decimal('0.01'))

    gross_usd = Money.from_(str(gross_val), "USD")
    fee_usd = Money.from_(str(fee_val), "USD")

    print(f"Inputs: price={price_str}, qty={qty_str} BTC, gross_usd={gross_usd}, fee_usd={fee_usd}")

    ledger = empty_ledger()

    # 1. Debit inventory (at cost), credit cash. Use properly scaled Money.
    buy_entry = create_balanced_entry(
        "buy1", "2026-06-22",
        INVENTORY_BTC, CASH_USD,
        gross_usd,
        "Buy fill gross proceeds"
    )
    ledger, r = ledger.apply(buy_entry)
    assert r.ok, r
    print("After buy gross:", "inventory=", ledger.balance(INVENTORY_BTC), "cash=", ledger.balance(CASH_USD))
    assert ledger.verify_fundamental_equation()

    # 2. Fee: Debit expense, credit cash
    fee_entry = create_balanced_entry(
        "fee1", "2026-06-22",
        FEE_EXPENSE, CASH_USD,
        fee_usd,
        "Trading fee on buy"
    )
    ledger, r = ledger.apply(fee_entry)
    assert r.ok
    print("After fee:", "expense=", ledger.balance(FEE_EXPENSE), "cash=", ledger.balance(CASH_USD))
    assert ledger.verify_fundamental_equation()

    # 3. Snapshot + determinism proof
    h = ledger.audit_hash()
    print("Audit hash after fill+fee:", h[:16] + "...")
    eq = ledger.verify_fundamental_equation()
    print("Equation holds:", eq)

    # In audit: now inject this same sequence into a float simulator and show drift on repeated partials / MTM etc.
    print("=== End of kernel trace (in real audit: 8+ such full numeric traces + side-by-side vs target) ===\n")


if __name__ == "__main__":
    run_btc_buy_fill_trace()
    print("Python canonical trace demo succeeded. Use this pattern for every money path.")
