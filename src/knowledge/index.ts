export * from './types.js';
export * from './graph.js';
export { ifrsSeed } from './seeds/ifrs.js';
export { gaapSeed } from './seeds/gaap.js';

// Convenience: load default seeds (expanded canon covering Accounting/IFRS + GAAP, FOMC/monetary policy,
// Tax & Estate, Macro/Economics, Finance valuation per the Uncompromising Financial Architect doctrine).
import { createGraph, loadSeed } from './graph.js';
import { ifrsSeed } from './seeds/ifrs.js';
import { gaapSeed } from './seeds/gaap.js';

export function loadDefaultKnowledge() {
  let g = createGraph();
  g = loadSeed(g, ifrsSeed);
  g = loadSeed(g, gaapSeed);
  return g;
}
