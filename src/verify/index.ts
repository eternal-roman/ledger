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
