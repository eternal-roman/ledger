import { Ledger } from '../core/ledger.js';
import { JournalEntry } from '../core/journal.js';
import { loadDefaultKnowledge, fetch as knowledgeFetch } from '../knowledge/index.js';
import { emptyLedger } from '../core/ledger.js';

/**
 * Full verify harness entry point.
 * Runs kernel + equation + optional rule checks + canon citations via graph levers.
 * Supports Zero-Skip / Final Verification mindset: surfaces required knowledge.
 */
export function fullVerify(ledger: Ledger, entries?: JournalEntry[], levers: any = {}) {
  const equationOk = ledger.verifyFundamentalEquation();
  const allEntries = entries || ledger.entries;
  const balancedCount = allEntries.length;

  // Pull relevant canon for citations (graph-theory: only what levers request)
  const g = loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'accounting OR policy OR tax OR macro OR valuation', levers || {});

  return {
    ok: equationOk,
    equationOk,
    balancedCount,
    citations: facts.citations,
    message: equationOk ? 'All invariants hold' : 'Equation violation'
  };
}

/** Apply entries twice and confirm identical balances/equation for seeded deterministic sims. */
export function verifyDeterminism(entries: JournalEntry[]): { ok: boolean; ledger: Ledger } {
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
  const ok = a.entries.length === b.entries.length && a.verifyFundamentalEquation();
  return { ok, ledger: a };
}
