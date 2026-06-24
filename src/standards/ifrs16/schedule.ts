/**
 * IFRS 16 lessee — lease liability + right-of-use (ROU) asset measurement.
 *
 * Base case (payments in arrears, one period each, no initial direct costs or
 * prepayments):
 *   - Initial lease liability = present value of lease payments (IFRS 16.26).
 *   - ROU asset = initial liability (IFRS 16.23–24).
 *   - Each period: interest accretion = opening liability x rate (IFRS 16.36b),
 *     the payment reduces the liability (IFRS 16.36a), and the ROU asset is
 *     depreciated straight-line over the lease term (IFRS 16.31).
 *
 * Everything is exact decimal via the kernel `Money`; rounding is HALF_UP to the
 * currency scale at each recognised amount, exactly as an amortisation schedule
 * is prepared. Straight-line depreciation uses `Money.allocate` so the parts sum
 * to the ROU cost to the cent.
 */
import * as DecimalModule from 'decimal.js';
import { Money, ROUND_HALF_UP } from '../../core/money.js';

const Decimal: any = (DecimalModule as any).default || DecimalModule;

export interface LeasePayment {
  /** Payment date (period end, arrears), strict YYYY-MM-DD. */
  date: string;
  amount: Money;
}

export interface LeaseInput {
  id: string;
  commencementDate: string;
  currency: string;
  /** Lease payments in period order (period 1..n), paid in arrears. */
  payments: LeasePayment[];
  /** Annual discount rate as an exact decimal string, e.g. "0.05". */
  annualDiscountRate: string;
}

export interface SchedulePeriod {
  period: number;
  date: string;
  openingLiability: Money;
  interest: Money;
  payment: Money;
  principal: Money;
  closingLiability: Money;
  depreciation: Money;
  closingRouCarrying: Money;
}

export interface LeaseSchedule {
  initialLiability: Money;
  initialRou: Money;
  periods: SchedulePeriod[];
}

function scaleOf(currency: string): number {
  return Money.from('0', currency).scale;
}

/**
 * Present value of the lease payments, discounted per period at the annual rate,
 * summed exactly and rounded HALF_UP to the currency scale (the initial liability).
 */
export function presentValue(
  payments: LeasePayment[],
  annualDiscountRate: string,
  currency: string,
): Money {
  const onePlusR = new Decimal(1).add(new Decimal(annualDiscountRate));
  let sum = new Decimal(0);
  payments.forEach((p, i) => {
    const factor = onePlusR.pow(i + 1); // arrears: discount over (i+1) whole periods
    sum = sum.add(p.amount.toDecimal().div(factor));
  });
  const rounded = sum.toDecimalPlaces(scaleOf(currency), ROUND_HALF_UP);
  return Money.from(rounded.toString(), currency);
}

/** Build the full IFRS 16 lessee amortisation + depreciation schedule. */
export function buildSchedule(lease: LeaseInput): LeaseSchedule {
  const { currency, annualDiscountRate: rate } = lease;
  const term = lease.payments.length;
  if (term === 0) throw new Error('IFRS16 lease must have at least one payment');

  const initialLiability = presentValue(lease.payments, rate, currency);
  const initialRou = initialLiability; // base case: ROU = initial liability

  // Straight-line depreciation; allocate guarantees the parts sum to ROU cost.
  const depreciations = initialRou.allocate(new Array(term).fill('1'));

  const periods: SchedulePeriod[] = [];
  let opening = initialLiability;
  let rou = initialRou;
  for (let i = 0; i < term; i++) {
    const p = lease.payments[i];
    const interest = opening.mul(rate, ROUND_HALF_UP); // round to currency scale
    const principal = p.amount.sub(interest);
    const closing = opening.sub(principal);
    const depreciation = depreciations[i];
    rou = rou.sub(depreciation);
    periods.push({
      period: i + 1,
      date: p.date,
      openingLiability: opening,
      interest,
      payment: p.amount,
      principal,
      closingLiability: closing,
      depreciation,
      closingRouCarrying: rou,
    });
    opening = closing;
  }

  return { initialLiability, initialRou, periods };
}
