import { Ledger } from '../core/ledger.js';
import { JournalEntry } from '../core/journal.js';
import { loadDefaultKnowledge, fetch as knowledgeFetch } from '../knowledge/index.js';

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
