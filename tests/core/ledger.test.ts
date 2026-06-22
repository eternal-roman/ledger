import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Money } from '../../src/core/money.js';
import { Account, AccountType } from '../../src/core/account.js';
import { JournalEntry, makeLine, createFxConversion, createEntry, validateEntry } from '../../src/core/journal.js';
import { emptyLedger } from '../../src/core/ledger.js';
import { verifyDeterminism, validateCanonicalArtifact } from '../../src/verify/index.js';

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
    const badLines = [makeLine(cash, Money.from('100', 'USD'), 'debit')]; // unbalanced
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
          let netCash = Money.from('0', 'USD');

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

  it('property: sequences of compound entries always preserve equation and trialBalance sums', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 50, max: 2000 }), { minLength: 1, maxLength: 5 }),
        (amts) => {
          let ledger = emptyLedger();
          const rev = new Account('400', 'Rev', AccountType.Income);
          for (const amt of amts) {
            const rev80 = Math.floor((amt * 4) / 5);
            const rest = amt - rev80;
            const lines = [
              makeLine(cash, Money.from(String(amt), 'USD'), 'debit'),
              makeLine(rev, Money.from(String(rev80), 'USD'), 'credit'),
              makeLine(equity, Money.from(String(rest), 'USD'), 'credit')
            ];
            const e = new JournalEntry('pc' + amt, '2026-01-01', lines, 'prop compound');
            if (!validateEntry(e).ok) return false;
            ledger = ledger.apply(e).ledger;
            if (!ledger.verifyFundamentalEquation()) return false;
          }
          return true;
        }
      ),
      { numRuns: 8 }
    );
  });

  it('entries getter returns frozen copy (immutable ledger list)', () => {
    let ledger = emptyLedger().apply(capEntry('100')).ledger;
    const snap = ledger.entries as any[];
    expect(() => snap.push(capEntry('999'))).toThrow();
    expect(ledger.entries.length).toBe(1);
  });

  it('balance for unseen account uses ledger currency not hardcoded USD', () => {
    const eur = new Account('200', 'EUR', AccountType.Asset);
    const eq2 = new Account('310', 'EqEUR', AccountType.Equity);
    const e = new JournalEntry('eur1', '2026-01-01', [
      makeLine(eur, Money.from('42', 'EUR'), 'debit'),
      makeLine(eq2, Money.from('42', 'EUR'), 'credit')
    ], 'eur');
    let ledger = emptyLedger().apply(e).ledger;
    const zeroGhost = ledger.balance(new Account('ghost','G',AccountType.Asset));
    expect(zeroGhost.toString()).toBe('0.00 EUR');
  });

  it('balance accepts explicit currency for multi-currency accounts', () => {
    const mixed = new Account('999', 'Multi', AccountType.Asset);
    const eq = new Account('300', 'Eq', AccountType.Equity);
    let l = emptyLedger();
    l = l.apply(new JournalEntry('m1', '2026-01-01', [makeLine(mixed, Money.from('10','USD'),'debit'), makeLine(eq, Money.from('10','USD'),'credit')], '')).ledger;
    l = l.apply(new JournalEntry('m2', '2026-01-02', [makeLine(mixed, Money.from('5','EUR'),'debit'), makeLine(eq, Money.from('5','EUR'),'credit')], '')).ledger;
    expect(l.balance(mixed, undefined, 'USD').toString()).toBe('10.00 USD');
    expect(l.balance(mixed, undefined, 'EUR').toString()).toBe('5.00 EUR');
  });

  it('trialBalance lists discovered accounts with balances', () => {
    let ledger = emptyLedger().apply(capEntry('5000')).ledger;
    const tb = ledger.trialBalance();
    expect(tb.length).toBeGreaterThan(0);
    expect(tb.some(t => t.account.code === '1000' && t.balance.toString() === '5000.00 USD')).toBe(true);
    const snap = ledger.snapshot('2026-01-01');
    expect(snap.entries.length).toBe(1);
    expect(snap.asOf).toBe('2026-01-01');
  });

  it('summarizeByType groups nets by AccountType', () => {
    let ledger = emptyLedger().apply(capEntry('1000')).ledger;
    const sum = ledger.summarizeByType();
    expect(sum.some(s => s.type === AccountType.Asset && s.total.toString() === '1000.00 USD')).toBe(true);
    expect(sum.some(s => s.type === AccountType.Equity)).toBe(true);
  });

  it('incomeStatement and balanceSheet provide equation views', () => {
    // Simple capital only
    let l = emptyLedger().apply(capEntry('1000')).ledger;
    const is = l.incomeStatement();
    expect(is.totalIncome.toString()).toBe('0.00 USD');
    expect(is.netIncome.toString()).toBe('0.00 USD');

    const bs = l.balanceSheet();
    expect(bs.balanced).toBe(true);
    expect(bs.left.toString()).toBe('1000.00 USD');
  });

  it('incomeStatement reflects income and expenses; isZero on zero balances', () => {
    const salary = new Account('400', 'Salary', AccountType.Income);
    const rent = new Account('500', 'Rent', AccountType.Expense);
    let l = emptyLedger();
    l = l.apply(new JournalEntry('s', 'd', [makeLine(cash, Money.from('5000','USD'),'debit'), makeLine(salary, Money.from('5000','USD'),'credit')], '')).ledger;
    l = l.apply(new JournalEntry('r', 'd', [makeLine(rent, Money.from('800','USD'),'debit'), makeLine(cash, Money.from('800','USD'),'credit')], '')).ledger;
    const is = l.incomeStatement();
    expect(is.totalIncome.toString()).toBe('5000.00 USD');
    expect(is.totalExpenses.toString()).toBe('800.00 USD');
    expect(is.netIncome.toString()).toBe('4200.00 USD');
    expect(l.balance(new Account('ghost','G',AccountType.Asset)).isZero()).toBe(true); // unseen
  });

  it('verifyDeterminism confirms reproducibility on sequence', () => {
    const e1 = capEntry('1000');
    const e2 = new JournalEntry('d2', '2026-01-02', [
      makeLine(equity, Money.from('100', 'USD'), 'debit'),
      makeLine(cash, Money.from('100', 'USD'), 'credit')
    ], 'draw');
    const res = verifyDeterminism([e1, e2]);
    expect(res.ok).toBe(true);
    expect(res.ledger.entries.length).toBe(2);
  });

  it('auditHash is stable and changes with entries (for proof bundles)', () => {
    let l = emptyLedger().apply(capEntry('1000')).ledger;
    const h1 = l.auditHash();
    expect(h1.length).toBeGreaterThan(0);
    const e2 = new JournalEntry('d2', '2026-01-02', [
      makeLine(equity, Money.from('100', 'USD'), 'debit'),
      makeLine(cash, Money.from('100', 'USD'), 'credit')
    ], 'draw');
    l = l.apply(e2).ledger;
    const h2 = l.auditHash();
    expect(h2).not.toBe(h1);
    // replay must match
    const l2 = emptyLedger().apply(capEntry('1000')).ledger.apply(e2).ledger;
    expect(l2.auditHash()).toBe(h2);
  });

  it('applies compound and FX split entries via Ledger and preserves invariants', () => {
    // Compound
    const rev = new Account('400', 'Revenue', AccountType.Income);
    const tax = new Account('210', 'Tax', AccountType.Liability);
    const comp = new JournalEntry('comp', '2026-01-01', [
      makeLine(cash, Money.from('100', 'USD'), 'debit'),
      makeLine(rev, Money.from('80', 'USD'), 'credit'),
      makeLine(tax, Money.from('20', 'USD'), 'credit')
    ], 'sale');
    let l = emptyLedger().apply(comp).ledger;
    expect(l.verifyFundamentalEquation()).toBe(true);

    // FX split (using createFxConversion)
    const eur = new Account('110', 'EURCash', AccountType.Asset);
    const clrE = new Account('901', 'ClrE', AccountType.Liability);
    const clrU = new Account('902', 'ClrU', AccountType.Liability);
    const fxLegs = createFxConversion('fx', '2026-01-02', eur, cash, Money.from('50', 'EUR'), Money.from('54', 'USD'), clrE, clrU, 'fx trade');
    l = l.apply(fxLegs[0]).ledger;
    l = l.apply(fxLegs[1]).ledger;
    expect(l.verifyFundamentalEquation()).toBe(true);
    expect(l.balance(eur).toString()).toBe('50.00 EUR');
    expect(l.balance(cash).toString()).toBe('46.00 USD'); // 100-54
  });

  it('Canonical Financial Artifact validator enforces Zero-Skip structure', () => {
    const good = {
      scope: 'capital contribution',
      assumptions: ['date=2026-06-21', 'currency=USD'],
      citations: ['ifrs-cf-2018'],
      kernelPlan: 'Money.from + makeLine + createEntry + Ledger.apply + verifyFundamentalEquation',
      proof: 'equation holds',
      reproducibility: 'inputs:1000'
    };
    expect(validateCanonicalArtifact(good).ok).toBe(true);

    const bad = { scope: 'x' };
    const res = validateCanonicalArtifact(bad);
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it('incomeStatement/balanceSheet/summarize use primary non-USD currency from ledger (no USD hard default)', () => {
    const asset = new Account('100', 'CashEUR', AccountType.Asset);
    const eq = new Account('300', 'EqEUR', AccountType.Equity);
    const inc = new Account('400', 'IncEUR', AccountType.Income);
    const exp = new Account('500', 'ExpEUR', AccountType.Expense);
    let l = emptyLedger();
    l = l.apply(new JournalEntry('e1','2026-01-01',[
      makeLine(asset, Money.from('1000','EUR'),'debit'), makeLine(eq, Money.from('1000','EUR'),'credit')
    ],'cap')).ledger;
    l = l.apply(new JournalEntry('e2','2026-01-02',[
      makeLine(asset, Money.from('200','EUR'),'debit'), makeLine(inc, Money.from('200','EUR'),'credit')
    ],'rev')).ledger;
    l = l.apply(new JournalEntry('e3','2026-01-03',[
      makeLine(exp, Money.from('50','EUR'),'debit'), makeLine(asset, Money.from('50','EUR'),'credit')
    ],'exp')).ledger;
    const is = l.incomeStatement();
    expect(is.totalIncome.toString()).toBe('200.00 EUR');
    expect(is.totalExpenses.toString()).toBe('50.00 EUR');
    expect(is.netIncome.toString()).toBe('150.00 EUR');
    const bs = l.balanceSheet();
    expect(bs.balanced).toBe(true);
    expect(bs.left.toString()).toBe('1200.00 EUR'); // asset 1150 + exp 50
    expect(bs.right.toString()).toBe('1200.00 EUR');
    const sums = l.summarizeByType();
    expect(sums.some(s => s.type === AccountType.Income && s.total.toString() === '200.00 EUR')).toBe(true);
  });
});
