import * as DecimalModule from 'decimal.js';
import { Money, ROUND_HALF_UP } from '../../core/money.js';

const Decimal: any = (DecimalModule as any).default || DecimalModule;

export interface DepInput {
  id: string;
  cost: Money;
  salvage: Money;
  usefulLifePeriods: number;
  method: 'straight-line' | 'declining-balance';
  decliningRate?: string;
  commencementDate: string;
  /** Optional per-period dates (length == usefulLifePeriods). Falls back to commencementDate. */
  periodDates?: string[];
}

export interface DepPeriod {
  period: number;
  date: string;
  depreciation: Money;
  accumulated: Money;
  carrying: Money;
}

export interface DepSchedule {
  initialDepreciable: Money;
  periods: DepPeriod[];
}

/** 
 * Straight-line: uses allocate (exact sum to depreciable base — mirrors ifrs16 exactly).
 * Declining balance: rate applied to opening NBV each period; final period adjusted to exactly hit salvage.
 * All using exact Money arithmetic (no floats).
 */
export function buildDepreciationSchedule(input: DepInput): DepSchedule {
  const depreciable = input.cost.sub(input.salvage);
  const n = input.usefulLifePeriods;
  if (n <= 0) throw new Error('usefulLifePeriods > 0');

  const periods: DepPeriod[] = [];
  let accum = Money.zero(input.cost.currency);
  let carrying = input.cost;

  const dates = input.periodDates && input.periodDates.length === n ? input.periodDates : new Array(n).fill(input.commencementDate);
  if (input.method === 'straight-line') {
    const parts = depreciable.allocate(new Array(n).fill('1'));
    parts.forEach((d, i) => {
      accum = accum.add(d);
      carrying = carrying.sub(d);
      periods.push({
        period: i + 1,
        date: dates[i],
        depreciation: d,
        accumulated: accum,
        carrying,
      });
    });
  } else {
    // Declining balance (supports 'decliningRate' e.g. "2" for 200%).
    // Uses NBV * rate each period (with final plug to salvage).
    const rateStr = input.decliningRate ?? '2';
    const rateDec = new Decimal(String(rateStr));
    // For classic DDB the rate is often (2 / life), but we accept explicit or default 200% factor.
    // Here we treat decliningRate as the multiplier on straight rate for simplicity and determinism.

    for (let i = 0; i < n; i++) {
      let d: Money;
      if (i === n - 1) {
        d = carrying.sub(input.salvage);
      } else {
        // depr = carrying * (rate / n)  or carrying * rate if caller passes full periodic rate.
        // To stay flexible: multiply by rateStr / n as decimal.
        const periodic = rateDec.div(n);
        d = carrying.mul(periodic.toString(), ROUND_HALF_UP);
        const after = carrying.sub(d);
        if (after.toDecimal().lt(input.salvage.toDecimal())) {
          d = carrying.sub(input.salvage);
        }
      }
      accum = accum.add(d);
      carrying = carrying.sub(d);
      periods.push({
        period: i + 1,
        date: dates[i],
        depreciation: d,
        accumulated: accum,
        carrying,
      });
    }
  }

  return { initialDepreciable: depreciable, periods };
}
