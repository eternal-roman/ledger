import { describe, it, expect } from 'vitest';
import {
  Money,
  emptyLedger,
  validateEntry,
  Account,
  AccountType,
  buildSchedule,
  presentValue,
  leaseToEntries,
  defaultLeaseAccounts,
  type LeaseInput,
} from '../../src/index.js';

/**
 * Golden master — IFRS 16 lessee, payments in arrears.
 *
 * Lease: 3 annual payments of 10,000 at each year end; discount rate 5%.
 * The full schedule is computed by hand and asserted to the cent. It is
 * internally consistent: the liability closes to exactly 0.00 and total interest
 * (2,767.52) equals total payments (30,000) minus the initial liability
 * (27,232.48).
 */
const lease: LeaseInput = {
  id: 'L1',
  commencementDate: '2026-01-01',
  currency: 'USD',
  annualDiscountRate: '0.05',
  payments: [
    { date: '2026-12-31', amount: Money.from('10000.00', 'USD') },
    { date: '2027-12-31', amount: Money.from('10000.00', 'USD') },
    { date: '2028-12-31', amount: Money.from('10000.00', 'USD') },
  ],
};

// Hand-computed golden master.
const GOLDEN = {
  initialLiability: '27232.48 USD',
  periods: [
    { opening: '27232.48 USD', interest: '1361.62 USD', principal: '8638.38 USD', closing: '18594.10 USD', depreciation: '9077.49 USD' },
    { opening: '18594.10 USD', interest: '929.71 USD', principal: '9070.29 USD', closing: '9523.81 USD', depreciation: '9077.49 USD' },
    { opening: '9523.81 USD', interest: '476.19 USD', principal: '9523.81 USD', closing: '0.00 USD', depreciation: '9077.50 USD' },
  ],
};

describe('IFRS 16 lessee — golden master', () => {
  it('present value of payments = initial lease liability (to the cent)', () => {
    expect(presentValue(lease.payments, '0.05', 'USD').toString()).toBe(GOLDEN.initialLiability);
  });

  it('amortisation + depreciation schedule matches to the cent', () => {
    const schedule = buildSchedule(lease);
    expect(schedule.initialLiability.toString()).toBe(GOLDEN.initialLiability);
    expect(schedule.initialRou.toString()).toBe(GOLDEN.initialLiability);
    expect(schedule.periods).toHaveLength(3);

    schedule.periods.forEach((p, i) => {
      const g = GOLDEN.periods[i];
      expect(p.openingLiability.toString()).toBe(g.opening);
      expect(p.interest.toString()).toBe(g.interest);
      expect(p.principal.toString()).toBe(g.principal);
      expect(p.closingLiability.toString()).toBe(g.closing);
      expect(p.depreciation.toString()).toBe(g.depreciation);
    });
  });

  it('liability closes to exactly zero and interest reconciles', () => {
    const schedule = buildSchedule(lease);
    const last = schedule.periods[schedule.periods.length - 1];
    expect(last.closingLiability.toString()).toBe('0.00 USD');

    let totalInterest = Money.zero('USD');
    for (const p of schedule.periods) totalInterest = totalInterest.add(p.interest);
    // total interest = total payments (30000) - initial liability (27232.48)
    expect(totalInterest.toString()).toBe('2767.52 USD');
  });

  it('depreciation sums exactly to the ROU cost', () => {
    const schedule = buildSchedule(lease);
    let total = Money.zero('USD');
    for (const p of schedule.periods) total = total.add(p.depreciation);
    expect(total.toString()).toBe(GOLDEN.initialLiability);
  });

  it('every generated entry is valid and the equation holds', () => {
    const entries = leaseToEntries(lease);
    // commencement + 3 periods * 3 entries = 10 entries
    expect(entries).toHaveLength(10);

    let ledger = emptyLedger();
    for (const e of entries) {
      expect(validateEntry(e).ok).toBe(true);
      const { ledger: next, result } = ledger.apply(e);
      expect(result.ok).toBe(true);
      ledger = next;
    }
    expect(ledger.verifyFundamentalEquation()).toBe(true);
  });

  it('final balances: liability 0, ROU net book value 0', () => {
    const accounts = defaultLeaseAccounts();
    let ledger = emptyLedger();
    for (const e of leaseToEntries(lease, accounts)) ledger = ledger.apply(e).ledger;

    expect(ledger.balance(accounts.leaseLiability).toString()).toBe('0.00 USD');

    // Net book value = ROU cost - accumulated depreciation = 0.
    const rou = ledger.balance(accounts.rouAsset);
    const accum = ledger.balance(accounts.accumulatedDepreciation);
    expect(rou.toString()).toBe('27232.48 USD');
    expect(rou.add(accum).toString()).toBe('0.00 USD');
  });

  it('is deterministic across rebuilds (identical audit hash)', () => {
    const build = () => {
      let l = emptyLedger();
      for (const e of leaseToEntries(lease)) l = l.apply(e).ledger;
      return l.auditHash();
    };
    expect(build()).toBe(build());
  });
});
