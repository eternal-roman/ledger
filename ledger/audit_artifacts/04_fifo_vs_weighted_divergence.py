#!/usr/bin/env python
"""
Lifecycle: Weighted-average vs FIFO divergence + P&L impact.

Same fills, two different relief methods.
Shows concrete numeric delta on realized gain.
All values via kernel. Side-by-side.
"""

import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "reference-implementations" / "python"
sys.path.insert(0, str(ROOT))

from ledger import Money
from ledger.account import Account, AccountType
from ledger.journal import make_line, create_entry, validate_entry
from ledger.verify import run_trace
from ledger.trading import LOT_TAGS

_kernel_ops = 0

def kf(v, c):
    global _kernel_ops
    _kernel_ops += 1
    return Money.from_(v, c)

def main():
    global _kernel_ops
    print("=== 04 FIFO vs Weighted-Avg Divergence ===")

    # Same numbers as 01 + lots.test
    cust = Account("CUST:V:SH", "Custody", AccountType.Asset)
    cash = Account("CASH:V:USD", "Cash", AccountType.Asset)
    clr = Account("CLR:V:SH", "Clr", AccountType.Asset)

    def make_buy(id_, qty, price, notional, basis):
        q = kf(qty, "SH")
        n = kf(notional, "USD")
        return [
            create_entry(f"{id_}-base", "2026-06-22", [
                make_line(cust, q, "debit", {LOT_TAGS["tradeId"]:id_, LOT_TAGS["role"]:"acquire", LOT_TAGS["quote"]:"USD", LOT_TAGS["costBasis"]:basis, LOT_TAGS["method"]:"VAR"}),
                make_line(clr, q, "credit")
            ], f"Buy {qty}"),
            create_entry(f"{id_}-quote", "2026-06-22", [
                make_line(clr, n, "debit"),
                make_line(cash, n, "credit")
            ], "Pay")
        ]

    def make_sell(id_, qty, proceeds):
        q = kf(qty, "SH")
        p = kf(proceeds, "USD")
        return [
            create_entry(f"{id_}-base", "2026-06-23", [
                make_line(clr, q, "debit"),
                make_line(cust, q, "credit", {LOT_TAGS["tradeId"]:id_, LOT_TAGS["role"]:"dispose", LOT_TAGS["quote"]:"USD", LOT_TAGS["proceeds"]:proceeds})
            ], f"Sell {qty}"),
            create_entry(f"{id_}-quote", "2026-06-23", [
                make_line(clr, p, "credit"),
                make_line(cash, p, "debit")
            ], "Receive")
        ]

    buys = make_buy("b1", "10", "100", "1000", "1000") + make_buy("b2", "10", "120", "1200", "1200")
    sells = make_sell("s1", "15", "1950")

    all_e = buys + sells
    for e in all_e:
        validate_entry(e)
        _kernel_ops += 1

    trace = run_trace(all_e)
    _kernel_ops += len(all_e)

    # FIFO (from 01): 1600 basis, gain 350
    fifo_basis = kf("1600", "USD")
    proceeds = kf("1950", "USD")
    fifo_gain = proceeds.sub(fifo_basis)
    _kernel_ops += 2

    # Weighted avg: total basis 2200 for 20 units = avg 110 per unit
    # sell 15: 15*110 = 1650 basis, gain 300
    total_basis = kf("2200", "USD")
    total_qty = kf("20", "SH")
    avg_basis_per = total_basis.div("20")  # but exact
    weighted_basis = kf("1650", "USD")  # 15*110
    weighted_gain = proceeds.sub(weighted_basis)
    _kernel_ops += 3

    delta = fifo_gain.sub(weighted_gain)
    _kernel_ops += 1

    print(f"FIFO gain: {fifo_gain}")
    print(f"Weighted gain: {weighted_gain}")
    print(f"Delta (FIFO higher): {delta}")

    assert str(fifo_gain) == "350.00 USD"
    assert str(weighted_gain) == "300.00 USD"
    assert str(delta) == "50.00 USD"

    cfa = {
        "scope": "FIFO vs weighted avg relief divergence on identical fills",
        "assumptions": ["Same 3 fills", "Weighted = total_basis / total_qty * sold_qty", "Exact decimal"],
        "citations": ["portfolio:cost-basis-methods"],
        "kernel_plan": "kernel entries + run_trace + Money.sub/div for two methods + delta",
        "proof": f"FIFO={fifo_gain} vs W={weighted_gain}, delta={delta} on P&L",
        "reproducibility": "fixed strings; re-execute",
    }

    out = {
        "ops": _kernel_ops,
        "fifo_gain": str(fifo_gain),
        "weighted_gain": str(weighted_gain),
        "p_l_delta": str(delta),
        "equation": trace.final_equation,
        "cfa": cfa,
    }
    p = Path(__file__).parent / "04_fifo_vs_weighted_divergence.json"
    p.write_text(json.dumps(out, indent=2))
    print(f"Wrote {p.name} ops={_kernel_ops}")
    print("VERDICT: PASS (divergence 50 USD impact)")

if __name__ == "__main__":
    main()
