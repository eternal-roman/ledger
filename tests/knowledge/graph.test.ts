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

  it('supports broader canon via levers (FOMC, tax, macro, valuation per persona)', () => {
    let g = createGraph();
    g = loadSeed(g, ifrsSeed);

    const fomc = fetch(g, 'inflation', { standard_family: ['FOMC'], domain: ['monetary_policy'] });
    expect(fomc.nodes.length).toBeGreaterThan(0);
    expect(fomc.citations.some(c => c.includes('fomc'))).toBe(true);

    const tax = fetch(g, 'tax', { standard_family: ['US-TAX'], jurisdiction: ['US'] });
    expect(tax.nodes.length).toBeGreaterThan(0);

    const macro = fetch(g, 'cycle', { domain: ['economics'] });
    expect(macro.nodes.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    let g = createGraph();
    g = loadSeed(g, ifrsSeed);
    const r1 = fetch(g, 'asset', { standard_family: ['IFRS'] });
    const r2 = fetch(g, 'asset', { standard_family: ['IFRS'] });
    expect(r1.nodes.map(n => n.id)).toEqual(r2.nodes.map(n => n.id));
  });
});
