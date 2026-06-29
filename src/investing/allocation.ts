import { PortfolioValuation } from '../portfolio/valuation.js';

import * as DecimalModule from 'decimal.js';
const Decimal: any = (DecimalModule as any).default || DecimalModule;

/** Target portfolio weights as exact ratio strings (need not sum to 1 — they're normalized). */
export interface TargetAllocation {
  readonly weights: Record<string, string>;
}

export interface WeightRow {
  readonly asset: string;
  readonly weight: string;   // current weight as decimal string
}

/** Current weights = each holding's value / total NAV. Empty when NAV is zero. */
export function currentWeights(valuation: PortfolioValuation): WeightRow[] {
  const total = valuation.total.toDecimal();
  if (total.isZero()) return [];
  return valuation.holdings.map(h => ({
    asset: h.asset,
    weight: h.value.toDecimal().div(total).toString(),
  }));
}

export interface DriftRow {
  readonly asset: string;
  readonly current: string;
  readonly target: string;
  readonly drift: string;    // current - target (positive = overweight)
}

/** Drift of current vs target weights. Targets are normalized to sum to 1 (exact decimal). */
export function allocationDrift(valuation: PortfolioValuation, target: TargetAllocation): DriftRow[] {
  const cur = new Map(currentWeights(valuation).map(w => [w.asset, new Decimal(w.weight)]));
  const targetDec = new Map(Object.entries(target.weights).map(([a, w]) => [a.toUpperCase(), new Decimal(w)]));
  let tot = new Decimal(0);
  for (const v of targetDec.values()) tot = tot.add(v);
  if (tot.isZero()) tot = new Decimal(1);

  const assets = new Set<string>([...cur.keys(), ...targetDec.keys()]);
  const rows: DriftRow[] = [];
  for (const a of [...assets].sort()) {
    const c = cur.get(a) ?? new Decimal(0);
    const t = (targetDec.get(a) ?? new Decimal(0)).div(tot);
    rows.push({ asset: a, current: c.toString(), target: t.toString(), drift: c.sub(t).toString() });
  }
  return rows;
}
