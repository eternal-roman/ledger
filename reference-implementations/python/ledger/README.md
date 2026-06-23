# ledger (Python Reference Canonical)

Faithful port of the Ledger Chad kernel (see main TS implementation in `src/core/`).

## Purpose in Audits
This is the reference Python implementation of the ledger kernel, intended for use when auditing Python codebases or when a target has not yet integrated the official primitives.

When auditing any Python financial codebase:
1. Copy this `ledger/` package (or `pip install` when published) into the audit workspace.
2. Run tests with `python -m pytest ledger/tests/` (preferred for package imports) or `python -m ledger.tests.test_canonical`.
3. Use the kernel: `from ledger import Money, Account, AccountType, create_balanced_entry, empty_ledger, verify_determinism, run_trace, trading` etc.
4. Replay with `ledger.apply(entry)` or `run_trace(entries)` step-by-step, capturing balances, `verify_fundamental_equation()`, and `audit_hash()` at checkpoints. Use `reconcile_buy_fill` from trading for common patterns.
5. Prove invariants and produce numeric counter-examples vs the subject's native float/Decimal code.

## Core Usage
```python
from ledger.money import Money
from ledger.account import Account, AccountType
from ledger.journal import create_balanced_entry, validate_entry
from ledger.ledger import empty_ledger, verify_determinism

cash = Account("1000", "Cash", AccountType.Asset)
equity = Account("3000", "Equity", AccountType.Equity)

entry = create_balanced_entry(
    "cap1", "2026-06-22", cash, equity,
    Money.from_("10000", "USD"), "Seed capital"
)

l = empty_ledger()
l, res = l.apply(entry)
assert res.ok
assert l.verify_fundamental_equation()
print(l.balance(cash))  # 10000.00 USD
print(l.audit_hash())
```

## Key Invariants Enforced
- `Money.from_(value, currency)`: rejects raw non-integer `float`.
- All amounts positive, per-currency debits == credits exactly.
- No mixed currencies in one entry (use explicit FX legs).
- No sub-scale precision.
- Immutable `Ledger.apply` always re-validates.
- Deterministic `audit_hash` and roundtrippable JSON.

See `tests/test_canonical.py` and `tests/verify_audit_readiness.py` for proofs.

## Modeling Real Flows (Audit Pattern)
Define domain accounts, turn observed trades/fills/fees into `JournalEntry`s, replay full lifecycle:

See `examples/trace_example.py` for a buy + fee trace.

For a full trading bot audit you would also build:
- `reconcile_fill(trade: dict) -> JournalEntry`
- Use `runTrace` style loops (or manual successive apply) + side-by-side vs native math.

## Differences from TypeScript Kernel (Documented)
- Uses stdlib `decimal.Decimal` (high prec) vs decimal.js.
- `__str__` / display quantizes to scale (matching TS `toString`).
- Rounding in `mul`/`allocate` uses `quantize(ROUND_HALF_UP)`.
- JSON shape is compatible for roundtrips of core fields.

Run the determinism harness and compare hashes where sequences are built equivalently.

## Running Tests
```bash
python -m pytest ledger/tests/ -q
# or
python ledger/tests/test_canonical.py
python ledger/tests/verify_audit_readiness.py
```

## Integration with the Audit Process
This package is the reference for **Phase 0** of any Python target audit.
After proving the canonical, use it for all inventory modeling, traces, and proofs.

See `skills/ledger-audit/SKILL.md` for how it is used in audits.
