import { JournalEntry, validateEntry } from '../core/journal.js';
import { AccountType } from '../core/account.js';
import { KnowledgeGraph, fetch as knowledgeFetch } from '../knowledge/graph.js';
import { loadDefaultKnowledge } from '../knowledge/index.js';

/**
 * Basic IFRS-inspired asset recognition helper.
 * Enforces kernel invariants + account type rules + surfaces matching citations.
 */
export function validateAssetRecognition(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'asset', { standard_family: ['IFRS'], domain: ['accounting'] });

  const violations: string[] = [];
  // Simple check: if entry mentions asset-like, must be balanced (already by kernel)
  const hasAsset = entry.description.toLowerCase().includes('asset') || 
                   entry.lines.some(l => l.account.name.toLowerCase().includes('cash') || l.account.name.toLowerCase().includes('asset') || l.account.type === 'Asset');

  if (hasAsset && !validateEntry(entry).ok) {
    violations.push('Asset related entry must pass double-entry kernel');
  }
  // Strengthen: asset lines should target Asset accounts where named asset
  if (hasAsset && entry.lines.some(l => /asset|cash|receivable/i.test(l.account.name) && l.account.type !== AccountType.Asset)) {
    violations.push('Asset recognition should use Asset-type accounts');
  }

  return {
    ok: violations.length === 0,
    citations: facts.citations,
    violations
  };
}

/** Basic liability / deposit recognition with citations (uses IFRS + US-TAX seeds). */
export function validateLiabilityRecognition(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'liability OR deposit OR tax', { standard_family: ['IFRS', 'US-TAX'] });

  const violations: string[] = [];
  const hasLiab = entry.lines.some(l => l.account.type === AccountType.Liability || /deposit|liability|payable/i.test(l.account.name));
  if (hasLiab && !validateEntry(entry).ok) {
    violations.push('Liability related entry must pass double-entry kernel');
  }
  // A line named like a liability must actually be posted to a Liability-type account.
  if (entry.lines.some(l => /deposit|liability|payable/i.test(l.account.name) && l.account.type !== AccountType.Liability)) {
    violations.push('Liability recognition should use Liability-type accounts');
  }
  return { ok: violations.length === 0, citations: facts.citations, violations };
}

/** Valuation / measurement distinction helper (pulls valuation canon). */
export function validateValuation(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'valuation OR multiple', { standard_family: ['VALUATION'] });

  const violations: string[] = [];
  // Always surface citations for valuation work; kernel balance still required
  if (!validateEntry(entry).ok) {
    violations.push('Valuation entry must pass double-entry kernel');
  }
  // Measurement must be sourced: a valuation entry has to carry an explicit citation
  // (e.g. the multiple basis / model), never an unstated mark.
  if (!entry.citations || entry.citations.length === 0) {
    violations.push('Valuation entries must carry a citation (measurement basis/source)');
  }
  return { ok: violations.length === 0, citations: facts.citations, violations };
}

/** Basic revenue recognition helper pulling IFRS 15 style citations. */
export function validateRevenueRecognition(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'revenue OR ifrs15', { standard_family: ['IFRS'], domain: ['accounting', 'revenue'] });

  const violations: string[] = [];
  const hasRevenue = entry.lines.some(l => l.account.type === AccountType.Income || /revenue|income|sale/i.test(l.account.name + ' ' + entry.description));
  if (hasRevenue && !validateEntry(entry).ok) {
    violations.push('Revenue related entry must pass double-entry kernel');
  }
  // IFRS 15 / ASC 606: recognized revenue is a credit to an Income account.
  if (hasRevenue && !entry.lines.some(l => l.account.type === AccountType.Income && l.side === 'credit')) {
    violations.push('Revenue recognition must credit an Income account');
  }
  return { ok: violations.length === 0, citations: facts.citations, violations };
}

/** Basic expense recognition helper (accrual/matching). */
export function validateExpenseRecognition(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'expense', { standard_family: ['IFRS', 'GAAP'], domain: ['accounting', 'expense'] });

  const violations: string[] = [];
  const hasExpense = entry.lines.some(l => l.account.type === AccountType.Expense || /expense|cost|accrual/i.test(l.account.name + ' ' + entry.description));
  if (hasExpense && !validateEntry(entry).ok) {
    violations.push('Expense related entry must pass double-entry kernel');
  }
  // Accrual/matching: a recognized expense is a debit to an Expense account.
  if (hasExpense && !entry.lines.some(l => l.account.type === AccountType.Expense && l.side === 'debit')) {
    violations.push('Expense recognition must debit an Expense account');
  }
  return { ok: violations.length === 0, citations: facts.citations, violations };
}

/** Lease (IFRS16) recognition helper. Ensures kernel + pulls lease canon for ROU + liability. */
export function validateLeaseRecognition(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'lease OR ifrs16', { standard_family: ['IFRS'], domain: ['accounting', 'leases'] });

  const violations: string[] = [];
  // Detect a lease by its name/description signature — not "any Asset or Liability line",
  // which would have matched almost everything.
  const isLease = /lease|right.of.use|\brou\b/i.test(entry.description + ' ' + entry.lines.map(l => l.account.name).join(' '));
  if (isLease && !validateEntry(entry).ok) {
    violations.push('Lease related entry must pass double-entry kernel');
  }
  // IFRS 16: lessee initial recognition records BOTH a right-of-use Asset and a lease Liability.
  if (isLease) {
    const hasAsset = entry.lines.some(l => l.account.type === AccountType.Asset);
    const hasLiability = entry.lines.some(l => l.account.type === AccountType.Liability);
    if (!hasAsset || !hasLiability) {
      violations.push('Lease recognition (IFRS 16) must record both a right-of-use Asset and a lease Liability');
    }
  }
  return { ok: violations.length === 0, citations: facts.citations, violations };
}
