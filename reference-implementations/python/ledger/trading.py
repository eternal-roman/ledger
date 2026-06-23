"""
Basic trading / fill reconciliation helpers for the Python canonical.

These express common domain flows (fills, fees) as validated JournalEntry
sequences using the kernel. Use in audits to turn subject data into provable
ledger state.

Everything goes through Money + create + apply.
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal

from .money import Money
from .account import Account, AccountType
from .journal import create_balanced_entry, JournalEntry
from .ledger import Ledger
from .verify import run_trace, TraceReplayResult


def make_accounts_for_trading() -> Dict[str, Account]:
    """Standard accounts for a simple trading book."""
    return {
        "cash_usd": Account("1000", "CashUSD", AccountType.Asset),
        "inventory_btc": Account("1100", "InventoryBTC", AccountType.Asset),
        "fee_expense": Account("5100", "FeeExpense", AccountType.Expense),
        "realized_pnl": Account("4100", "RealizedPnL", AccountType.Income),
    }


def reconcile_buy_fill(
    fill_id: str,
    date: str,
    qty: str,          # e.g. "0.01234567"
    price: str,        # e.g. "65432.18"  (already rounded for accounting)
    fee: str,          # e.g. "2.02"
    base_currency: str = "USD",
    asset: str = "BTC",
) -> List[JournalEntry]:
    """Turn a buy fill into balanced entries.

    Returns list of JournalEntry ready for Ledger.apply.
    In real audit, derive qty/price/fee from subject data using Money.from_ on strings.
    """
    accts = make_accounts_for_trading()
    gross_val = (Decimal(price) * Decimal(qty)).quantize(Decimal("0.01"))
    gross = Money.from_(str(gross_val), base_currency)
    fee_val = Decimal(fee).quantize(Decimal("0.01"))
    fee_m = Money.from_(str(fee_val), base_currency)

    entries = []
    # Debit inventory at cost (gross), Credit cash
    entries.append(
        create_balanced_entry(
            f"{fill_id}-gross", date,
            accts["inventory_btc"], accts["cash_usd"],
            gross,
            f"Buy fill gross {qty} {asset} @ {price}"
        )
    )
    # Fee
    if not fee_m.is_zero():
        entries.append(
            create_balanced_entry(
                f"{fill_id}-fee", date,
                accts["fee_expense"], accts["cash_usd"],
                fee_m,
                f"Fee on buy fill {fill_id}"
            )
        )
    return entries


def replay_fill_trace(fill_data: Dict[str, Any]) -> TraceReplayResult:
    """Convenience: reconcile + run_trace for one fill. Great for protocol traces."""
    entries = reconcile_buy_fill(
        fill_data.get("id", "fill"),
        fill_data.get("date", "2026-06-22"),
        fill_data["qty"],
        fill_data["price"],
        fill_data.get("fee", "0"),
    )
    return run_trace(entries)
