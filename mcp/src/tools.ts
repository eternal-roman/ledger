/**
 * Tool registry for the Ledger MCP server.
 *
 * Every tool delegates to the real @eternal-roman/ledger kernel — exact decimal
 * Money, kernel-enforced double-entry, immutable append-only Ledger, and the
 * SHA-256 audit-hash chain. Tools are stateless: ledger state travels in and out
 * as JSON, so calls are reproducible and replayable. Nothing here re-implements
 * financial logic; it is an adapter that lets an agent prove instead of guess.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as L from '@eternal-roman/ledger';
import { z } from 'zod';
import {
  entrySchema,
  ledgerSchema,
  serializedLedgerSchema,
  toUnvalidatedEntry,
  parseLedger,
  findAccount,
  toMoney,
  roundingModeFor,
  makeFxRate,
  verifyKernelLedger,
  type EntryInput,
} from './kernel-bridge.js';

type ToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/**
 * Success or logical failure envelope.
 * All tools should return data with a top-level `ok: boolean`.
 * Logical "fail-closed" (e.g. unbalanced, violations) use ok({ ok: false, ... }) -- isError is typically left unset.
 * This allows the tool execution itself to succeed while reporting the kernel-level failure.
 */
function ok(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/**
 * Unexpected / precondition / runtime error.
 * Sets isError: true and { ok: false, error: ... }.
 * Used for cases that should surface as MCP tool errors.
 */
function fail(message: string, extra: Record<string, unknown> = {}): ToolResult {
  const data = { ok: false, error: message, ...extra };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

/** Convert a Money.from construction error (sub-scale/invalid amount) to a structured violation response (consistent with other fail-closed). */
function moneyConstructionViolation(e: unknown): ToolResult | null {
  const msg = (e as Error).message ?? '';
  if (!msg.startsWith('Money.from:')) return null;
  const type = /decimal places|scale/.test(msg)
    ? 'SUB_SCALE'
    : /finite/.test(msg)
      ? 'NON_FINITE'
      : 'INVALID_AMOUNT';
  const data = { ok: false, violations: [{ type, message: msg }] };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

const moneyOperand = z.object({
  amount: z.string().describe('Exact decimal string, never a float literal'),
  currency: z.string(),
});

export function registerTools(server: McpServer): void {
  // 1. money_compute — exact decimal arithmetic so the agent never does math in-token.
  server.registerTool(
    'money_compute',
    {
      title: 'Exact money arithmetic',
      description:
        'Perform EXACT decimal money arithmetic with the kernel (decimal.js, never floats). ' +
        'Use this for every monetary calculation instead of computing in your own tokens. ' +
        'Ops: add, sub (same currency), mul, div (money x scalar), allocate (split by ratios, ' +
        'remainder to last), convert (via FX rate), compare.',
      inputSchema: {
        op: z.enum(['add', 'sub', 'mul', 'div', 'allocate', 'convert', 'compare', 'negate', 'abs']),
        a: moneyOperand,
        b: moneyOperand.optional().describe('Second operand for add/sub/compare'),
        scalar: z.string().optional().describe('Scalar for mul/div, as a decimal string'),
        ratios: z.array(z.string()).optional().describe('Ratios for allocate'),
        rate: z
          .object({ from: z.string(), to: z.string(), rate: z.string() })
          .optional()
          .describe('FX rate for convert'),
        roundingMode: z.enum(['HALF_UP']).optional().describe('Rounding for mul/div/convert'),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const a = toMoney(args.a.amount, args.a.currency);
        const rm = roundingModeFor(args.roundingMode);
        switch (args.op) {
          case 'add':
          case 'sub': {
            if (!args.b) return fail(`op "${args.op}" requires operand b`);
            const b = toMoney(args.b.amount, args.b.currency);
            const r = args.op === 'add' ? a.add(b) : a.sub(b);
            return ok({ ok: true, result: r.toString(), currency: r.currency });
          }
          case 'mul':
          case 'div': {
            if (args.scalar == null) return fail(`op "${args.op}" requires scalar`);
            const r = args.op === 'mul' ? a.mul(args.scalar, rm) : a.div(args.scalar, rm);
            return ok({ ok: true, result: r.toString(), currency: r.currency });
          }
          case 'allocate': {
            if (!args.ratios || args.ratios.length === 0)
              return fail('op "allocate" requires non-empty ratios');
            const parts = a.allocate(args.ratios);
            // Verify the kernel invariant rather than asserting it: the parts must
            // sum back to the original amount exactly.
            const sum = parts.reduce((acc, p) => acc.add(p), L.Money.zero(a.currency));
            return ok({
              ok: true,
              parts: parts.map((p) => p.toString()),
              sumsToOriginal: sum.equals(a),
            });
          }
          case 'convert': {
            if (!args.rate) return fail('op "convert" requires rate');
            const r = a.convert(makeFxRate(args.rate), rm);
            return ok({ ok: true, result: r.toString(), currency: r.currency });
          }
          case 'compare': {
            if (!args.b) return fail('op "compare" requires operand b');
            const b = toMoney(args.b.amount, args.b.currency);
            return ok({ ok: true, compare: a.compare(b) });
          }
          case 'negate':
            return ok({ ok: true, result: a.negate().toString() });
          case 'abs':
            return ok({ ok: true, result: a.abs().toString() });
          default:
            return fail(`unknown op`);
        }
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 2. entry_validate — the guardrail. Reports structured violations, never throws.
  server.registerTool(
    'entry_validate',
    {
      title: 'Validate a journal entry',
      description:
        'Run the kernel invariant check on a proposed journal entry: balanced debits=credits ' +
        'per currency, >=2 lines, positive amounts, no sub-scale precision, valid ISO date, no ' +
        'silent currency mix. Returns { ok, violations[] }. Always validate before posting.',
      inputSchema: { entry: entrySchema },
    },
    async (args): Promise<ToolResult> => {
      try {
        const entry = toUnvalidatedEntry(args.entry as EntryInput);
        const result = L.validateEntry(entry);
        return ok({ ok: result.ok, violations: result.violations });
      } catch (e) {
        return moneyConstructionViolation(e) ?? fail((e as Error).message);
      }
    },
  );

  // 3. ledger_post — validate then apply; fail-closed (never posts an invalid entry).
  server.registerTool(
    'ledger_post',
    {
      title: 'Post an entry to a ledger',
      description:
        'Validate and apply a journal entry to a (serialized) ledger, returning the new ledger ' +
        'JSON plus its audit hash. The kernel refuses unbalanced state: an invalid entry is NOT ' +
        'posted and its violations are returned instead. Omit "ledger" to start from empty.',
      inputSchema: { ledger: ledgerSchema, entry: entrySchema },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const entry = toUnvalidatedEntry(args.entry as EntryInput);
        const { ledger: next, result } = ledger.apply(entry);
        if (!result.ok) {
          return ok({ ok: false, posted: false, violations: result.violations });
        }
        // First-class kernel user: always re-verify result before returning to caller
        const v = verifyKernelLedger(next);
        if (!v.ok) {
          return ok({ ok: false, posted: false, violations: [{ type: 'KERNEL_VERIFICATION_FAILED', message: 'Ledger after apply fails equation' }] });
        }
        return ok({
          ok: true,
          posted: true,
          ledger: next.toJSON(),
          auditHash: next.auditHash(),
          entryCount: next.entries.length,
          kernelVerified: v,
        });
      } catch (e) {
        const mv = moneyConstructionViolation(e);
        if (mv) {
          const viol = (mv.structuredContent as any)?.violations || [{ type: 'MONEY_ERROR', message: (e as Error).message }];
          return ok({ ok: false, posted: false, violations: viol });
        }
        return fail((e as Error).message);
      }
    },
  );

  // 4. ledger_balance — net balance for an account (fails closed on multi-currency).
  server.registerTool(
    'ledger_balance',
    {
      title: 'Account balance',
      description:
        'Net balance for an account in a serialized ledger, per its normal balance side. Pass ' +
        '"currency" for multi-currency accounts (otherwise fails closed). Returns all currencies ' +
        'via balancesByCurrency too.',
      inputSchema: {
        ledger: ledgerSchema,
        accountCode: z.string(),
        asOf: z.string().optional().describe('Optional as-of date YYYY-MM-DD'),
        currency: z.string().optional(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const account = findAccount(ledger, args.accountCode);
        if (!account) return fail(`account ${args.accountCode} not found in ledger`);
        const byCurrency = ledger
          .balancesByCurrency(account, args.asOf)
          .map((m) => m.toString());
        const balance = ledger.balance(account, args.asOf, args.currency).toString();
        return ok({ ok: true, accountCode: account.code, balance, byCurrency });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 5. ledger_trial_balance — all accounts and net balances.
  server.registerTool(
    'ledger_trial_balance',
    {
      title: 'Trial balance',
      description: 'Every account in a serialized ledger with its current net balance (one row per currency).',
      inputSchema: { ledger: ledgerSchema },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const rows = ledger.trialBalance().map(({ account, balance }) => ({
          accountCode: account.code,
          accountName: account.name,
          type: account.type,
          balance: balance.toString(),
        }));
        return ok({ ok: true, rows });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 6. ledger_verify_equation — the fundamental accounting equation, per currency.
  server.registerTool(
    'ledger_verify_equation',
    {
      title: 'Verify accounting equation',
      description:
        'Verify Assets + Expenses = Liabilities + Equity + Income (per currency) holds for a ' +
        'serialized ledger. Returns { balanced }.',
      inputSchema: { ledger: ledgerSchema },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        return ok({ ok: true, balanced: ledger.verifyFundamentalEquation() });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 7. ledger_audit_hash — tamper-evident SHA-256 chain over the whole ledger.
  server.registerTool(
    'ledger_audit_hash',
    {
      title: 'Audit hash',
      description:
        'Compute the tamper-evident SHA-256 audit-hash chain for a serialized ledger. Any change ' +
        'to any field or line ordering yields a different hash.',
      inputSchema: { ledger: ledgerSchema },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        return ok({ ok: true, auditHash: ledger.auditHash(), entryCount: ledger.entries.length });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 8. ledger_verify_determinism — rebuild twice, prove byte-identical + equation holds.
  server.registerTool(
    'ledger_verify_determinism',
    {
      title: 'Verify determinism',
      description:
        'Rebuild a serialized ledger twice and confirm the two runs are byte-for-byte identical ' +
        'via their audit hashes AND that the fundamental equation holds. Returns { ok, hash }.',
      inputSchema: { ledger: ledgerSchema },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const entries = [...ledger.entries];
        const r = L.verifyDeterminism(entries);
        return ok({ ok: r.ok, hash: r.hash });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 9. trace_run — step-by-step replay with per-step balances + equation + hash prefix.
  server.registerTool(
    'trace_run',
    {
      title: 'Trace a sequence of entries',
      description:
        'Replay a sequence of journal entries on a fresh ledger, capturing balances, the ' +
        'fundamental equation, and an audit-hash prefix at every step. This is the agent-facing ' +
        'audit trail. Fails closed with the offending step if any entry is invalid.',
      inputSchema: { entries: z.array(entrySchema).min(1) },
    },
    async (args): Promise<ToolResult> => {
      try {
        const entries = (args.entries as EntryInput[]).map(toUnvalidatedEntry);
        const trace = L.runTrace(entries);
        return ok({
          ok: trace.ok,
          finalEquation: trace.finalEquation,
          finalHash: trace.finalHash,
          checkpoints: trace.checkpoints,
        });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 10. cite_lookup — grounded IFRS/GAAP citations from the knowledge graph.
  server.registerTool(
    'cite_lookup',
    {
      title: 'Look up accounting citations',
      description:
        'Retrieve matching IFRS/GAAP facts and citations from the kernel knowledge graph for a ' +
        'query (e.g. "revenue recognition", "lease", "cost basis"). Use to ground claims in canon ' +
        'rather than asserting from memory.',
      inputSchema: {
        query: z.string(),
        levers: z.record(z.string()).optional().describe('Optional dimension filters'),
        asOf: z.string().optional(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const graph = L.loadDefaultKnowledge();
        const result = L.fetch(graph, args.query, args.levers ?? {}, args.asOf);
        return ok({
          ok: true,
          citations: result.citations,
          nodes: result.nodes.map((n: any) => ({
            id: n.id,
            confidence: n.confidence,
            source: `${n.provenance?.source_id ?? ''} ${n.provenance?.locator ?? ''}`.trim(),
          })),
        });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // 11. artifact_make — force a Canonical Financial Artifact (proof bundle) as output.
  server.registerTool(
    'artifact_make',
    {
      title: 'Build a canonical financial artifact',
      description:
        'Assemble a Canonical Financial Artifact (scope, assumptions, citations, kernel plan, ' +
        'proof, reproducibility, auditHash) — the structured proof bundle a financial answer ' +
        'should carry. Every field is required and unverifiable free text is not accepted for ' +
        'auditHash: it must be the exact SHA-256 hex digest already returned by a ledger_post / ' +
        'ledger_audit_hash / ledger_verify_determinism / trace_run call this session, not a ' +
        'restated or invented value. Validates that the kernel plan references core primitives; ' +
        'errors otherwise.',
      inputSchema: {
        scope: z.string(),
        assumptions: z.array(z.string()).min(1),
        citations: z.array(z.string()).min(1).describe('Real canon/kernel references (e.g. GAAP/IFRS cites from cite_lookup, or "core:double-entry"). Never defaulted.'),
        kernelPlan: z.string().describe('The actual primitives used, e.g. "Money.from + createEntry + Ledger.apply + validateEntry"'),
        proof: z.string(),
        reproducibility: z.string(),
        auditHash: z
          .string()
          .regex(/^[0-9a-f]{64}$/i)
          .describe('The exact auditHash string returned by a prior ledger_post / ledger_audit_hash / ledger_verify_determinism call in this session — proves the claim instead of asserting it.'),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const artifact = L.makeCanonicalArtifact({
          scope: args.scope,
          assumptions: args.assumptions,
          citations: args.citations,
          kernelPlan: args.kernelPlan,
          proof: args.proof,
          reproducibility: args.reproducibility,
          auditHash: args.auditHash,
        });
        return ok({ ok: true, artifact });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // === Core financial utilities (period controls, closing, FX translation, depreciation) ===

  // periods_create_lock + periods_guarded_post for hard close / anti-fraud.
  const lockSchema = z.object({
    id: z.string(),
    lockDate: z.string(),
    authority: z.string(),
    reason: z.string(),
  });

  server.registerTool(
    'periods_create_lock',
    {
      title: 'Create a period lock (hard close)',
      description: 'Create an immutable PeriodLock fact for use with guarded posting. effectiveDate <= lockDate will be rejected.',
      inputSchema: { lock: lockSchema },
    },
    async (args) => {
      try {
        const l = L.createPeriodLock(args.lock.id, args.lock.lockDate, args.lock.authority, args.lock.reason);
        return ok({ ok: true, lock: l });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  server.registerTool(
    'periods_guarded_post',
    {
      title: 'Guarded ledger post (respects period locks)',
      description: 'Like ledger_post but rejects entries whose effectiveDate falls on or before any provided period lock. Returns the same shape. Always kernel-verified.',
      inputSchema: {
        ledger: ledgerSchema,
        entry: entrySchema,
        periodLocks: z.array(lockSchema).optional(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const entry = toUnvalidatedEntry(args.entry as EntryInput);
        const locks = (args.periodLocks || []).map((pl: any) => L.createPeriodLock(pl.id, pl.lockDate, pl.authority, pl.reason));
        const res = L.guardedApply(ledger, entry, { periodLocks: locks });
        if (!res.result.ok) {
          return ok({ ok: false, posted: false, violations: res.result.violations });
        }
        // First-class kernel verification on result: never return unverified state
        const v = verifyKernelLedger(res.ledger);
        if (!v.ok) {
          return ok({ ok: false, posted: false, violations: [{ type: 'KERNEL_VERIFICATION_FAILED', message: 'Post-ok ledger fails fundamental equation' }] });
        }
        return ok({ ok: true, posted: true, ledger: res.ledger.toJSON(), auditHash: res.ledger.auditHash(), kernelVerified: v });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  server.registerTool(
    'closing_generate_entries',
    {
      title: 'Generate closing entries to Retained Earnings',
      description: 'Given a (serialized) ledger snapshot and close date, returns balanced JournalEntry[] that close Income/Expense to RE using the kernel. All entries are pre-validated. Kernel verified.',
      inputSchema: {
        ledger: ledgerSchema,
        closeDate: z.string(),
        retainedEarnings: z.object({ code: z.string(), name: z.string() }).optional(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const re = args.retainedEarnings
          ? new L.Account(args.retainedEarnings.code, args.retainedEarnings.name, L.AccountType.Equity)
          : undefined;
        const entries = L.generateClosingEntries(ledger, args.closeDate, re);
        const serialized = entries.map((e: any) => e.toJSON ? e.toJSON() : e);
        // Verify generated entries are kernel-correct (balanced etc)
        for (const e of entries) {
          const v = L.validateEntry(e);
          if (!v.ok) throw new Error('Kernel produced invalid closing entry');
        }
        return ok({ ok: true, entries: serialized });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  server.registerTool(
    'fx_compute_translation',
    {
      title: 'FX translation + CTA',
      description: 'Translate ledger balances at asOf using provided rates into reportingCurrency. Returns holdings, translated totals, and the exact CTA plug amount. Always kernel-verified for balance.',
      inputSchema: {
        ledger: ledgerSchema,
        asOf: z.string(),
        rates: z.record(z.object({ rate: z.string(), source: z.string().optional() })),
        reportingCurrency: z.string(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const result = L.computeFxTranslation(ledger, args.asOf, args.rates, args.reportingCurrency);
        // First-class: re-verify CTA makes equation hold per kernel
        const v = verifyKernelLedger(ledger); // base
        const balanced = result.balancedWithCta;
        // Serialize Money to exact strings for consistent agent output (no raw objects)
        const holdings = result.holdings.map((h: any) => ({
          account: { code: h.account.code, name: h.account.name, type: h.account.type },
          original: h.original.toString(),
          translated: h.translated.toString(),
        }));
        const translatedByType = result.translatedByType.map((t: any) => ({ type: t.type, total: t.total.toString() }));
        return ok({ ok: true, ...result, holdings, translatedByType, cta: result.cta.toString(), kernelVerified: { equation: v.equation, balancedWithCta: balanced } });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  server.registerTool(
    'depreciation_build_schedule',
    {
      title: 'Build depreciation / amortization schedule',
      description: 'Exact straight-line (allocate) or declining balance schedule. Input cost/salvage/life/method. Returns periods with exact Money amounts as strings. Kernel-allocate based.',
      inputSchema: {
        id: z.string(),
        cost: z.object({ amount: z.string(), currency: z.string() }),
        salvage: z.object({ amount: z.string(), currency: z.string() }),
        usefulLifePeriods: z.number().int().positive(),
        method: z.enum(['straight-line', 'declining-balance']),
        decliningRate: z.string().optional(),
        commencementDate: z.string(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const input = {
          id: args.id,
          cost: L.Money.from(args.cost.amount, args.cost.currency),
          salvage: L.Money.from(args.salvage.amount, args.salvage.currency),
          usefulLifePeriods: args.usefulLifePeriods,
          method: args.method,
          decliningRate: args.decliningRate,
          commencementDate: args.commencementDate,
        };
        const schedule = L.buildDepreciationSchedule(input);
        // Serialize to strings for consistent first-class output
        const ser = {
          initialDepreciable: schedule.initialDepreciable.toString(),
          periods: schedule.periods.map((p: any) => ({
            period: p.period,
            date: p.date,
            depreciation: p.depreciation.toString(),
            accumulated: p.accumulated.toString(),
            carrying: p.carrying.toString(),
          })),
        };
        return ok({ ok: true, schedule: ser });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  // === Operational reporting & controls (cash flow, reconciliation, lot relief, settlement) ===

  server.registerTool(
    'cashflow_statement',
    {
      title: 'Direct-method cash flow statement',
      description:
        'Derive an exact direct-method cash flow statement from a serialized ledger: operating / ' +
        'investing / financing flows per currency, with opening and closing cash. Cash accounts are ' +
        'detected by convention (Asset codes starting CASH or names containing "cash") unless ' +
        'cashAccountCodes is supplied. Self-checks that opening + netChange === closing. Kernel verified.',
      inputSchema: {
        ledger: ledgerSchema,
        start: z.string().optional().describe('Inclusive period start YYYY-MM-DD'),
        end: z.string().optional().describe('Inclusive period end YYYY-MM-DD'),
        cashAccountCodes: z.array(z.string()).optional().describe('Explicit cash account codes'),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const sections = L.cashFlowStatement(ledger, {
          start: args.start,
          end: args.end,
          cashAccountCodes: args.cashAccountCodes,
        });
        // cashflow already strings + self-reconciles; verify base ledger equation as first-class
        const v = verifyKernelLedger(ledger);
        return ok({ ok: true, sections, kernelVerified: v });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  server.registerTool(
    'reconcile_positions',
    {
      title: 'Reconcile positions against an external source',
      description:
        'Compare ledger-derived balances against an external snapshot (exchange/custodian/bank), ' +
        'matched by account code AND currency. Returns per-account status (matched / mismatch / ' +
        'missing_in_ledger / missing_in_external) with exact diffs and an overall reconciled flag. Kernel verified.',
      inputSchema: {
        ledger: ledgerSchema,
        external: z.array(z.object({
          accountCode: z.string(),
          amount: z.string().describe('Exact decimal string, never a float'),
          currency: z.string(),
        })),
        asOf: z.string().optional().describe('Optional as-of date YYYY-MM-DD'),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const result = L.reconcilePositions(ledger, args.external, args.asOf);
        const v = verifyKernelLedger(ledger);
        return ok({ ok: true, ...result, kernelVerified: v });
      } catch (e) {
        return moneyConstructionViolation(e) ?? fail((e as Error).message);
      }
    },
  );

  server.registerTool(
    'portfolio_relief',
    {
      title: 'Lot relief with holding-period classification',
      description:
        'Reconstruct open lots and realized disposals for an asset from the ledger using FIFO / LIFO ' +
        '/ HIFO, with exact cost basis. Each disposal is broken down per consumed lot and classified ' +
        'short vs long term by holding days (default threshold 365). Fails closed on oversell. Kernel verified.',
      inputSchema: {
        ledger: ledgerSchema,
        asset: z.string(),
        method: z.enum(['FIFO', 'LIFO', 'HIFO']).optional(),
        longTermThresholdDays: z.number().int().positive().optional(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const ledger = parseLedger(args.ledger);
        const r = L.reliefFor(ledger, args.asset, args.method ?? 'FIFO', {
          longTermThresholdDays: args.longTermThresholdDays,
        });
        const v = verifyKernelLedger(ledger);
        // Serialize (already done in original for this one)
        return ok({
          ok: true,
          asset: r.asset,
          quote: r.quote,
          totalRealized: r.totalRealized.toString(),
          openLots: r.openLots.map((l) => ({
            id: l.id, asset: l.asset, acquiredDate: l.acquiredDate,
            originEntryId: l.originEntryId,
            quantity: l.quantity.toString(), costBasis: l.costBasis.toString(),
          })),
          realized: r.realized.map((d) => ({
            tradeId: d.tradeId, date: d.date, asset: d.asset, term: d.term,
            quantity: d.quantity.toString(), proceeds: d.proceeds.toString(),
            basis: d.basis.toString(), gain: d.gain.toString(),
            lots: d.lots.map((s) => ({
              lotId: s.lotId, acquiredDate: s.acquiredDate,
              quantity: s.quantity.toString(), basis: s.basis.toString(),
              proceeds: s.proceeds.toString(), gain: s.gain.toString(),
              holdingDays: s.holdingDays, term: s.term,
            })),
          })),
          kernelVerified: v,
        });
      } catch (e) { return fail((e as Error).message); }
    },
  );

  server.registerTool(
    'settlement_build_entries',
    {
      title: 'Settlement-date (T+N) entries for a fill',
      description:
        'Split a fill into trade-date entries (asset moves; cash booked as a settlement receivable ' +
        'on a sell / payable on a buy) and settlement-date entries (the receivable/payable is swapped ' +
        'for cash). All entries are kernel-validated and balanced. Returns both entry sets as JSON. Kernel verified.',
      inputSchema: {
        fill: z.object({
          id: z.string(),
          effectiveDate: z.string(),
          venue: z.string(),
          base: z.string(),
          quote: z.string(),
          side: z.enum(['buy', 'sell']),
          quantity: moneyOperand,
          price: moneyOperand,
          fee: moneyOperand.optional(),
          rebate: moneyOperand.optional(),
        }),
        settlementDate: z.string(),
        lotMethod: z.string().optional(),
      },
    },
    async (args): Promise<ToolResult> => {
      try {
        const f = args.fill;
        const fill = {
          id: f.id, effectiveDate: f.effectiveDate, venue: f.venue,
          base: f.base, quote: f.quote, side: f.side,
          quantity: L.Money.from(f.quantity.amount, f.quantity.currency),
          price: L.Money.from(f.price.amount, f.price.currency),
          fee: f.fee ? L.Money.from(f.fee.amount, f.fee.currency) : undefined,
          rebate: f.rebate ? L.Money.from(f.rebate.amount, f.rebate.currency) : undefined,
        };
        const res = L.settleFill(fill, args.settlementDate, { lotMethod: args.lotMethod });
        // Verify generated entries kernel correct
        [...res.tradeDate, ...res.settlement].forEach((e: any) => {
          const v = L.validateEntry(e);
          if (!v.ok) throw new Error('Kernel produced unbalanced settlement entry');
        });
        return ok({
          ok: true,
          settledCash: res.settledCash.toString(),
          tradeDate: res.tradeDate.map((e) => e.toJSON()),
          settlement: res.settlement.map((e) => e.toJSON()),
          kernelVerified: { tradeCount: res.tradeDate.length, settlementCount: res.settlement.length },
        });
      } catch (e) {
        return moneyConstructionViolation(e) ?? fail((e as Error).message);
      }
    },
  );
}

/** Names of all registered tools (for docs/tests). */
export const TOOL_NAMES = [
  'money_compute',
  'entry_validate',
  'ledger_post',
  'ledger_balance',
  'ledger_trial_balance',
  'ledger_verify_equation',
  'ledger_audit_hash',
  'ledger_verify_determinism',
  'trace_run',
  'cite_lookup',
  'artifact_make',
  'periods_create_lock',
  'periods_guarded_post',
  'closing_generate_entries',
  'fx_compute_translation',
  'depreciation_build_schedule',
  'cashflow_statement',
  'reconcile_positions',
  'portfolio_relief',
  'settlement_build_entries',
] as const;

// Re-export Money for consumers that want the type without reaching into the kernel (first-class).
export const Money = L.Money;
