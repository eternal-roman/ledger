/**
 * Bridge between agent-friendly JSON and the @eternal-roman/ledger kernel.
 *
 * The whole point of this MCP server is that the agent never does money math or
 * balance checks "in-token": it hands structured intent to these helpers, which
 * run the real, deterministic, audit-hashed kernel and hand back proofs.
 */
import {
  Money,
  FXRate,
  Account,
  AccountType,
  JournalEntry,
  Ledger,
  emptyLedger,
  ROUND_HALF_UP,
  type JournalEntryLine,
  type Side,
} from '@eternal-roman/ledger';
import { z } from 'zod';

/** Zod shape for one journal line in agent-friendly form. */
export const lineSchema = z.object({
  accountCode: z.string().describe('Account code, e.g. "1000"'),
  accountName: z.string().describe('Human account name, e.g. "Cash"'),
  accountType: z
    .enum(['Asset', 'Liability', 'Equity', 'Income', 'Expense'])
    .describe('Account type; drives the normal balance side'),
  amount: z
    .string()
    .describe('Exact decimal string — NEVER a float literal (e.g. "1800.00", not 1800.0)'),
  currency: z.string().describe('ISO currency or asset symbol, e.g. "USD", "BTC"'),
  side: z.enum(['debit', 'credit']).describe('Posting side'),
  tags: z.record(z.string()).optional().describe('Optional line tags (audit-hashed)'),
});
export type LineInput = z.infer<typeof lineSchema>;

/** Zod shape for a full journal entry in agent-friendly form. */
export const entrySchema = z.object({
  id: z.string().describe('Stable entry id'),
  effectiveDate: z.string().describe('Effective date, strict YYYY-MM-DD'),
  description: z.string().describe('Entry description'),
  lines: z.array(lineSchema).min(1).describe('Journal lines (at least two for double-entry)'),
  citations: z.array(z.string()).optional().describe('Supporting citations (e.g. GAAP/IFRS refs)'),
  tags: z.record(z.string()).optional(),
});
export type EntryInput = z.infer<typeof entrySchema>;

/** Serialized ledger passed between stateless calls (the kernel's own toJSON shape). */
export const ledgerSchema = z
  .any()
  .optional()
  .describe('Serialized ledger from a prior call (Ledger.toJSON shape). Omit to start empty.');

export function toAccount(line: LineInput): Account {
  return new Account(line.accountCode, line.accountName, line.accountType as AccountType);
}

export function toMoney(amount: string, currency: string): Money {
  // Money.from rejects non-integer JS numbers; we only ever pass strings, so a
  // sub-scale or negative value flows through to validateEntry as a violation
  // rather than being silently coerced.
  return Money.from(amount, currency);
}

/**
 * Build a JournalEntry WITHOUT throwing on bad lines, so validateEntry can report
 * structured violations (the guardrail) instead of the kernel factory throwing.
 * Lines are built directly (not via makeLine) to avoid its strictly-positive guard.
 */
export function toUnvalidatedEntry(entry: EntryInput): JournalEntry {
  const lines: JournalEntryLine[] = entry.lines.map((l) =>
    Object.freeze({
      account: toAccount(l),
      amount: toMoney(l.amount, l.currency),
      side: l.side as Side,
      tags: l.tags ? Object.freeze({ ...l.tags }) : undefined,
    }),
  );
  return new JournalEntry(
    entry.id,
    entry.effectiveDate,
    lines,
    entry.description,
    entry.citations,
    entry.tags,
  );
}

/** Parse a serialized ledger or start from empty. Throws on malformed input. */
export function parseLedger(serialized: unknown): Ledger {
  if (serialized == null) return emptyLedger();
  return Ledger.fromJSON(serialized);
}

/** Find the real Account (with correct type/normalBalance) already posted in a ledger. */
export function findAccount(ledger: Ledger, code: string): Account | undefined {
  for (const e of ledger.entries) {
    for (const l of e.lines) {
      if (l.account.code === code) return l.account;
    }
  }
  return undefined;
}

/** Map a friendly rounding name to the decimal.js rounding mode the kernel expects. */
export function roundingModeFor(name?: string): number | undefined {
  if (!name) return undefined;
  if (name === 'HALF_UP') return ROUND_HALF_UP;
  return undefined;
}

export function makeFxRate(rate: { from: string; to: string; rate: string }): FXRate {
  return new FXRate(rate.from, rate.to, rate.rate);
}
