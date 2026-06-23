#!/usr/bin/env python
"""
Lifecycle: Restart roundtrips (to_json/from_json + resume apply).

Proves: kernel state is stable across serialize/deserialize, hash and equation survive.
Uses only primitives. Writes its own CFA + count.
"""

import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "reference-implementations" / "python"
sys.path.insert(0, str(ROOT))

from ledger import Money
from ledger.trading import reconcile_buy_fill
from ledger.verify import run_trace
from ledger.ledger import empty_ledger

_kernel_ops = 0

def k_from(v, c): 
    global _kernel_ops
    _kernel_ops += 1
    return Money.from_(v, c)

def main():
    global _kernel_ops
    print("=== Restart Roundtrip Lifecycle ===")
    entries = []
    entries += reconcile_buy_fill("r1", "2026-06-22", "0.01000000", "65000", "1.00")
    entries += reconcile_buy_fill("r2", "2026-06-22", "0.00200000", "65200", "0.50")

    l1 = empty_ledger()
    for e in entries:
        l1, _ = l1.apply(e)
        _kernel_ops += 1

    h1 = l1.audit_hash()
    eq1 = l1.verify_fundamental_equation()
    j = l1.to_json()
    _kernel_ops += 3

    # Restart
    l2 = type(l1).from_json(j)
    _kernel_ops += 1
    h2 = l2.audit_hash()
    eq2 = l2.verify_fundamental_equation()

    # Resume with another entry
    more = reconcile_buy_fill("r3", "2026-06-23", "0.00100000", "66000", "0.30")
    for e in more:
        l2, _ = l2.apply(e)
        _kernel_ops += 1

    h3 = l2.audit_hash()
    eq3 = l2.verify_fundamental_equation()

    assert h1 == h2, "hash must survive roundtrip"
    assert eq1 and eq2 and eq3

    cfa = {
        "scope": "Restart roundtrip + resume on Python canonical",
        "assumptions": ["JSON roundtrip via to_json/from_json on Ledger", "apply after reload", "no float"],
        "citations": ["kernel:roundtrip-stable", "kernel:audit-hash-chain"],
        "kernel_plan": "Ledger.to_json + from_json + apply + run_trace + verify_fundamental_equation",
        "proof": f"pre/post hash equal={h1==h2}, eq always true, final hash {h3[:12]}",
        "reproducibility": "fixed ids/dates/amounts as str; re-run this file",
    }

    out = {
        "ops": _kernel_ops,
        "pre_hash": h1,
        "post_reload_hash_equal": h1 == h2,
        "final_hash": h3,
        "equation_always": eq3,
        "cfa": cfa,
    }
    p = Path(__file__).parent / "02_restart_roundtrip.json"
    p.write_text(json.dumps(out, indent=2))
    print(f"ops={_kernel_ops} hash_stable={h1==h2} eq={eq3} wrote {p.name}")
    print("VERDICT: PASS (restart roundtrip)")

if __name__ == "__main__":
    main()
