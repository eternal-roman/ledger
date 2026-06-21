export * from './types.js';
export * from './graph.js';
export { ifrsSeed } from './seeds/ifrs.js';

// Convenience: load default seeds
import { createGraph, loadSeed } from './graph.js';
import { ifrsSeed } from './seeds/ifrs.js';

export function loadDefaultKnowledge() {
  let g = createGraph();
  g = loadSeed(g, ifrsSeed);
  return g;
}
