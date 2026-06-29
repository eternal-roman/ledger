/**
 * 3-round adversarial verification (due diligence) for the four new feature extensions plus the
 * kernel they build on:
 *   - cash flow statement (reporting/cashflow)
 *   - position reconciliation (reconcile/reconcile)
 *   - holding-period lot relief (portfolio/lots)
 *   - settlement-date accounting (trading/settlement)
 *
 * Each round varies amounts and dates via a seeded PRNG (deterministic, but a
 * different shape per round) and asserts that EVERY invariant holds and that a
 * battery of malicious / buggy proposals is ALWAYS rejected — never posted.
 *
 * The whole thing runs three times so a passing result is not a single lucky
 * fixture: the properties must hold across all three independently-seeded rounds.
 */
import { describe, it, expect } from 'vitest';
import {
  Money, Account, AccountType, JournalEntry, makeLine, createEntry, createBalancedEntry,
  validateEntry, emptyLedger, Ledger,
  fillToEntries, settleFill, reliefFor, cashFlowStatement, reconcilePositions,
  cashAccount, settlementPayableAccount, settlementReceivableAccount,
  transferToEntries,
  type Fill,
} from '../src/index.js';

// ── deterministic PRNG (LCG) ───────────────────────────────────────────────
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
/** A positive 2-dp USD amount string in [min, min+span]. */
function amt(rng: () => number, min: number, span: number): string {
  const cents = Math.floor(rng() * span * 100) + min * 100;
  return (cents / 100).toFixed(2);
}
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

const cash = new Account('CASH:OPS:USD', 'Operating Cash', AccountType.Asset);
const revenue = new Account('4000', 'Revenue', AccountType.Income);
const rent = new Account('5000', 'Rent', AccountType.Expense);
const equip = new Account('1500', 'Equipment', AccountType.Asset);
const loan = new Account('2000', 'Loan', AccountType.Liability);
const equity = new Account('3000', 'Equity', AccountType.Equity);
const eurCash = new Account('CASH:OPS:EUR', 'EUR Cash', AccountType.Asset);

function postOk(l: Ledger, e: JournalEntry): Ledger {
  const r = l.apply(e);
  expect(r.result.ok).toBe(true);
  return r.ledger;
}

/** Assert a proposal is rejected: it either throws, or applies with ok:false and does NOT grow the ledger. */
function expectRejected(l: Ledger, build: () => JournalEntry): void {
  let entry: JournalEntry;
  try {
    entry = build();
  } catch {
    return; // construction itself fail-closed — good
  }
  const before = l.entries.length;
  const r = l.apply(entry);
  expect(r.result.ok).toBe(false);
  expect(r.ledger.entries.length).toBe(before);
}

function runRound(round: number) {
  const rng = lcg(0x9e3779b9 ^ (round * 2654435761));
  const base = `2025-0${round}-01`; // distinct month per round

  // ── 1. Build a realistic ledger ──────────────────────────────────────────
  let l = emptyLedger();
  const capital = amt(rng, 50_000, 50_000);
  const loanAmt = amt(rng, 10_000, 20_000);
  const equipAmt = amt(rng, 5_000, 10_000);
  const salesAmt = amt(rng, 3_000, 8_000);
  const rentAmt = amt(rng, 1_000, 2_000);

  l = postOk(l, createBalancedEntry(`r${round}-cap`, base, cash, equity, Money.from(capital, 'USD'), 'Capital'));
  l = postOk(l, createBalancedEntry(`r${round}-loan`, addDays(base, 1), cash, loan, Money.from(loanAmt, 'USD'), 'Loan'));
  l = postOk(l, createBalancedEntry(`r${round}-eq`, addDays(base, 2), equip, cash, Money.from(equipAmt, 'USD'), 'Equipment'));
  l = postOk(l, createBalancedEntry(`r${round}-sale`, addDays(base, 3), cash, revenue, Money.from(salesAmt, 'USD'), 'Sales'));
  l = postOk(l, createBalancedEntry(`r${round}-rent`, addDays(base, 4), rent, cash, Money.from(rentAmt, 'USD'), 'Rent'));
  // A second currency so per-currency handling is exercised.
  l = postOk(l, createBalancedEntry(`r${round}-eur`, addDays(base, 5), eurCash, equity, Money.from(amt(rng, 1000, 4000), 'EUR'), 'EUR capital'));

  // ── INVARIANT: equation holds + determinism ──────────────────────────────
  expect(l.verifyFundamentalEquation()).toBe(true);
  expect(Ledger.fromJSON(l.toJSON()).auditHash()).toBe(l.auditHash());

  // ── 2. Cash flow statement reconciles exactly (per currency) ─────────────
  const cf = cashFlowStatement(l);
  for (const s of cf) expect(s.reconciled).toBe(true);
  const usd = cf.find(s => s.currency === 'USD')!;
  // Independently expected USD figures.
  const expFinancing = (Number(capital) + Number(loanAmt)).toFixed(2);
  const expInvesting = (-Number(equipAmt)).toFixed(2);
  const expOperating = (Number(salesAmt) - Number(rentAmt)).toFixed(2);
  expect(usd.financing).toBe(`${expFinancing} USD`);
  expect(usd.investing).toBe(`${expInvesting} USD`);
  expect(usd.operating).toBe(`${expOperating} USD`);

  // ── 3. Reconciliation: truthful match + injected discrepancy ─────────────
  const usdCashBal = l.balance(cash, undefined, 'USD');
  const matchAll = reconcilePositions(l, l.trialBalance().map(({ account, balance }) => ({
    accountCode: account.code, amount: balance.toDecimal().toString(), currency: balance.currency,
  })));
  expect(matchAll.reconciled).toBe(true);

  const broken = reconcilePositions(l, [
    { accountCode: cash.code, amount: usdCashBal.add(Money.from('0.01', 'USD')).toDecimal().toString(), currency: 'USD' },
  ]);
  const brokenRow = broken.rows.find(r => r.accountCode === cash.code)!;
  expect(brokenRow.status).toBe('mismatch');
  expect(brokenRow.diff).toBe('-0.01 USD'); // ledger - external = -0.01
  expect(broken.reconciled).toBe(false);

  // ── 4. Trading + holding-period classification ───────────────────────────
  let tl = emptyLedger();
  const buyDate = base;
  const sellOffset = 200 + round * 100; // 300 / 400 / 500 days → crosses the 365 boundary across rounds
  const sellDate = addDays(buyDate, sellOffset);
  const qty = String(2 + round); // 3 / 4 / 5 units
  const buyFill: Fill = {
    id: `t${round}-b`, effectiveDate: buyDate, venue: 'CB', base: 'XYZ', quote: 'USD', side: 'buy',
    quantity: Money.from(qty, 'XYZ'), price: Money.from(amt(rng, 100, 100), 'USD'),
  };
  const sellFill: Fill = {
    id: `t${round}-s`, effectiveDate: sellDate, venue: 'CB', base: 'XYZ', quote: 'USD', side: 'sell',
    quantity: Money.from(qty, 'XYZ'), price: Money.from(amt(rng, 150, 100), 'USD'),
  };
  for (const e of fillToEntries(buyFill)) tl = postOk(tl, e);
  for (const e of fillToEntries(sellFill)) tl = postOk(tl, e);
  expect(tl.verifyFundamentalEquation()).toBe(true);

  const relief = reliefFor(tl, 'XYZ', 'FIFO');
  const disp = relief.realized[0];
  // Independent holding-period expectation.
  const expectedTerm = daysBetween(buyDate, sellDate) >= 365 ? 'long' : 'short';
  expect(disp.term).toBe(expectedTerm);
  expect(disp.lots).toHaveLength(1);
  expect(disp.lots[0].holdingDays).toBe(daysBetween(buyDate, sellDate));
  // Per-slice basis/proceeds reconcile to disposal totals.
  expect(disp.lots[0].basis.equals(disp.basis)).toBe(true);
  expect(disp.lots[0].proceeds.equals(disp.proceeds)).toBe(true);

  // ── 5. Settlement-date accounting nets to zero and equals spot ───────────
  const settleDate = addDays(buyDate, 2);
  const res = settleFill(buyFill, settleDate);
  let sl = emptyLedger();
  for (const e of res.tradeDate) sl = postOk(sl, e);
  // Cash unmoved at trade date; payable carries it.
  expect(sl.balance(cashAccount('CB', 'USD'), buyDate, 'USD').isZero()).toBe(true);
  expect(sl.balance(settlementPayableAccount('CB', 'USD'), buyDate, 'USD').toString())
    .toBe(res.settledCash.toString());
  for (const e of res.settlement) sl = postOk(sl, e);
  expect(sl.balance(settlementPayableAccount('CB', 'USD'), settleDate, 'USD').isZero()).toBe(true);
  // Equal to spot fill on cash.
  let spot = emptyLedger();
  for (const e of fillToEntries(buyFill)) spot = postOk(spot, e);
  expect(sl.balance(cashAccount('CB', 'USD'), settleDate, 'USD').toString())
    .toBe(spot.balance(cashAccount('CB', 'USD'), undefined, 'USD').toString());

  // ── 6. ADVERSARIAL: every bad proposal must be rejected ──────────────────
  let slipped = 0;
  const guard = (fn: () => void) => { try { fn(); slipped++; } catch { /* expected */ } };

  // a. unbalanced entry (off-by-one credit) — apply must refuse.
  expectRejected(l, () => new JournalEntry(`bad-unbal-${round}`, base, [
    makeLine(cash, Money.from('100.00', 'USD'), 'debit'),
    makeLine(equity, Money.from('99.99', 'USD'), 'credit'),
  ], 'unbalanced'));

  // b. currency mix in one entry.
  expectRejected(l, () => new JournalEntry(`bad-mix-${round}`, base, [
    makeLine(cash, Money.from('100.00', 'USD'), 'debit'),
    makeLine(eurCash, Money.from('100.00', 'EUR'), 'credit'),
  ], 'mixed'));

  // c. duplicate id — re-applying an existing entry id.
  {
    const dup = createBalancedEntry(`r${round}-cap`, base, cash, equity, Money.from('1.00', 'USD'), 'dup');
    const before = l.entries.length;
    const r = l.apply(dup);
    expect(r.result.ok).toBe(false);
    expect(r.result.violations.some(v => v.type === 'DUPLICATE_ID')).toBe(true);
    expect(r.ledger.entries.length).toBe(before);
  }

  // d. sub-scale money — construction fails closed.
  guard(() => { Money.from('1.001', 'USD'); });
  // e. float literal — construction fails closed.
  guard(() => { Money.from(0.1 as unknown as number, 'USD'); });
  // f. non-finite — construction fails closed (v0.16.2 guard).
  guard(() => { Money.from('Infinity', 'USD'); });
  guard(() => { Money.from('NaN', 'USD'); });
  // g. oversell — relief fails closed.
  guard(() => {
    let ol = emptyLedger();
    for (const e of fillToEntries(buyFill)) ol = ol.apply(e).ledger;
    const over: Fill = { ...sellFill, id: `over-${round}`, quantity: Money.from(String(Number(qty) + 10), 'XYZ') };
    for (const e of fillToEntries(over)) ol = ol.apply(e).ledger;
    reliefFor(ol, 'XYZ', 'FIFO');
  });
  // h. settlement before trade date — fails closed.
  guard(() => { settleFill(buyFill, addDays(buyDate, -1)); });
  // i. transfer fee exceeds amount — fails closed.
  guard(() => { transferToEntries(`bad-xfer-${round}`, base, 'A', 'B', Money.from('1.00', 'XYZ'), Money.from('2.00', 'XYZ')); });
  // j. reconciliation against a sub-scale external amount — fails closed.
  guard(() => { reconcilePositions(l, [{ accountCode: cash.code, amount: '1.001', currency: 'USD' }]); });

  expect(slipped).toBe(0);

  // Final: ledger still pristine and balanced after the adversarial barrage.
  expect(l.verifyFundamentalEquation()).toBe(true);
  expect(l.entries.length).toBe(6);
}

describe('Full-feature adversarial verification (3 rounds)', () => {
  for (const round of [1, 2, 3]) {
    it(`round ${round}: all invariants hold and every bad proposal is rejected`, () => {
      runRound(round);
    });
  }
});
