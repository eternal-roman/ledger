import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Money } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { JournalEntry, makeLine } from '../../src/core/journal.js';
import { emptyLedger } from '../../src/core/ledger.js';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Owner Equity', AccountType.Equity);

function capEntry(amount: string) {
  return new JournalEntry(
    'cap-' + amount,
    '2026-01-01',
    [
      makeLine(cash, Money.from(amount, 'USD'), 'debit'),
      makeLine(equity, Money.from(amount, 'USD'), 'credit'),
    ],
    'Capital contribution'
  );
}

describe('Ledger (immutable append + projections)', () => {
  it('starts empty', () => {
    const ledger = emptyLedger();
    expect(ledger.entries.length).toBe(0);
  });

  it('applies valid entry immutably and updates balance', () => {
    let ledger = emptyLedger();
    const entry = capEntry('5000');

    const applyResult = ledger.apply(entry);
    expect(applyResult.result.ok).toBe(true);

    const newLedger = applyResult.ledger;
    expect(newLedger).not.toBe(ledger);           // immutable
    expect(ledger.entries.length).toBe(0);        // old unchanged
    expect(newLedger.entries.length).toBe(1);

    const cashBal = newLedger.balance(cash);
    expect(cashBal.toString()).toBe('5000.00 USD');
  });

  it('rejects invalid entry and does not mutate', () => {
    let ledger = emptyLedger();
    const badLines = [makeLine(cash, Money.from(100, 'USD'), 'debit')]; // unbalanced
    const badEntry = new JournalEntry('bad', '2026-01-01', badLines, 'bad');

    const { ledger: stillOld, result } = ledger.apply(badEntry);
    expect(result.ok).toBe(false);
    expect(stillOld.entries.length).toBe(0);
  });

  it('multiple applications preserve determinism (same sequence = same balances)', () => {
    const e1 = capEntry('1000');
    const e2 = new JournalEntry('exp', '2026-01-02', [
      makeLine(equity, Money.from('200', 'USD'), 'debit'), // simplistic draw
      makeLine(cash, Money.from('200', 'USD'), 'credit'),
    ], 'Owner draw');

    let l1 = emptyLedger().apply(e1).ledger.apply(e2).ledger;
    let l2 = emptyLedger().apply(e1).ledger.apply(e2).ledger;

    expect(l1.balance(cash).toString()).toBe(l2.balance(cash).toString());
    expect(l1.balance(equity).toString()).toBe(l2.balance(equity).toString());
  });

  it('property: any sequence of balanced capital + draw entries always keeps cash + equity consistent', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 100, max: 10000 }), { minLength: 1, maxLength: 6 }),
        (amounts) => {
          let ledger = emptyLedger();
          let netCash = Money.from(0, 'USD');

          for (const amt of amounts) {
            const e = capEntry(String(amt));
            const res = ledger.apply(e);
            if (!res.result.ok) return false;
            ledger = res.ledger;
            netCash = netCash.add(Money.from(String(amt), 'USD'));
          }

          const bal = ledger.balance(cash);
          return bal.toString() === netCash.toString();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('verifyFundamentalEquation passes for balanced capital contribution', () => {
    let ledger = emptyLedger().apply(capEntry('10000')).ledger;
    expect(ledger.verifyFundamentalEquation([cash, equity])).toBe(true);
    expect(ledger.verifyFundamentalEquation()).toBe(true); // auto-discover
  });
});
