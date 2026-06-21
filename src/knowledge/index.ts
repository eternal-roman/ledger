export * from './types.js';
export * from './graph.js';
export { ifrsSeed } from './seeds/ifrs.js';

// Convenience: load default seeds (expanded canon covering Accounting/IFRS, FOMC/monetary policy,
// Tax & Estate, Macro/Economics, Finance valuation per the Uncompromising Financial Architect doctrine).
import { createGraph, loadSeed } from './graph.js';
import { ifrsSeed } from './seeds/ifrs.js';

export function loadDefaultKnowledge() {
  let g = createGraph();
  g = loadSeed(g, ifrsSeed);
  return g;
}
