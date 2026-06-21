import { describe, it, expect } from 'vitest';
import { createGraph, loadSeed, fetch } from '../../src/knowledge/graph.js';
import { ifrsSeed } from '../../src/knowledge/seeds/ifrs.js';

describe('Knowledge Graph (dimension fetch)', () => {
  it('ingests and fetches by query + levers', () => {
    let g = createGraph();
    g = loadSeed(g, ifrsSeed);

    const result = fetch(g, 'objective', {
      standard_family: ['IFRS'],
      domain: ['accounting']
    });

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0]).toContain('ifrs-conceptual-framework-2018');
  });

  it('is deterministic', () => {
    let g = createGraph();
    g = loadSeed(g, ifrsSeed);
    const r1 = fetch(g, 'asset', { standard_family: ['IFRS'] });
    const r2 = fetch(g, 'asset', { standard_family: ['IFRS'] });
    expect(r1.nodes.map(n => n.id)).toEqual(r2.nodes.map(n => n.id));
  });
});
