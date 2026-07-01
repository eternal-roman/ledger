/**
 * End-to-end demonstration of the new core financial utilities:
 * Period locks/hard close, closing entries to retained earnings,
 * multi-currency FX translation with CTA, and depreciation/amortization schedules.
 *
 * All monetary operations and generated entries use the kernel primitives
 * (Money.from, createBalancedEntry, validateEntry, Ledger.apply).
 * Entries are validated, the fundamental equation holds, and runs are deterministic.
 */

import {
  Money, Account, AccountType,
  emptyLedger, createBalancedEntry,
  createPeriodLock, guardedApply,
  generateClosingEntries,
  computeFxTranslation,
  buildDepreciationSchedule, depreciationToEntries,
  makeCanonicalArtifact,
} from '../src/index.js';

async function main() {
  const cash = new Account('1000', 'Cash', AccountType.Asset);
  const revenue = new Account('4000', 'Revenue', AccountType.Income);
  const expense = new Account('5000', 'Operating Expense', AccountType.Expense);
  const re = new Account('3100', 'Retained Earnings', AccountType.Equity);
  const assetEur = new Account('1200', 'EUR Receivable', AccountType.Asset);

  // === 1. Activity in open period ===
  let ledger = emptyLedger();
  ledger = ledger.apply(createBalancedEntry('sale', '2026-07-01', cash, revenue, Money.from('8000', 'USD'), 'Sale')).ledger;
  ledger = ledger.apply(createBalancedEntry('op', '2026-07-02', expense, cash, Money.from('3000', 'USD'), 'Op ex')).ledger;
  ledger = ledger.apply(createBalancedEntry('eur', '2026-07-03', assetEur, revenue, Money.from('5000', 'EUR'), 'EU sale')).ledger;

  console.log('Pre-close net income (demo):', ledger.incomeStatement?.()?.netIncome?.toString?.() ?? 'n/a');

  // === 2. Period Lock (anti-fraud) ===
  const q2Lock = createPeriodLock('Q2-2026-close', '2026-06-30', 'CFO', 'Q2 hard close - no backdating');
  const postCloseAttempt = createBalancedEntry('bad-backdate', '2026-06-15', cash, revenue, Money.from('100', 'USD'), 'Illegal backdate');
  const guarded = guardedApply(ledger, postCloseAttempt, { periodLocks: [q2Lock] });
  console.log('Backdated post after lock rejected?', !guarded.result.ok, guarded.result.violations?.[0]?.type);

  // === 3. Closing ===
  const closeEntries = generateClosingEntries(ledger, '2026-07-31', re);
  for (const e of closeEntries) {
    const r = ledger.apply(e);
    if (!r.result.ok) throw new Error('Close failed validation');
    ledger = r.ledger;
  }
  console.log('Post close RE balances:', ledger.balancesByCurrency(re).map(b => b.toString()));
  console.log('Equation after close:', ledger.verifyFundamentalEquation());

  // === 4. FX Translation + CTA (multi-curr view) ===
  const rates = {
    EUR: { rate: '1.08', source: 'ECB 2026-07-31' },
    USD: { rate: '1' },
  };
  const trans = computeFxTranslation(ledger, '2026-07-31', rates, 'USD');
  console.log('CTA plug (reporting USD):', trans.cta.toString());
  console.log('Translated balances balanced with CTA?', trans.balancedWithCta);

  // === 5. Depreciation schedule (SL) ===
  const assetCost = Money.from('12000', 'USD');
  const sched = buildDepreciationSchedule({
    id: 'SERVER-001',
    cost: assetCost,
    salvage: Money.from('2000', 'USD'),
    usefulLifePeriods: 5,
    method: 'straight-line',
    commencementDate: '2026-01-01',
  });
  const depEntries = depreciationToEntries({
    id: 'SERVER-001',
    cost: assetCost,
    salvage: Money.from('2000', 'USD'),
    usefulLifePeriods: 5,
    method: 'straight-line',
    commencementDate: '2026-01-01',
  });
  console.log('Dep SL periods:', sched.periods.length, 'first depr:', sched.periods[0].depreciation.toString());

  // Apply first dep entry to prove
  const firstDep = depEntries[0];
  const r = ledger.apply(firstDep);
  if (!r.result.ok) throw new Error('Dep entry invalid');
  console.log('Dep entry valid + equation after:', r.ledger.verifyFundamentalEquation());

  // CFA for the dep schedule
  const cfa = makeCanonicalArtifact({
    scope: 'Depreciation schedule for SERVER-001',
    assumptions: ['SL 5yr, cost 12000 salvage 2000, 2026-01'],
    citations: ['IAS 16.48'],
    kernelPlan: 'Money.from + buildDepreciationSchedule + depreciationToEntries + Ledger.apply + validateEntry',
    proof: 'allocate sums to base; entries validated; equation holds',
    reproducibility: 'buildDepreciationSchedule + depreciationToEntries with fixed inputs',
    auditHash: r.ledger.auditHash(),
  });
  console.log('CFA for dep:', cfa.scope);

  console.log('\nAll core features exercised with kernel invariants.');
}

main().catch(e => { console.error(e); process.exit(1); });
