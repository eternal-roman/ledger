import { describe, it, expect } from 'vitest';
import {
  Money,
  Account,
  AccountType,
  createBalancedEntry,
  emptyLedger,
  validateEntry,
  JournalEntry,
} from '../../src/index.js';
import {
  createPeriodLock,
  validateEntryWithPeriodLocks,
  guardedApply,
  PeriodLock,
} from '../../src/periods/lock.js';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Equity', AccountType.Equity);

function makeCap(id: string, date: string, amt = '1000') {
  return createBalancedEntry(id, date, cash, equity, Money.from(amt, 'USD'), 'Capital');
}

describe('Period locks (anti-fraud hard close)', () => {
  it('createPeriodLock freezes and validates ISO date', () => {
    const lock = createPeriodLock('Q2-2026', '2026-06-30', 'CFO', 'Quarter close', '2026-06-29T12:00:00.000Z');
    expect(Object.isFrozen(lock)).toBe(true);
    expect(lock.lockDate).toBe('2026-06-30');
  });

  it('validateEntryWithPeriodLocks passes open-period entries', () => {
    const lock = createPeriodLock('Q2', '2026-06-30', 'Board', 'Close', '2026-06-29T12:00:00.000Z');
    const e = makeCap('open-1', '2026-07-01');
    const res = validateEntryWithPeriodLocks(e, [lock]);
    expect(res.ok).toBe(true);
  });

  it('validateEntryWithPeriodLocks rejects historical on or before lock (inclusive)', () => {
    const lock = createPeriodLock('Q2', '2026-06-30', 'CFO', 'Q2 close', '2026-06-29T12:00:00.000Z');
    const e = makeCap('backdate', '2026-06-30');
    const res = validateEntryWithPeriodLocks(e, [lock]);
    expect(res.ok).toBe(false);
    expect(res.violations.some(v => v.type === 'PERIOD_LOCKED')).toBe(true);
    expect(res.violations[0].lockDate).toBe('2026-06-30');
  });

  it('guardedApply rejects locked date and leaves ledger unchanged', () => {
    const lock = createPeriodLock('lock1', '2026-06-30', 'Audit', 'Hard close', '2026-06-29T12:00:00.000Z');
    let l = emptyLedger();
    const good = makeCap('g1', '2026-07-01');
    const r1 = guardedApply(l, good, { periodLocks: [lock] });
    expect(r1.result.ok).toBe(true);
    l = r1.ledger;

    const bad = makeCap('bad-back', '2026-06-15');
    const r2 = guardedApply(l, bad, { periodLocks: [lock] });
    expect(r2.result.ok).toBe(false);
    expect(r2.ledger).toBe(l); // unchanged
    expect(r2.ledger.entries.length).toBe(1);
  });

  it('multiple locks: earliest effective lock wins for rejection', () => {
    const locks = [
      createPeriodLock('Q1', '2026-03-31', 'CFO', 'Q1', '2026-06-29T12:00:00.000Z'),
      createPeriodLock('Q2', '2026-06-30', 'CFO', 'Q2', '2026-06-29T12:00:00.000Z'),
    ];
    const e = makeCap('q1', '2026-03-15'); // before Q1 lock
    const res = validateEntryWithPeriodLocks(e, locks);
    expect(res.ok).toBe(false);
    const lockedV = res.violations.find(v => v.type === 'PERIOD_LOCKED');
    expect(lockedV).toBeTruthy();
    expect(lockedV!.lockDate).toBe('2026-03-31'); // earliest lock wins
  });

  it('guarded sequence + apply of valid open entries keeps equation and determinism', () => {
    const lock = createPeriodLock('close-2026-06', '2026-06-30', 'CFO', 'June close', '2026-06-29T12:00:00.000Z');
    let l = emptyLedger();

    const e1 = makeCap('c1', '2026-07-01', '5000');
    const e2 = makeCap('c2', '2026-07-02', '1200');

    l = guardedApply(l, e1, { periodLocks: [lock] }).ledger;
    l = guardedApply(l, e2, { periodLocks: [lock] }).ledger;

    expect(l.verifyFundamentalEquation()).toBe(true);
    expect(l.balance(cash).toString()).toBe('6200.00 USD');

    // determinism via core verify
    const h1 = l.auditHash();
    const l2 = emptyLedger().apply(e1).ledger.apply(e2).ledger;
    expect(l2.auditHash()).toBe(h1);
  });

  it('core validateEntry is never polluted — locked violation only via guard', () => {
    const lock = createPeriodLock('x', '2026-01-01', 'x', 'x', '2026-06-29T12:00:00.000Z');
    const e = makeCap('old', '2025-12-31');
    // pure core accepts the date
    expect(validateEntry(e).ok).toBe(true);
    // guard adds the lock violation
    expect(validateEntryWithPeriodLocks(e, [lock]).ok).toBe(false);
  });
});
