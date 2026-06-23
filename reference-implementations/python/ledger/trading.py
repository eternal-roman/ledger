"""
Trading / fill reconciliation helpers for the Python reference canonical.

Faithful support for common flows turned into validated JournalEntry sequences.
Mirrors key semantics from src/trading/postings.ts + src/portfolio/lots.ts (lot tagging).

CRITICAL: All monetary values and quantities use Money.from_ exclusively.
Notional, fees, basis computed via Money.mul / add / sub.

Lot tags are carried so cost basis and lot identity are inside the tamper-evident
audit_hash. This enables later full lot relief (FIFO etc) to be reconstructed from
the ledger alone.
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal

from .money import Money, ROUND_HALF_UP
from .account import Account, AccountType
from .journal import (
    JournalEntry, JournalEntryLine, make_line,
    create_balanced_entry, create_entry, validate_entry
)
from .ledger import Ledger
from .verify import run_trace, TraceReplayResult, CanonicalFinancialArtifact


LOT_TAGS = {
    "tradeId": "tradeId",
    "role": "lotRole",          # 'acquire' | 'dispose'
    "quote": "lotQuote",
    "costBasis": "costBasis",   # total quote notional for the acquired qty
    "proceeds": "proceeds",     # total quote notional realized
    "method": "lotMethod",
}


def make_accounts_for_trading(venue: str = "DEFAULT") -> Dict[str, Account]:
    """Standard custody + cash + P&L accounts.

    Using CUST: and CASH: prefixes for parity with TS custodyAccount etc.
    """
    v = venue.upper()
    return {
        "cust_btc": Account(f"CUST:{v}:BTC", "CustodyBTC", AccountType.Asset),
        "cash_usd": Account(f"CASH:{v}:USD", "CashUSD", AccountType.Asset),
        "clr_base": Account(f"CLR:{v}:BTC", "ClearingBase", AccountType.Asset),
        "clr_quote": Account(f"CLR:{v}:USD", "ClearingQuote", AccountType.Asset),
        "fee_expense": Account("5100", "FeeExpense", AccountType.Expense),
        "rebate_income": Account("4200", "RebateIncome", AccountType.Income),
        "realized_pnl": Account("4100", "RealizedPnL", AccountType.Income),
    }


def _notional(price: Money, qty: Money) -> Money:
    """Exact notional = price (quote) * qty (base units). Result in quote currency."""
    # qty is Money in the asset currency (e.g. BTC); its amount is the scalar
    scalar = str(qty.to_decimal())
    return price.mul(scalar, ROUND_HALF_UP)


def reconcile_buy_fill(
    fill_id: str,
    date: str,
    qty: str,           # e.g. "0.01234567"
    price: str,         # e.g. "65432.18"
    fee: str = "0",     # e.g. "2.02" in quote
    base: str = "BTC",
    quote: str = "USD",
    venue: str = "DEFAULT",
    method: str = "FIFO",
) -> List[JournalEntry]:
    """Buy fill -> balanced entries carrying lot tags on custody leg.

    Uses pure kernel math.
    """
    accts = make_accounts_for_trading(venue)
    price_m = Money.from_(price, quote)
    qty_m = Money.from_(qty, base)  # asset units as Money for tagging + later lots
    fee_m = Money.from_(fee, quote) if fee and Decimal(str(fee)) != 0 else Money.zero(quote)

    notional_m = _notional(price_m, qty_m)

    entries: List[JournalEntry] = []

    # Base leg: receive asset into custody (with lot tags). Use create_entry because tags.
    base_leg = create_entry(
        f"{fill_id}-base",
        date,
        [
            make_line(
                accts["cust_btc"],
                qty_m,
                "debit",
                {
                    LOT_TAGS["tradeId"]: fill_id,
                    LOT_TAGS["role"]: "acquire",
                    LOT_TAGS["quote"]: quote,
                    LOT_TAGS["costBasis"]: str(notional_m.to_decimal()),
                    LOT_TAGS["method"]: method,
                },
            ),
            make_line(accts["clr_base"], qty_m, "credit"),
        ],
        f"Buy {qty} {base} @ {price} {quote} (base leg)",
    )
    entries.append(base_leg)

    # Quote leg: pay notional + fee
    cash_out = notional_m.add(fee_m)
    quote_lines: List[JournalEntryLine] = [make_line(accts["clr_quote"], notional_m, "debit")]
    if not fee_m.is_zero():
        quote_lines.append(make_line(accts["fee_expense"], fee_m, "debit"))
    quote_lines.append(make_line(accts["cash_usd"], cash_out, "credit"))

    quote_leg = create_entry(
        f"{fill_id}-quote",
        date,
        quote_lines,
        f"Pay for buy {fill_id} (notional+fee)",
    )
    entries.append(quote_leg)

    # Validate each
    for e in entries:
        vr = validate_entry(e)
        if not vr.ok:
            raise ValueError(f"Buy fill {fill_id} produced invalid entry: {vr.violations}")

    return entries


def reconcile_sell_fill(
    fill_id: str,
    date: str,
    qty: str,
    price: str,
    fee: str = "0",
    base: str = "BTC",
    quote: str = "USD",
    venue: str = "DEFAULT",
    method: str = "FIFO",
) -> List[JournalEntry]:
    """Sell fill -> balanced entries with disposal tags + realized proceeds."""
    accts = make_accounts_for_trading(venue)
    price_m = Money.from_(price, quote)
    qty_m = Money.from_(qty, base)
    fee_m = Money.from_(fee, quote) if fee and Decimal(str(fee)) != 0 else Money.zero(quote)

    proceeds = _notional(price_m, qty_m)  # gross proceeds before fee
    net_proceeds = proceeds.sub(fee_m) if not fee_m.is_zero() else proceeds

    entries: List[JournalEntry] = []

    # Base leg: deliver asset out of custody (dispose role)
    base_leg = create_entry(
        f"{fill_id}-base",
        date,
        [
            make_line(
                accts["clr_base"],
                qty_m,
                "debit",
            ),
            make_line(
                accts["cust_btc"],
                qty_m,
                "credit",
                {
                    LOT_TAGS["tradeId"]: fill_id,
                    LOT_TAGS["role"]: "dispose",
                    LOT_TAGS["quote"]: quote,
                    LOT_TAGS["proceeds"]: str(proceeds.to_decimal()),
                    LOT_TAGS["method"]: method,
                },
            ),
        ],
        f"Sell {qty} {base} @ {price} {quote} (base leg)",
    )
    entries.append(base_leg)

    # Quote leg: receive net proceeds, expense fee
    quote_lines: List[JournalEntryLine] = [make_line(accts["clr_quote"], proceeds, "credit")]
    if not fee_m.is_zero():
        quote_lines.append(make_line(accts["fee_expense"], fee_m, "debit"))
    quote_lines.append(make_line(accts["cash_usd"], net_proceeds, "debit"))

    quote_leg = create_entry(
        f"{fill_id}-quote",
        date,
        quote_lines,
        f"Receive from sell {fill_id} (proceeds-fee)",
    )
    entries.append(quote_leg)

    for e in entries:
        vr = validate_entry(e)
        if not vr.ok:
            raise ValueError(f"Sell fill {fill_id} produced invalid entry: {vr.violations}")

    return entries


def replay_fill_trace(fill_data: Dict[str, Any]) -> TraceReplayResult:
    """Reconcile one fill (buy or sell) then run_trace. For quick proofs."""
    side = fill_data.get("side", "buy").lower()
    if side == "sell":
        entries = reconcile_sell_fill(
            fill_data.get("id", "fill"),
            fill_data.get("date", "2026-06-22"),
            fill_data["qty"],
            fill_data["price"],
            fill_data.get("fee", "0"),
            fill_data.get("base", "BTC"),
            fill_data.get("quote", "USD"),
            fill_data.get("venue", "DEFAULT"),
            fill_data.get("method", "FIFO"),
        )
    else:
        entries = reconcile_buy_fill(
            fill_data.get("id", "fill"),
            fill_data.get("date", "2026-06-22"),
            fill_data["qty"],
            fill_data["price"],
            fill_data.get("fee", "0"),
            fill_data.get("base", "BTC"),
            fill_data.get("quote", "USD"),
            fill_data.get("venue", "DEFAULT"),
            fill_data.get("method", "FIFO"),
        )
    return run_trace(entries)


def make_phase0_cfa() -> Dict[str, Any]:
    """CanonicalFinancialArtifact for completing the trading helpers in Phase 0."""
    return {
        "scope": "Phase 0 trading helpers completion for Python canonical reference",
        "assumptions": [
            "All values constructed exclusively via Money.from_ on string/int inputs",
            "Notional computed with price.mul(qty) using kernel mul + ROUND_HALF_UP",
            "Lot metadata carried exclusively in entry line tags (hashed into audit_hash)",
            "Buy and sell use two-leg pattern for future cross-currency compatibility",
            "Fee always in quote currency; netted exactly",
        ],
        "citations": [
            "kernel:double-entry-balance",
            "kernel:exact-decimal",
            "kernel:lot-tags-in-audit-hash",
            "trading:cost-basis-carry",
        ],
        "kernel_plan": "Money.from_ + make_line (with tags) + create_entry + validate_entry + Ledger.apply + run_trace",
        "proof": "Every produced entry validates, run_trace produces matching hashes on replay, equation holds, tags survive JSON roundtrip",
        "reproducibility": "fill qty/price/fee as strings; deterministic date/id; no external state",
    }
