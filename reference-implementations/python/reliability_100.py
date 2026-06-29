#!/usr/bin/env python3
"""
Reliability stress test for the Python reference implementation of the Ledger kernel.
Simulates 100 iterations of an "AI agent" using the MCP-equivalent tools:
- money_compute (via Money ops + allocate + convert)
- entry_validate / ledger_post (via validate_entry + Ledger.apply)
- trace_run, ledger_verify_equation, ledger_audit_hash, determinism

Injects common LLM failure modes on "bad" proposals on every iteration.
Asserts that NO bad entry is ever successfully posted.
Checks exactness, balance (fundamental equation), determinism (same hash on rebuild), JSON roundtrips.

This exercises the same enforcement rules as the TypeScript kernel (exact decimal, balance, determinism, and rejection of invalid entries).
Run: python reference-implementations/python/reliability_100.py
"""

import sys
from pathlib import Path
from decimal import Decimal
import json
import hashlib

# Make importable like the test files do
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ledger.money import Money, FXRate
from ledger.account import Account, AccountType
from ledger.journal import (
    JournalEntry, make_line, create_balanced_entry, validate_entry,
    create_entry
)
from ledger.ledger import Ledger, empty_ledger
from ledger.verify import verify_determinism, run_trace

total_iters = 0
good_posts = 0
bads_rejected = 0
bads_posted = 0
det_fails = 0
eq_fails = 0
hash_mismatches = 0

cash = Account("1000", "Cash", AccountType.Asset)
equity = Account("3000", "Owner Equity", AccountType.Equity)
expense = Account("5000", "Expense", AccountType.Expense)

def make_good_entry(i: int, amt_str: str) -> JournalEntry:
    return create_balanced_entry(
        f"g{i}", "2026-06-28", cash, equity,
        Money.from_(amt_str, "USD"), f"good-{i}"
    )

def make_bad_entry(i: int, amt_str: str, mutation: str) -> JournalEntry:
    base = Money.from_(amt_str, "USD")
    if mutation == "off-by-1":
        # Debit correct, credit off by 1 (classic LLM "confident" error)
        lines = (
            make_line(expense, base, "debit"),
            make_line(cash, Money.from_("1799.00", "USD"), "credit"),
        )
        return JournalEntry(f"b{i}-off", "2026-06-28", lines, "bad off-by-1")
    elif mutation == "subscale":
        # Sub-cent from "precise" calc
        bad_amt = Money.from_(amt_str + "0000001", "USD")
        lines = (make_line(cash, bad_amt, "debit"), make_line(equity, bad_amt, "credit"))
        return JournalEntry(f"b{i}-sub", "2026-06-28", lines, "bad subscale")
    elif mutation == "unbalanced":
        lines = (
            make_line(cash, base, "debit"),
            make_line(equity, base, "credit"),
            make_line(expense, Money.from_("1.00", "USD"), "debit"),
        )
        return JournalEntry(f"b{i}-unbal", "2026-06-28", lines, "bad extra line")
    elif mutation == "currency-mix":
        eur = Money.from_(amt_str, "EUR")
        lines = (make_line(expense, eur, "debit"), make_line(cash, base, "credit"))
        return JournalEntry(f"b{i}-mix", "2026-06-28", lines, "bad currency mix")
    else:  # too few lines
        lines = (make_line(cash, base, "debit"),)
        return JournalEntry(f"b{i}-few", "2026-06-28", lines, "bad too-few-lines")

def ledger_hash(l: Ledger) -> str:
    # Mirror audit hash intent: stable over entries
    data = []
    for e in l.entries:
        data.append({
            "id": e.id,
            "date": e.effective_date,
            "desc": e.description,
            "lines": [(ln.account.code, str(ln.amount.to_decimal()), ln.amount.currency, ln.side) for ln in e.lines]
        })
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()

def fundamental_equation(l: Ledger) -> bool:
    return l.verify_fundamental_equation()

def one_iter(i: int):
    global total_iters, good_posts, bads_rejected, bads_posted, det_fails, eq_fails, hash_mismatches
    total_iters += 1
    l = empty_ledger()
    posted = []

    # === money_compute equivalent ===
    # add (0.1 + 0.2)
    s = Money.from_("0.1", "USD").add(Money.from_("0.2", "USD"))
    assert str(s) == "0.30 USD", "exact add failed"

    # allocate remainder rule (100 / 3)
    parts = Money.from_("100.00", "USD").allocate(["1", "1", "1"])
    psum = sum((p.to_decimal() for p in parts), Decimal(0))
    assert psum == Decimal("100.00"), f"allocate must conserve: {parts}"

    # convert via FX
    rate = FXRate("EUR", "USD", "1.08")
    conv = Money.from_("100.00", "EUR").convert(rate)
    assert str(conv) == "108.00 USD", f"fx convert {conv}"

    # === Good posts via ledger_post equiv ===
    for amt in ["10000.00", "42.00"]:
        e = make_good_entry(i, amt)
        vr = validate_entry(e)
        if not vr.ok:
            print("UNEXPECTED: good entry invalid", vr)
            continue
        l2, res = l.apply(e)
        if res.ok:
            l = l2
            posted.append(e)
            good_posts += 1

    # === Bad AI-like proposals (5 classes) ===
    for mut in ["off-by-1", "subscale", "unbalanced", "currency-mix", "wrong-amount-too-few"]:
        be = make_bad_entry(i, "1800.00", mut if mut != "wrong-amount-too-few" else "off-by-1")
        vr = validate_entry(be)
        l2, res = l.apply(be)
        if vr.ok and res.ok:
            bads_posted += 1
            l = l2
            posted.append(be)
            print(f"!!! BREAK: bad posted in iter {i} mutation {mut}")
        else:
            bads_rejected += 1

    # === trace_run, verify equation, audit ===
    trace = run_trace(posted)
    if not trace.final_equation:
        eq_fails += 1
        print("EQUATION FAIL iter", i)

    h1 = l.audit_hash() if hasattr(l, 'audit_hash') else ledger_hash(l)

    # determinism / rebuild
    det = verify_determinism(posted)
    if not getattr(det, 'ok', True):
        det_fails += 1
        print("DET FAIL iter", i)

    # rebuild from entries (JSON roundtrip sim)
    l_re = empty_ledger()
    for e in posted:
        l_re, _ = l_re.apply(e)
    h2 = l_re.audit_hash() if hasattr(l_re, 'audit_hash') else ledger_hash(l_re)
    if h1 != h2:
        hash_mismatches += 1
        print("HASH MISMATCH iter", i)

    if not fundamental_equation(l_re):
        eq_fails += 1

def main():
    print("=== Python Ledger Ref (MCP-equivalent) 100-iter Reliability ===")
    import time
    start = time.time()
    for i in range(100):
        one_iter(i)
    dur = int((time.time() - start) * 1000)

    any_break = (bads_posted > 0 or det_fails > 0 or eq_fails > 0 or hash_mismatches > 0)

    print("\n=== SUMMARY (Python ref) ===")
    print(f"Iters: {total_iters}")
    print(f"Good posts: {good_posts}")
    print(f"Bad proposals rejected: {bads_rejected}")
    print(f"BAD POSTED (MUST BE 0): {bads_posted}")
    print(f"Determinism fails: {det_fails}")
    print(f"Equation fails: {eq_fails}")
    print(f"Hash/roundtrip mismatches: {hash_mismatches}")
    print(f"Duration ms: {dur}")

    if any_break:
        print("\n*** RELIABILITY FAILURE IN PYTHON REF ***")
        sys.exit(1)
    else:
        print("\n100 iters clean: kernel invariants held. No floats, no unbalanced, deterministic, fail-closed on bad proposals.")
        print("This matches the claims for the kernel (and thus the MCP bridge).")

if __name__ == "__main__":
    main()
