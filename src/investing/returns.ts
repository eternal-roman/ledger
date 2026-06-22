import { Money } from '../core/money.js';

// decimal.js interop (same pattern as core/money.ts) — exact, platform-independent,
// so iterative methods are deterministic (no IEEE-754 / Math.pow drift).
import * as DecimalModule from 'decimal.js';
const Decimal: any = (DecimalModule as any).default || DecimalModule;

/** One sub-period: opening value, closing value, and net external flow during it. */
export interface ReturnPeriod {
  readonly begin: Money;
  readonly end: Money;
  readonly flow: Money;   // net external contribution added at the start of the period
}

/**
 * Time-weighted return: chain per-period holding-period returns, neutralizing the
 * effect of external flows. Non-iterative and exact. Returns a decimal string
 * (e.g. '0.0825' for 8.25%).
 */
export function timeWeightedReturn(periods: ReturnPeriod[]): string {
  if (periods.length === 0) return '0';
  let product = new Decimal(1);
  for (const p of periods) {
    const begin = p.begin.toDecimal().add(p.flow.toDecimal());
    if (begin.isZero()) throw new Error('timeWeightedReturn: period base (begin + flow) is zero');
    const hpr = p.end.toDecimal().div(begin); // (1 + r_i)
    product = product.mul(hpr);
  }
  return product.sub(1).toString();
}

export interface Cashflow {
  readonly date: string;    // ISO YYYY-MM-DD
  readonly amount: Money;   // sign convention: outflows (invested) negative, inflows positive
}

export interface IRRResult {
  readonly irr: string;       // annualized rate as decimal string
  readonly iterations: number;
  readonly converged: boolean;
}

/** Whole days between two ISO dates (integer, no float). */
function daysBetween(d0: string, d1: string): number {
  const [y0, m0, day0] = d0.split('-').map(Number);
  const [y1, m1, day1] = d1.split('-').map(Number);
  const t0 = Date.UTC(y0, m0 - 1, day0);
  const t1 = Date.UTC(y1, m1 - 1, day1);
  return Math.round((t1 - t0) / 86400000);
}

/** NPV at rate r given (years, amount) pairs. */
function npv(r: any, flows: { t: any; cf: any }[]): any {
  let sum = new Decimal(0);
  for (const f of flows) {
    sum = sum.add(f.cf.div(r.add(1).pow(f.t)));
  }
  return sum;
}

/**
 * Money-weighted (IRR) return, annualized. Newton-Raphson in exact decimal with a
 * bisection fallback over [-0.9999, +100]. Fail-closed: returns `converged:false`
 * rather than a silent wrong root. Tolerance and iteration cap are explicit.
 */
export function moneyWeightedReturn(
  cashflows: Cashflow[],
  opts: { tol?: string; maxIter?: number } = {},
): IRRResult {
  if (cashflows.length < 2) throw new Error('moneyWeightedReturn needs at least two cashflows');
  const currency = cashflows[0].amount.currency;
  for (const c of cashflows) {
    if (c.amount.currency !== currency) throw new Error('moneyWeightedReturn: mixed currencies');
  }
  const sorted = [...cashflows].sort((a, b) => a.date.localeCompare(b.date));
  const d0 = sorted[0].date;
  const flows = sorted.map(c => ({
    t: new Decimal(daysBetween(d0, c.date)).div(365),
    cf: c.amount.toDecimal(),
  }));

  const tol = new Decimal(opts.tol ?? '1e-9');
  const maxIter = opts.maxIter ?? 100;

  // Newton-Raphson
  let r = new Decimal('0.1');
  let iterations = 0;
  for (; iterations < maxIter; iterations++) {
    const f = npv(r, flows);
    if (f.abs().lt(tol)) return { irr: r.toString(), iterations, converged: true };
    // derivative f'(r) = Σ cf * (-t) * (1+r)^(-t-1)
    let df = new Decimal(0);
    for (const fl of flows) {
      df = df.add(fl.cf.mul(fl.t.neg()).mul(r.add(1).pow(fl.t.neg().sub(1))));
    }
    if (df.isZero()) break;
    const next = r.sub(f.div(df));
    if (next.lte(-1)) break; // left the valid domain → hand off to bisection
    if (next.sub(r).abs().lt(tol)) return { irr: next.toString(), iterations: iterations + 1, converged: true };
    r = next;
  }

  // Bisection fallback over a bounded interval
  let lo = new Decimal('-0.9999');
  let hi = new Decimal('100');
  let flo = npv(lo, flows);
  let fhi = npv(hi, flows);
  if (flo.mul(fhi).gt(0)) {
    return { irr: r.toString(), iterations, converged: false }; // no sign change → unsolved
  }
  let mid = lo;
  for (let i = 0; i < maxIter; i++, iterations++) {
    mid = lo.add(hi).div(2);
    const fm = npv(mid, flows);
    if (fm.abs().lt(tol)) return { irr: mid.toString(), iterations, converged: true };
    if (flo.mul(fm).lt(0)) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return { irr: mid.toString(), iterations, converged: false };
}
