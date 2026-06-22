export * from './types.js';
export * from './graph.js';
export { ifrsSeed } from './seeds/ifrs.js';
export { gaapSeed } from './seeds/gaap.js';

// Convenience: load the default citation seeds. Current canon covers accounting only:
// IFRS (conceptual framework + IAS/IFRS recognition) and US-GAAP (ASC 606 + matching).
import { createGraph, loadSeed } from './graph.js';
import { ifrsSeed } from './seeds/ifrs.js';
import { gaapSeed } from './seeds/gaap.js';

export function loadDefaultKnowledge() {
  let g = createGraph();
  g = loadSeed(g, ifrsSeed);
  g = loadSeed(g, gaapSeed);
  return g;
}
