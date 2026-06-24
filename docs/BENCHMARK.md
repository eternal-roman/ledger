# Benchmark: deterministic guardrail for AI bookkeeping

_Proposals from: **recorded fixture**. Regenerate with `npm run eval`._

An AI bookkeeper proposes 8 journal entries. We commit them two
ways: **baseline** (as-is, no guardrail) and **guarded** (each must pass the
`@eternal-roman/ledger` kernel — `validateEntry` + `Ledger.apply` — before it
lands). We then count how many invariant violations reach the committed books.

> This is an invariant-enforcement benchmark: the guarantees are by construction,
> not a claim that the model got smarter.

## Headline

| | Baseline (no guardrail) | Guarded (kernel) |
|---|---|---|
| Entries proposed | 8 | 8 |
| **Invariant violations reaching the books** | **4 (50%)** | **0 (0%)** |
| Rejected by the guardrail before commit | — | 4 |
| Entries committed | 8 | 4 |
| Books balance (debits = credits / equation) | **no** | yes |
| Tamper-evident audit hash | — | `ff473d1a24f3be0e…` |
| Deterministic (rebuild = identical hash) | — | yes |

Baseline silently commits **4** corrupt entries and
leaves the books **unbalanced**. The kernel
caught **every one** — they never reached the books — and the surviving ledger is
balanced, audit-hashed, and reproducible.

## Per-proposal detail

| Task | Instruction | Kernel verdict |
|------|-------------|----------------|
| `t1` | Owner invests $10,000 cash to start the business. | ✅ valid |
| `t2` | Pay January office rent of $1,800 in cash. | ❌ UNBALANCED |
| `t3` | Invoice a client $4,200 for consulting on account (accounts receivable). | ✅ valid |
| `t4` | Split a $100.00 shared utility bill evenly across 3 departments (cash paid). | ❌ SUB_SCALE, UNBALANCED |
| `t5` | Buy a $2,500 laptop with cash (capitalize as equipment). | ❌ SUB_SCALE |
| `t6` | Receive $4,200 cash from the client paying off their invoice. | ✅ valid |
| `t7` | Accrue $1,200.50 of interest income earned but not yet received. | ✅ valid |
| `t8` | Record $900 cash for a software subscription expense. | ❌ UNBALANCED, CURRENCY_MIX |

Failure modes present in the baseline proposals — float / sub-cent precision drift,
unbalanced debits vs credits, and silent currency mixing — are exactly the
token-level errors LLMs make on numbers. The guarded path makes them
un-committable.
