import { JournalEntry, validateEntry } from '../core/journal.js';
import { KnowledgeGraph, fetch as knowledgeFetch } from '../knowledge/graph.js';
import { loadDefaultKnowledge } from '../knowledge/index.js';

/**
 * Basic IFRS-inspired asset recognition rule (stub for full rules layer).
 * Uses knowledge fetch for citation.
 */
export function validateAssetRecognition(entry: JournalEntry, graph?: KnowledgeGraph): { ok: boolean; citations: string[]; violations: string[] } {
  const g = graph || loadDefaultKnowledge();
  const facts = knowledgeFetch(g, 'asset', { standard_family: ['IFRS'], domain: ['accounting'] });

  const violations: string[] = [];
  // Simple check: if entry mentions asset-like, must be balanced (already by kernel)
  const hasAsset = entry.description.toLowerCase().includes('asset') || 
                   entry.lines.some(l => l.account.name.toLowerCase().includes('cash') || l.account.name.toLowerCase().includes('asset'));

  if (hasAsset && !validateEntry(entry).ok) {
    violations.push('Asset related entry must pass double-entry kernel');
  }

  return {
    ok: violations.length === 0,
    citations: facts.citations,
    violations
  };
}
