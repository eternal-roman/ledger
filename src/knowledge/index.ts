export * from './types.js';
export * from './graph.js';
export { ifrsSeed } from './seeds/ifrs.js';
export { gaapSeed } from './seeds/gaap.js';
export { instrumentsSeed } from './seeds/instruments.js';

// Convenience: load the default citation seeds. Canon covers accounting — IFRS
// (conceptual framework + IAS/IFRS recognition) and US-GAAP (ASC 606 + matching) —
// plus investing: cost basis / lot relief, IFRS 9, fair value, and GIPS performance.
import { createGraph, loadSeed } from './graph.js';
import { ifrsSeed } from './seeds/ifrs.js';
import { gaapSeed } from './seeds/gaap.js';
import { instrumentsSeed } from './seeds/instruments.js';

export function loadDefaultKnowledge() {
  let g = createGraph();
  g = loadSeed(g, ifrsSeed);
  g = loadSeed(g, gaapSeed);
  g = loadSeed(g, instrumentsSeed);
  return g;
}
