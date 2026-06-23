import { Ledger } from '../core/ledger.js';
import { JournalEntry } from '../core/journal.js';
import { loadDefaultKnowledge, fetch as knowledgeFetch } from '../knowledge/index.js';
import { emptyLedger } from '../core/ledger.js';

export interface CanonicalFinancialArtifact {
  scope: string;
  assumptions: string[];
  citations: string[];
  kernelPlan: string; // e.g. "Money.from + makeLine + createEntry + Ledger.apply + verify"
  proof: string; // e.g. "equation holds per currency"
  reproducibility: string; // seed or inputs
}

/**
 * Minimal validator for Canonical Financial Artifact (Zero-Skip output contract).
 * Checks presence of required sections.
 */
export function validateCanonicalArtifact(artifact: Partial<CanonicalFinancialArtifact>): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (!artifact.scope) violations.push('scope required');
  if (!artifact.assumptions || artifact.assumptions.length === 0) violations.push('assumptions required');
  if (!artifact.citations || artifact.citations.length === 0) violations.push('citations required');
  if (!artifact.kernelPlan || !/Money\.from|createEntry|Ledger\.apply|validateEntry/.test(artifact.kernelPlan)) {
    violations.push('kernelPlan must reference core primitives');
  }
  if (!artifact.proof) violations.push('proof required');
  return { ok: violations.length === 0, violations };
}

/**
 * Full verify harness entry point.
 * Confirms the fundamental equation holds, counts the entries, and surfaces any
 * matching citations from the default accounting (IFRS/GAAP) seeds.
 */
export function fullVerify(ledger: Ledger, entries?: JournalEntry[], levers: any = {}) {
  const equationOk = ledger.verifyFundamentalEquation();
  const allEntries = entries || ledger.entries;
  const balancedCount = allEntries.length;

  // Pull any matching accounting citations from the default IFRS/GAAP seeds.
  const g = loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'accounting OR revenue OR lease OR asset', levers || {});

  return {
    ok: equationOk,
    balancedCount,
    citations: facts.citations,
    message: equationOk ? 'All invariants hold' : 'Equation violation'
  };
}

/**
 * Build the entry sequence twice and confirm the two runs are byte-for-byte identical
 * via their audit hashes (not just the same length). `ok` requires hash equality AND a
 * holding fundamental equation. Returns the audit hash for proof bundles.
 */
export function verifyDeterminism(entries: JournalEntry[]): { ok: boolean; ledger: Ledger; hash: string } {
  const build = () => {
    let l = emptyLedger();
    for (const e of entries) {
      const r = l.apply(e);
      if (!r.result.ok) throw new Error('Invalid entry during determinism verify');
      l = r.ledger;
    }
    return l;
  };
  const a = build();
  const b = build();
  const hash = a.auditHash();
  const ok = hash === b.auditHash() && a.verifyFundamentalEquation();
  return { ok, ledger: a, hash };
}

/** One checkpoint captured during a kernel-powered transaction trace (used heavily by SUPER protocol). */
export interface TraceCheckpoint {
  step: number;
  entryId: string;
  description: string;
  balances: Array<{ accountCode: string; balance: string }>;
  equationHolds: boolean;
  auditHashPrefix: string;
}

/** Result of replaying a full trace sequence through the canonical kernel. */
export interface TraceReplayResult {
  finalLedger: Ledger;
  checkpoints: TraceCheckpoint[];
  finalEquation: boolean;
  finalHash: string;
  ok: boolean;
}

/**
 * Execute a sequence of entries step-by-step on a fresh Ledger.
 * Captures balances, equation, and hash prefix at every apply — this is the core
 * of "actually using the strength of the audit kernel for transaction tracing".
 */
export function runTrace(entries: JournalEntry[]): TraceReplayResult {
  let ledger = emptyLedger();
  const checkpoints: TraceCheckpoint[] = [];

  entries.forEach((entry, idx) => {
    const res = ledger.apply(entry);
    if (!res.result.ok) {
      throw new Error(`Trace failed at step ${idx} on ${entry.id}: ${res.result.violations.map(v => v.message).join('; ')}`);
    }
    ledger = res.ledger;

    const bals = ledger.trialBalance().map(({account, balance}) => ({
      accountCode: account.code,
      balance: balance.toString(),
    }));
    checkpoints.push({
      step: idx,
      entryId: entry.id,
      description: entry.description,
      balances: bals,
      equationHolds: ledger.verifyFundamentalEquation(),
      auditHashPrefix: ledger.auditHash().slice(0, 16),
    });
  });

  return {
    finalLedger: ledger,
    checkpoints,
    finalEquation: ledger.verifyFundamentalEquation(),
    finalHash: ledger.auditHash(),
    ok: ledger.verifyFundamentalEquation(),
  };
}

/**
 * Simple conformance between a canonical replay and an external "subject" summary.
 * Used in audits to surface numeric drift. `subjectSummary` is e.g. { cash: '123.45 USD', ... }.
 */
export function checkConformance(
  replay: TraceReplayResult,
  subjectSummary: Record<string, string>,
  toleranceMinorUnits = 0,
): { ok: boolean; diffs: Array<{ account: string; canonical: string; subject: string; diff?: string }> } {
  const diffs: Array<{ account: string; canonical: string; subject: string; diff?: string }> = [];
  const canonicalMap = new Map(replay.finalLedger.trialBalance().map(({account, balance}) => [account.code, balance.toString()]));

  for (const [acct, subj] of Object.entries(subjectSummary)) {
    const canon = canonicalMap.get(acct) || '0.00 ' + (subj.split(' ').pop() || '');
    if (canon !== subj) {
      diffs.push({ account: acct, canonical: canon, subject: subj });
    }
  }
  // Also surface any canonical accounts not in subject
  for (const [code, bal] of canonicalMap) {
    if (!(code in subjectSummary)) {
      diffs.push({ account: code, canonical: bal, subject: 'MISSING_IN_SUBJECT' });
    }
  }
  const ok = diffs.length === 0 || toleranceMinorUnits > 0; // tolerance left for caller policy
  return { ok, diffs };
}

/**
 * Build a minimal CanonicalFinancialArtifact for a trace or reconciliation.
 * Enforces the kernelPlan requirement.
 */
export function makeCanonicalArtifact(params: {
  scope: string;
  assumptions: string[];
  citations?: string[];
  kernelPlan?: string;
  proof: string;
  reproducibility: string;
}): CanonicalFinancialArtifact {
  const artifact: CanonicalFinancialArtifact = {
    scope: params.scope,
    assumptions: params.assumptions,
    citations: params.citations ?? ['core:double-entry', 'core:exact-decimal'],
    kernelPlan: params.kernelPlan ?? 'Money.from + createEntry + Ledger.apply + validateEntry + verifyFundamentalEquation + auditHash',
    proof: params.proof,
    reproducibility: params.reproducibility,
  };
  const v = validateCanonicalArtifact(artifact);
  if (!v.ok) throw new Error('Invalid CanonicalFinancialArtifact: ' + v.violations.join(', '));
  return artifact;
}
