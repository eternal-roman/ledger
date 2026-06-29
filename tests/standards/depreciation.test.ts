import { describe, it, expect } from 'vitest';
import { Money, emptyLedger, buildDepreciationSchedule, depreciationToEntries } from '../../src/index.js';
import { validateEntry } from '../../src/core/journal.js';

describe('Depreciation schedules (premium, mirrors ifrs16 golden style)', () => {
  // Golden master: cost 10000, salvage 1000, 5yr SL => 1800 each? Wait, 9000/5 = 1800.
  // Use exact: 9000 / 5 = 1800.00
  const GOLDEN_SL = {
    cost: '10000.00 USD',
    salvage: '1000.00 USD',
    depreciable: '9000.00 USD',
    perPeriod: '1800.00 USD',
    periods: 5,
  };

  it('SL allocate sums exactly to depreciable base (golden master)', () => {
    const cost = Money.from('10000', 'USD');
    const salvage = Money.from('1000', 'USD');
    const sched = buildDepreciationSchedule({
      id: 'D1',
      cost,
      salvage,
      usefulLifePeriods: 5,
      method: 'straight-line',
      commencementDate: '2026-01-01',
    });
    let total = Money.zero('USD');
    sched.periods.forEach(p => total = total.add(p.depreciation));
    expect(sched.initialDepreciable.toString()).toBe(GOLDEN_SL.depreciable);
    expect(total.toString()).toBe(GOLDEN_SL.depreciable);
    expect(sched.periods).toHaveLength(GOLDEN_SL.periods);
    expect(sched.periods[0].depreciation.toString()).toBe(GOLDEN_SL.perPeriod);
    // final carrying == salvage
    expect(sched.periods[4].carrying.toString()).toBe(GOLDEN_SL.salvage);
  });

  it('generated entries are kernel valid, equation holds, deterministic (golden structure)', () => {
    const schedInput = {
      id: 'D1',
      cost: Money.from('10000', 'USD'),
      salvage: Money.from('0', 'USD'),
      usefulLifePeriods: 2,
      method: 'straight-line' as const,
      commencementDate: '2026-01-01',
    };
    const entries = depreciationToEntries(schedInput);
    expect(entries).toHaveLength(2);

    let l = emptyLedger();
    for (const e of entries) {
      expect(validateEntry(e).ok).toBe(true);
      const { ledger: next, result } = l.apply(e);
      expect(result.ok).toBe(true);
      l = next;
    }
    expect(l.verifyFundamentalEquation()).toBe(true);

    // determinism: same hash on rebuild
    const build = () => {
      let l2 = emptyLedger();
      for (const e of entries) l2 = l2.apply(e).ledger;
      return l2.auditHash();
    };
    expect(build()).toBe(build());
  });
});


