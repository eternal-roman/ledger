import { describe, it, expect } from 'vitest';
import { createGraph, loadSeed, fetch, loadDefaultKnowledge } from '../../src/knowledge/index.js';
import { ifrsSeed } from '../../src/knowledge/seeds/ifrs.js';
import { gaapSeed } from '../../src/knowledge/seeds/gaap.js';

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

  it('traverses edges for related concepts and avoids duplicates', () => {
    let g = createGraph();
    g = loadSeed(g, ifrsSeed);

    // 'asset' matches asset node; traversal via derives_from should pull objective (depth allows)
    const res = fetch(g, 'asset', { standard_family: ['IFRS'], domain: ['accounting'] }, undefined, 2);
    const ids = res.nodes.map(n => n.id);
    expect(ids).toContain('ifrs-cf-2018-elements-asset-4.3');
    expect(ids).toContain('ifrs-cf-2018-objective-1.2'); // via edge
    expect(ids.length).toBe(new Set(ids).size); // no dups
    expect(res.edges.length).toBeGreaterThan(0);
  });

  it('supports new seeds (revenue, expense, liability) and edges', () => {
    let g = createGraph();
    g = loadSeed(g, ifrsSeed);

    const rev = fetch(g, 'revenue', { standard_family: ['IFRS'] });
    expect(rev.nodes.some(n => n.id.includes('revenue'))).toBe(true);

    const exp = fetch(g, 'expense', { standard_family: ['IFRS', 'GAAP'] });
    expect(exp.nodes.length).toBeGreaterThan(0);

    const liab = fetch(g, 'liability', { standard_family: ['IFRS'] });
    expect(liab.nodes.some(n => n.id.includes('liability'))).toBe(true);

    // New seeds: leases, depreciation, inventory for fuller financial system coverage
    const lease = fetch(g, 'lease', { standard_family: ['IFRS'] });
    expect(lease.nodes.some(n => n.id.includes('ifrs16'))).toBe(true);

    const depr = fetch(g, 'depreciation', { standard_family: ['IFRS'] });
    expect(depr.nodes.some(n => n.id.includes('ias16'))).toBe(true);

    const inv = fetch(g, 'inventory', { standard_family: ['IFRS'] });
    expect(inv.nodes.some(n => n.id.includes('ias2'))).toBe(true);
  });
});
