/**
 * Benchmark harness: run the same set of proposed journal entries two ways —
 *
 *   baseline  : commit every proposal as-is (no kernel guardrail)
 *   guarded   : each proposal must pass validateEntry before Ledger.apply
 *
 * and measure how many invariant violations reach the committed books. The
 * guarded run drops that to zero by construction (the kernel fails closed), and
 * additionally yields a balanced, audit-hashed, deterministic ledger.
 *
 * This is an invariant-enforcement benchmark (properties hold by construction of the kernel), NOT a
 * claim that the model got smarter.
 */
import {
  Money,
  Account,
  AccountType,
  JournalEntry,
  validateEntry,
  emptyLedger,
  verifyDeterminism,
  type JournalEntryLine,
  type Side,
} from '@eternal-roman/ledger';
import type { Entry } from './dataset.js';

export interface ProposalOutcome {
  taskId: string;
  valid: boolean;
  violationTypes: string[];
}

export interface ModeReport {
  mode: 'baseline' | 'guarded';
  proposed: number;
  /** Entries with >=1 invariant violation that ended up committed to the books. */
  violationsReachingBooks: number;
  /** Entries the guardrail refused before they could be committed (guarded only). */
  rejectedByGuardrail: number;
  /** Entries actually committed. */
  posted: number;
  /** Whether the committed books balance (debits == credits per currency). */
  finalBalanced: boolean;
  auditHash?: string;
  deterministic?: boolean;
}

export interface BenchmarkResult {
  outcomes: ProposalOutcome[];
  baseline: ModeReport;
  guarded: ModeReport;
}

/** Build a JournalEntry without throwing, so validateEntry can report violations. */
function toEntry(e: Entry): JournalEntry {
  const lines: JournalEntryLine[] = e.lines.map((l) =>
    Object.freeze({
      account: new Account(l.accountCode, l.accountName, l.accountType as AccountType),
      amount: Money.from(l.amount, l.currency),
      side: l.side as Side,
    }),
  );
  return new JournalEntry(e.id, e.date, lines, e.description);
}

/** Manual per-currency debit/credit equality over a set of committed entries. */
function booksBalance(entries: JournalEntry[]): boolean {
  const byCurrency = new Map<string, { debit: any; credit: any }>();
  for (const e of entries) {
    for (const l of e.lines) {
      const c = l.amount.currency;
      if (!byCurrency.has(c)) byCurrency.set(c, { debit: Money.zero(c).toDecimal(), credit: Money.zero(c).toDecimal() });
      const b = byCurrency.get(c)!;
      if (l.side === 'debit') b.debit = b.debit.add(l.amount.toDecimal());
      else b.credit = b.credit.add(l.amount.toDecimal());
    }
  }
  for (const { debit, credit } of byCurrency.values()) {
    if (!debit.eq(credit)) return false;
  }
  return true;
}

export function runBenchmark(proposals: Entry[]): BenchmarkResult {
  const outcomes: ProposalOutcome[] = proposals.map((p) => {
    const result = validateEntry(toEntry(p));
    return {
      taskId: p.id,
      valid: result.ok,
      violationTypes: result.violations.map((v) => v.type),
    };
  });

  // Baseline: commit everything as-is. Violations ride straight onto the books.
  const baselineEntries = proposals.map(toEntry);
  const baseline: ModeReport = {
    mode: 'baseline',
    proposed: proposals.length,
    violationsReachingBooks: outcomes.filter((o) => !o.valid).length,
    rejectedByGuardrail: 0,
    posted: proposals.length,
    finalBalanced: booksBalance(baselineEntries),
  };

  // Guarded: validate, then apply only what passes. The kernel refuses the rest.
  let ledger = emptyLedger();
  const posted: JournalEntry[] = [];
  let rejected = 0;
  for (const p of proposals) {
    const entry = toEntry(p);
    const { ledger: next, result } = ledger.apply(entry);
    if (result.ok) {
      ledger = next;
      posted.push(entry);
    } else {
      rejected += 1;
    }
  }
  const determinism = verifyDeterminism(posted);
  const guarded: ModeReport = {
    mode: 'guarded',
    proposed: proposals.length,
    violationsReachingBooks: 0, // by construction: invalid entries never apply
    rejectedByGuardrail: rejected,
    posted: posted.length,
    finalBalanced: ledger.verifyFundamentalEquation(),
    auditHash: ledger.auditHash(),
    deterministic: determinism.ok,
  };

  return { outcomes, baseline, guarded };
}
