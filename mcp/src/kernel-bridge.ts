/**
 * Bridge between agent-friendly JSON and the @eternal-roman/ledger kernel.
 *
 * The whole point of this MCP server is that the agent never does money math or
 * balance checks "in-token": it hands structured intent to these helpers, which
 * run the real, deterministic, audit-hashed kernel and hand back proofs.
 */
import * as L from '@eternal-roman/ledger';
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
export const serializedLedgerSchema = z
  .object({
    v: z.string(),
    entries: z.array(z.any()),
  })
  .passthrough()
  .optional()
  .describe('Serialized ledger (Ledger.toJSON shape). Strict shape for MCP; kernel fromJSON does final validation.');

export const ledgerSchema = serializedLedgerSchema;

/** First-class verification: after any kernel op returning ledger, re-verify with kernel primitives.
 * Ensures MCP never returns mistaken/unverified state. */
export function verifyKernelLedger(ledger: any): { ok: boolean; equation: boolean; entryCount: number; auditHash?: string } {
  if (!ledger || typeof ledger.verifyFundamentalEquation !== 'function') {
    return { ok: false, equation: false, entryCount: 0 };
  }
  const equation = ledger.verifyFundamentalEquation();
  const entryCount = Array.isArray(ledger.entries) ? ledger.entries.length : 0;
  const auditHash = typeof ledger.auditHash === 'function' ? ledger.auditHash() : undefined;
  return { ok: equation, equation, entryCount, auditHash };
}

export function toAccount(line: LineInput): L.Account {
  return new L.Account(line.accountCode, line.accountName, line.accountType as L.AccountType);
}

export function toMoney(amount: string, currency: string): L.Money {
  // Money.from rejects non-integer JS numbers; we only ever pass strings, so a
  // sub-scale or negative value flows through to validateEntry as a violation
  // rather than being silently coerced.
  return L.Money.from(amount, currency);
}

/**
 * Build a JournalEntry WITHOUT throwing on bad lines, so validateEntry can report
 * structured violations (the guardrail) instead of the kernel factory throwing.
 * Lines are built directly (not via makeLine) to avoid its strictly-positive guard.
 */
export function toUnvalidatedEntry(entry: EntryInput): L.JournalEntry {
  const lines: L.JournalEntryLine[] = entry.lines.map((l) =>
    Object.freeze({
      account: toAccount(l),
      amount: toMoney(l.amount, l.currency),
      side: l.side as L.Side,
      tags: l.tags ? Object.freeze({ ...l.tags }) : undefined,
    }),
  );
  return new L.JournalEntry(
    entry.id,
    entry.effectiveDate,
    lines,
    entry.description,
    entry.citations,
    entry.tags,
  );
}

/** Parse a serialized ledger or start from empty. Throws on malformed input. */
export function parseLedger(serialized: unknown): L.Ledger {
  if (serialized == null) return L.emptyLedger();
  return L.Ledger.fromJSON(serialized);
}

/** Find the real Account (with correct type/normalBalance) already posted in a ledger. */
export function findAccount(ledger: L.Ledger, code: string): L.Account | undefined {
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
  if (name === 'HALF_UP') return L.ROUND_HALF_UP;
  return undefined;
}

export function makeFxRate(rate: { from: string; to: string; rate: string }): L.FXRate {
  return new L.FXRate(rate.from, rate.to, rate.rate);
}
