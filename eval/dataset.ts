/**
 * Benchmark dataset: small bookkeeping tasks plus a recorded set of "baseline"
 * proposals — what an unguarded LLM bookkeeper plausibly emits. The recorded
 * proposals deliberately include the failure modes the research literature
 * identifies for LLMs doing finance:
 *
 *   - float / precision drift   (e.g. 0.1 + 0.2 => 0.30000000000000004; sub-cent amounts)
 *   - unbalanced debits/credits (confidently wrong, looks authoritative)
 *   - silent currency mixing
 *
 * The point is NOT that the model is dumb — it is that token-level generation is
 * indifferent to these invariants. The guarded run feeds the SAME proposals
 * through the kernel, which refuses every one of these by construction.
 *
 * This is a fixture (deterministic, no network) so `npm run eval` is reproducible
 * in CI. A live proposer (Anthropic SDK) can replace `baselineProposals` behind an
 * API key; see eval/proposers.ts.
 */
export type AccountTypeStr = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface Posting {
  accountCode: string;
  accountName: string;
  accountType: AccountTypeStr;
  amount: string;
  currency: string;
  side: 'debit' | 'credit';
}

export interface Entry {
  id: string;
  date: string;
  description: string;
  lines: Posting[];
}

export interface Task {
  id: string;
  /** Natural-language instruction a bookkeeping agent would receive. */
  prompt: string;
  /** Ground-truth correct entry (exact, balanced). */
  correct: Entry;
}

const cash = (amount: string, side: Posting['side'], currency = 'USD'): Posting => ({
  accountCode: '1000',
  accountName: 'Cash',
  accountType: 'Asset',
  amount,
  currency,
  side,
});
const acct = (
  code: string,
  name: string,
  type: AccountTypeStr,
  amount: string,
  side: Posting['side'],
  currency = 'USD',
): Posting => ({ accountCode: code, accountName: name, accountType: type, amount, currency, side });

/** The ground-truth tasks (all correct + balanced). */
export const tasks: Task[] = [
  {
    id: 't1',
    prompt: 'Owner invests $10,000 cash to start the business.',
    correct: {
      id: 't1', date: '2026-01-02', description: 'Initial capital',
      lines: [cash('10000.00', 'debit'), acct('3000', 'Owner Equity', 'Equity', '10000.00', 'credit')],
    },
  },
  {
    id: 't2',
    prompt: 'Pay January office rent of $1,800 in cash.',
    correct: {
      id: 't2', date: '2026-01-03', description: 'January rent',
      lines: [acct('5000', 'Rent Expense', 'Expense', '1800.00', 'debit'), cash('1800.00', 'credit')],
    },
  },
  {
    id: 't3',
    prompt: 'Invoice a client $4,200 for consulting on account (accounts receivable).',
    correct: {
      id: 't3', date: '2026-01-10', description: 'Consulting revenue on account',
      lines: [acct('1200', 'Accounts Receivable', 'Asset', '4200.00', 'debit'), acct('4000', 'Consulting Revenue', 'Income', '4200.00', 'credit')],
    },
  },
  {
    id: 't4',
    prompt: 'Split a $100.00 shared utility bill evenly across 3 departments (cash paid).',
    correct: {
      id: 't4', date: '2026-01-12', description: 'Utilities split 3 ways',
      lines: [
        acct('5100', 'Utilities - Dept A', 'Expense', '33.34', 'debit'),
        acct('5101', 'Utilities - Dept B', 'Expense', '33.33', 'debit'),
        acct('5102', 'Utilities - Dept C', 'Expense', '33.33', 'debit'),
        cash('100.00', 'credit'),
      ],
    },
  },
  {
    id: 't5',
    prompt: 'Buy a $2,500 laptop with cash (capitalize as equipment).',
    correct: {
      id: 't5', date: '2026-01-15', description: 'Purchase equipment',
      lines: [acct('1500', 'Equipment', 'Asset', '2500.00', 'debit'), cash('2500.00', 'credit')],
    },
  },
  {
    id: 't6',
    prompt: 'Receive $4,200 cash from the client paying off their invoice.',
    correct: {
      id: 't6', date: '2026-01-20', description: 'Collect receivable',
      lines: [cash('4200.00', 'debit'), acct('1200', 'Accounts Receivable', 'Asset', '4200.00', 'credit')],
    },
  },
  {
    id: 't7',
    prompt: 'Accrue $1,200.50 of interest income earned but not yet received.',
    correct: {
      id: 't7', date: '2026-01-31', description: 'Accrued interest income',
      lines: [acct('1300', 'Interest Receivable', 'Asset', '1200.50', 'debit'), acct('4200', 'Interest Income', 'Income', '1200.50', 'credit')],
    },
  },
  {
    id: 't8',
    prompt: 'Record $900 cash for a software subscription expense.',
    correct: {
      id: 't8', date: '2026-02-01', description: 'Software subscription',
      lines: [acct('5200', 'Software Expense', 'Expense', '900.00', 'debit'), cash('900.00', 'credit')],
    },
  },
];

/**
 * Recorded baseline proposals — what an unguarded agent emits. Several carry the
 * documented failure modes; the rest are fine. Keyed by task id.
 */
export const baselineProposals: Record<string, Entry> = {
  // OK
  t1: tasks[0].correct,
  // UNBALANCED: credits the equity at a stale number (confidently wrong).
  t2: {
    id: 't2', date: '2026-01-03', description: 'January rent',
    lines: [acct('5000', 'Rent Expense', 'Expense', '1800.00', 'debit'), cash('1750.00', 'credit')],
  },
  // OK
  t3: tasks[2].correct,
  // PRECISION/UNBALANCED: even split done in floating point — 100/3 = 33.333..., three
  // lines of '33.33' leave a cent unaccounted for (debits 99.99 != credit 100.00),
  // and one line carries sub-cent precision.
  t4: {
    id: 't4', date: '2026-01-12', description: 'Utilities split 3 ways',
    lines: [
      acct('5100', 'Utilities - Dept A', 'Expense', '33.333', 'debit'),
      acct('5101', 'Utilities - Dept B', 'Expense', '33.33', 'debit'),
      acct('5102', 'Utilities - Dept C', 'Expense', '33.33', 'debit'),
      cash('100.00', 'credit'),
    ],
  },
  // SUB_SCALE: float drift produced a sub-cent amount on both legs.
  t5: {
    id: 't5', date: '2026-01-15', description: 'Purchase equipment',
    lines: [
      acct('1500', 'Equipment', 'Asset', '2500.00000000000001', 'debit'),
      cash('2500.00000000000001', 'credit'),
    ],
  },
  // OK
  t6: tasks[5].correct,
  // OK
  t7: tasks[6].correct,
  // CURRENCY_MIX: pays from a USD account but books the expense in EUR.
  t8: {
    id: 't8', date: '2026-02-01', description: 'Software subscription',
    lines: [
      acct('5200', 'Software Expense', 'Expense', '900.00', 'debit', 'EUR'),
      cash('900.00', 'credit', 'USD'),
    ],
  },
};
