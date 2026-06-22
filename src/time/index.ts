import { Money } from '../core/money.js';

/**
 * M0 — Time & measurement foundation for IFRS 15/16 engine (and fiscal periods).
 * All dates validated ISO; computations deterministic and exact via Money/Decimal.
 * See IFRS 15/16 design spec + commercial plan.
 */

export type ISODate = string; // validated YYYY-MM-DD

export type Frequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | { everyMonths: number };

export interface Period {
  readonly index: number;
  readonly start: ISODate;
  readonly end: ISODate;
}

export type DayCount = 'PER_PERIOD_EFFECTIVE' | 'ACT/365' | 'ACT/ACT' | '30/360';

/** True only for real calendar date (re-exported/central for engine). */
export function isISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Generate contiguous periods. Default monthly. Dates inclusive start, end exclusive next. Lexical order. */
export function periods(start: ISODate, end: ISODate, freq: Frequency = 'MONTHLY'): Period[] {
  if (!isISODate(start) || !isISODate(end)) throw new Error('periods: start/end must be valid ISODate');
  if (start >= end) return [];

  const stepMonths = typeof freq === 'object' ? freq.everyMonths : freq === 'ANNUAL' ? 12 : freq === 'QUARTERLY' ? 3 : 1;

  const res: Period[] = [];
  let idx = 0;
  let cur = start;

  // naive month advance; sufficient for M0 (no DST, calendar periods)
  const advance = (d: string, months: number): string => {
    const [y, m, day] = d.split('-').map(Number);
    let ny = y;
    let nm = m + months;
    while (nm > 12) { ny += 1; nm -= 12; }
    // clamp day for short months
    const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    const nday = Math.min(day, lastDay);
    return `${ny.toString().padStart(4,'0')}-${nm.toString().padStart(2,'0')}-${nday.toString().padStart(2,'0')}`;
  };

  while (cur < end) {
    const nxt = advance(cur, stepMonths);
    const pEnd = nxt > end ? end : nxt;
    res.push({ index: idx, start: cur, end: pEnd });
    cur = pEnd;
    idx++;
    if (idx > 1200) break; // safety
  }
  return res;
}

/** Per-period effective rate from annual nominal (simple / n for M0; PER_PERIOD default). */
export function periodRate(annualRate: string | number, freq: Frequency = 'MONTHLY', dayCount: DayCount = 'PER_PERIOD_EFFECTIVE'): string {
  const r = new (require('decimal.js').default || require('decimal.js'))(String(annualRate));
  const n = typeof freq === 'object' ? freq.everyMonths : freq === 'ANNUAL' ? 1 : freq === 'QUARTERLY' ? 4 : 12;
  if (dayCount === 'PER_PERIOD_EFFECTIVE') {
    return r.div(n).toString();
  }
  // other daycounts stub to effective for M0; future precise
  return r.div(n).toString();
}

/** Exact PV of a stream of equal payments (ordinary annuity, end-of-period) using exact arith. */
export function presentValueOfAnnuity(
  payment: Money,
  numPeriods: number,
  ratePerPeriod: string | number,
  currency?: string
): Money {
  if (numPeriods <= 0) return Money.zero(payment.currency);
  const r = new (require('decimal.js').default || require('decimal.js'))(String(ratePerPeriod));
  const one = new (require('decimal.js').default || require('decimal.js'))(1);
  let pv = new (require('decimal.js').default || require('decimal.js'))(0);
  let factor = one;
  const pAmt = payment.toDecimal();
  for (let k = 1; k <= numPeriods; k++) {
    factor = factor.mul(one.add(r));
    pv = pv.add(pAmt.div(factor));
  }
  const tgtCurr = currency || payment.currency;
  // round to tgt scale
  const scale = (payment as any).scale ?? 2;
  const rounded = pv.toDecimalPlaces(scale, 4); // 4=ROUND_HALF_UP
  return Money.from(rounded.toString(), tgtCurr);
}