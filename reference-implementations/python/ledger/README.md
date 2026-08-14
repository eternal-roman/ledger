# ledger (Python port)

Port of `src/core`. Same invariants. TypeScript is canonical.

```python
from ledger.money import Money
from ledger.account import Account, AccountType
from ledger.journal import create_balanced_entry, validate_entry
from ledger.ledger import empty_ledger

cash = Account("1000", "Cash", AccountType.Asset)
equity = Account("3000", "Equity", AccountType.Equity)
e = create_balanced_entry("cap1", "2026-06-22", cash, equity, Money.from_("10000", "USD"), "Seed")
l, res = empty_ledger().apply(e)
assert res.ok and l.verify_fundamental_equation()
```

- `Money.from_` rejects non-integer floats.
- `audit_hash()` is `ledger-audit-v2` (type + name, stable tags).
- Fiat scales match TS. BTC/ETH/USDC/USDT are in the Python map so examples run; TS loads those via `installAssetScales`.
- Hashes match TS only when sequence, scales, and tags match.

```bash
python -m pytest ledger/tests/ -q
```

See `examples/trace_example.py` and `skills/ledger-audit/SKILL.md`. Not advice. MIT (root LICENSE).
