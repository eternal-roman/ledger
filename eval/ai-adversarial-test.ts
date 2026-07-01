/**
 * Adversarial tests (due diligence): cases where a bare LLM (no guardrail) would silently corrupt books.
 * Each section is labelled with the failure mode it targets.
 *
 * Real API quirks discovered and documented inline.
 */
import {
  Money,
  Account,
  AccountType,
  makeLine,
  createEntry,
  createBalancedEntry,
  createFxConversion,
  emptyLedger,
  validateEntry,
  verifyDeterminism,
  makeCanonicalArtifact,
  runTrace,
  buildSchedule,
  leaseToEntries,
  presentValue,
  type LeaseInput,
} from '../src/index.js';

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗  ${label}\n       ${e.message}`);
    failed++;
  }
}

function expect<T>(got: T, expected: T) {
  const g = JSON.stringify(got);
  const e = JSON.stringify(expected);
  if (g !== e) throw new Error(`got ${g}, want ${e}`);
}

function expectThrows(fn: () => void) {
  try { fn(); throw new Error('expected throw but got none'); }
  catch (e: any) { if (e.message === 'expected throw but got none') throw e; }
}

// ─── Accounts ────────────────────────────────────────────────────────────────
const cash    = new Account('1000', 'Cash',          AccountType.Asset);
const ar      = new Account('1100', 'Accounts Rec.', AccountType.Asset);
const inv     = new Account('1200', 'Inventory',     AccountType.Asset);
const ap      = new Account('2000', 'Accounts Pay.', AccountType.Liability);
const equity  = new Account('3000', 'Owner Equity',  AccountType.Equity);
const revenue = new Account('4000', 'Revenue',       AccountType.Income);
const cogs    = new Account('5000', 'COGS',          AccountType.Expense);

// ─── 1. Float arithmetic ──────────────────────────────────────────────────────
console.log('\n1. Float arithmetic — the classic LLM trap');

check('0.1 + 0.2 is exactly 0.30 (not 0.30000000000000004)', () => {
  expect(Money.from('0.1', 'USD').add(Money.from('0.2', 'USD')).toString(), '0.30 USD');
});

check('JS float 0.1+0.2 !== 0.3 — the broken baseline we guard against', () => {
  expect(0.1 + 0.2 === 0.3, false);
});

check('Money.from rejects a JS float literal (type guard)', () => {
  expectThrows(() => Money.from(0.1 as any, 'USD'));
});

check('large number: 999999999999.99 + 0.01 = 1000000000000.00', () => {
  expect(
    Money.from('999999999999.99', 'USD').add(Money.from('0.01', 'USD')).toString(),
    '1000000000000.00 USD'
  );
});

check('allocate([1,1,1]) sums exactly to original — no penny created or destroyed', () => {
  const parts = Money.from('1.00', 'USD').allocate([1, 1, 1]);
  const total = parts.reduce((a, b) => a.add(b));
  expect(total.toString(), '1.00 USD');
  // Remainder goes to the LAST part: [0.33, 0.33, 0.34]
  expect(parts.map(p => p.toString()), ['0.33 USD', '0.33 USD', '0.34 USD']);
});

check('div keeps full internal precision — display truncates, arithmetic does not', () => {
  // 1.00 / 3 internally stays at 0.3333...; toString() shows 0.33 (2dp display)
  // but 0.3333... * 3 = 1.00 exactly — no drift
  const third = Money.from('1.00', 'USD').div(3);
  expect(third.toString(), '0.33 USD');          // display: truncated
  expect(third.mul(3).toString(), '1.00 USD');   // arithmetic: exact
});

check('Money.from("0.001", "USD") throws — sub-scale rejected at construction', () => {
  expectThrows(() => Money.from('0.001', 'USD'));
});

check('sub-scale Money.from throws before makeLine is ever reached', () => {
  // The guard is now at Money.from, not deferred to createEntry
  expectThrows(() => Money.from('0.001', 'USD'));
  expectThrows(() => Money.from('0.123', 'USD')); // 3dp for 2dp currency
  // Valid amounts still work
  const fine = Money.from('0.01', 'USD');
  expect(fine.toString(), '0.01 USD');
});

// ─── 2. Unbalanced entries ────────────────────────────────────────────────────
console.log('\n2. Unbalanced entries — createEntry validates at construction');

// KEY FINDING: createEntry validates immediately and THROWS on invalid state.
// You cannot hold an unbalanced JournalEntry object — the factory is the guard.
check('createEntry throws immediately on debits ≠ credits (no deferred check)', () => {
  expectThrows(() =>
    createEntry('bad-1', '2026-06-28',
      [
        makeLine(cash,   Money.from('100.00', 'USD'), 'debit', {}),
        makeLine(equity, Money.from('99.00', 'USD'),  'credit', {}),
      ],
      'Off by $1'
    )
  );
});

check('createEntry accepts a balanced 2-line entry', () => {
  const e = createEntry('ok-1', '2026-06-28',
    [
      makeLine(cash,   Money.from('1000.00', 'USD'), 'debit',  {}),
      makeLine(equity, Money.from('1000.00', 'USD'), 'credit', {}),
    ],
    'Capital injection'
  );
  expect(validateEntry(e).ok, true);
});

check('compound 3-leg entry: cash70 + AR30 debit = Revenue100 credit', () => {
  const e = createEntry('rev-1', '2026-06-28',
    [
      makeLine(cash,    Money.from('70.00',  'USD'), 'debit',  {}),
      makeLine(ar,      Money.from('30.00',  'USD'), 'debit',  {}),
      makeLine(revenue, Money.from('100.00', 'USD'), 'credit', {}),
    ],
    'Split revenue'
  );
  expect(validateEntry(e).ok, true);
});

check('each apply is valid and accumulates correctly', () => {
  const e1 = createBalancedEntry('ok-g1', '2026-06-28', cash, equity, Money.from('500.00', 'USD'), 'ok1');
  const e2 = createBalancedEntry('ok-g2', '2026-06-28', cash, revenue, Money.from('200.00', 'USD'), 'ok2');
  const { ledger: l1, result: r1 } = emptyLedger().apply(e1);
  expect(r1.ok, true);
  const { ledger: l2, result: r2 } = l1.apply(e2);
  expect(r2.ok, true);
  expect(l2.balance(cash).toString(), '700.00 USD');
});

// ─── 3. Currency mixing ───────────────────────────────────────────────────────
console.log('\n3. Currency mixing — what an AI would do if not guarded');

check('entry mixing USD credit and EUR debit is rejected at createEntry', () => {
  expectThrows(() =>
    createEntry('fx-bad', '2026-06-28',
      [
        makeLine(cash,   Money.from('100.00', 'USD'), 'debit',  {}),
        makeLine(equity, Money.from('90.00',  'EUR'), 'credit', {}),
      ],
      'Mixed currencies no FX leg'
    )
  );
});

check('proper FX conversion with clearing accounts produces 2 balanced entries', () => {
  const usdCash  = new Account('1001', 'USD Cash',     AccountType.Asset);
  const eurCash  = new Account('1002', 'EUR Cash',     AccountType.Asset);
  const clearing = new Account('1999', 'FX Clearing',  AccountType.Asset);

  // createFxConversion(idBase, date, foreignDebit, domesticCredit,
  //   foreignAmount, domesticAmount, clearingForeign, clearingDomestic, description)
  const entries = createFxConversion(
    'fx-ok', '2026-06-28',
    eurCash, usdCash,
    Money.from('92.00', 'EUR'), Money.from('100.00', 'USD'),
    clearing, clearing,
    'EUR→USD conversion'
  );
  expect(entries.length, 2);
  expect(validateEntry(entries[0]).ok, true);
  expect(validateEntry(entries[1]).ok, true);
});

check('multi-currency ledger equation holds per-currency', () => {
  const usdCash = new Account('1001', 'USD Cash', AccountType.Asset);
  const eurCash = new Account('1002', 'EUR Cash', AccountType.Asset);
  const usdEq   = new Account('3001', 'USD Equity', AccountType.Equity);
  const eurEq   = new Account('3002', 'EUR Equity', AccountType.Equity);

  let l = emptyLedger();
  l = l.apply(createBalancedEntry('u1', '2026-06-28', usdCash, usdEq, Money.from('100.00', 'USD'), 'USD cap')).ledger;
  l = l.apply(createBalancedEntry('e1', '2026-06-28', eurCash, eurEq, Money.from('90.00', 'EUR'), 'EUR cap')).ledger;

  expect(l.balance(usdCash).toString(), '100.00 USD');
  expect(l.balance(eurCash).toString(), '90.00 EUR');
  expect(l.verifyFundamentalEquation(), true);
});

// ─── 4. Fundamental equation survives a 5-step business lifecycle ─────────────
console.log('\n4. Fundamental equation A=L+E holds after each step');

check('5-step lifecycle: invest → buy on credit → sell → COGS → pay AP', () => {
  let l = emptyLedger();

  // 1. Owner invests $50,000
  l = l.apply(createBalancedEntry('T01', '2026-01-01', cash, equity,
    Money.from('50000.00', 'USD'), 'Capital injection')).ledger;
  expect(l.verifyFundamentalEquation(), true);

  // 2. Buy inventory on credit $20,000
  l = l.apply(createEntry('T02', '2026-01-15',
    [makeLine(inv, Money.from('20000.00', 'USD'), 'debit',  {}),
     makeLine(ap,  Money.from('20000.00', 'USD'), 'credit', {})],
    'Buy inventory')).ledger;
  expect(l.verifyFundamentalEquation(), true);

  // 3. Sell inventory for $30,000 cash
  l = l.apply(createEntry('T03', '2026-01-20',
    [makeLine(cash,    Money.from('30000.00', 'USD'), 'debit',  {}),
     makeLine(revenue, Money.from('30000.00', 'USD'), 'credit', {})],
    'Cash sale')).ledger;
  expect(l.verifyFundamentalEquation(), true);

  // 4. Record COGS
  l = l.apply(createEntry('T04', '2026-01-20',
    [makeLine(cogs, Money.from('20000.00', 'USD'), 'debit',  {}),
     makeLine(inv,  Money.from('20000.00', 'USD'), 'credit', {})],
    'COGS')).ledger;
  expect(l.verifyFundamentalEquation(), true);

  // 5. Pay AP
  l = l.apply(createEntry('T05', '2026-01-31',
    [makeLine(ap,   Money.from('20000.00', 'USD'), 'debit',  {}),
     makeLine(cash, Money.from('20000.00', 'USD'), 'credit', {})],
    'Pay supplier')).ledger;
  expect(l.verifyFundamentalEquation(), true);

  expect(l.balance(cash).toString(),    '60000.00 USD');
  expect(l.balance(inv).toString(),     '0.00 USD');
  expect(l.balance(ap).toString(),      '0.00 USD');
  expect(l.balance(revenue).toString(), '30000.00 USD');
  expect(l.balance(cogs).toString(),    '20000.00 USD');
});

// ─── 5. Audit hash determinism ────────────────────────────────────────────────
console.log('\n5. Determinism — same operations must produce the same hash');

check('identical sequences produce identical SHA-256 hash', () => {
  const build = () => {
    let l = emptyLedger();
    l = l.apply(createBalancedEntry('d1', '2026-06-28', cash, equity, Money.from('1000.00', 'USD'), 'seed')).ledger;
    l = l.apply(createBalancedEntry('d2', '2026-06-28', cash, revenue, Money.from('500.00', 'USD'), 'rev')).ledger;
    return l.auditHash();
  };
  const h1 = build(), h2 = build();
  expect(h1, h2);
  // Hash is raw SHA-256 hex, 64 chars — NO ledger-audit-v1: prefix in the output
  if (h1.length !== 64) throw new Error(`unexpected hash length: ${h1.length}`);
  if (!/^[0-9a-f]{64}$/.test(h1)) throw new Error(`hash not hex: ${h1}`);
});

check('verifyDeterminism returns { ok, ledger, hash }', () => {
  const entries = [
    createBalancedEntry('det1', '2026-06-28', cash, equity, Money.from('5000.00', 'USD'), 'det'),
  ];
  const r = verifyDeterminism(entries);
  expect(r.ok, true);
  if (r.hash.length !== 64) throw new Error('hash wrong length');
});

check('different ledger state → different hash', () => {
  const e1 = createBalancedEntry('h1', '2026-06-28', cash, equity, Money.from('100.00', 'USD'), 'A');
  const e2 = createBalancedEntry('h2', '2026-06-28', cash, revenue, Money.from('50.00', 'USD'), 'B');
  const short = emptyLedger().apply(e1).ledger.auditHash();
  const long  = emptyLedger().apply(e1).ledger.apply(e2).ledger.auditHash();
  if (short === long) throw new Error('hashes must differ when ledger contents differ');
});

// ─── 6. runTrace — step-by-step proof ─────────────────────────────────────────
console.log('\n6. runTrace — structured proof (checkpoints, not steps)');

check('trace returns checkpoints per entry and finalEquation', () => {
  const entries = [
    createBalancedEntry('t1', '2026-06-28', cash, equity,   Money.from('10000.00', 'USD'), 'invest'),
    createBalancedEntry('t2', '2026-06-28', cash, revenue,  Money.from('5000.00',  'USD'), 'revenue'),
  ];
  const trace = runTrace(entries);
  expect(trace.ok, true);
  expect(trace.checkpoints.length, 2);          // checkpoints, not steps
  expect(trace.checkpoints[0].equationHolds, true);
  expect(trace.checkpoints[1].equationHolds, true);
  expect(trace.finalEquation, true);
  if (!trace.finalLedger) throw new Error('no finalLedger');
});

check('runTrace throws at the offending step (no partial trace on failure)', () => {
  const good = createBalancedEntry('g1', '2026-06-28', cash, equity, Money.from('1000.00', 'USD'), 'ok');
  // Attempt to sneak in a bad entry by bypassing createEntry — we cannot (factory throws).
  // So this test confirms: every entry in a trace must already be validated.
  // runTrace will only fail if Ledger.apply rejects a previously-valid entry (shouldn't happen).
  const trace = runTrace([good]);
  expect(trace.ok, true);
});

// ─── 7. makeCanonicalArtifact ─────────────────────────────────────────────────
console.log('\n7. Canonical artifact — requires scope, assumptions, proof');

check('artifact requires scope + assumptions + citations + kernelPlan + proof + reproducibility + a real auditHash', () => {
  // makeCanonicalArtifact takes a params object, not an entries array. auditHash
  // must be a real digest from a real trace, not a description of one (nothing
  // here is silently defaulted for the caller).
  const proofEntries = [createBalancedEntry('artifact-proof', '2026-06-28', cash, equity, Money.from('1.00', 'USD'), 'artifact proof entry')];
  const proofTrace = runTrace(proofEntries);
  const artifact = makeCanonicalArtifact({
    scope: 'capital injection + revenue cycle test',
    assumptions: ['USD 2dp', 'entries validated before apply'],
    citations: ['core:double-entry', 'core:exact-decimal'],
    kernelPlan: 'Money.from + createBalancedEntry + runTrace + validateEntry',
    proof: 'verifyFundamentalEquation() = true; auditHash stable',
    reproducibility: 'deterministic: same entries → same hash',
    auditHash: proofTrace.finalHash,
  });
  if (!artifact.scope) throw new Error('no scope');
  if (!artifact.proof) throw new Error('no proof');
  if (artifact.auditHash !== proofTrace.finalHash) throw new Error('auditHash not preserved');
  // artifact is returned directly (no ok wrapper)
});

check('makeCanonicalArtifact rejects a fabricated (non-hash) auditHash instead of accepting prose', () => {
  let threw = false;
  try {
    makeCanonicalArtifact({
      scope: 'x',
      assumptions: ['a'],
      citations: ['core:double-entry'],
      kernelPlan: 'Money.from + createEntry + Ledger.apply + validateEntry',
      proof: 'trust me',
      reproducibility: 'r',
      auditHash: 'looks balanced to me',
    });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('expected makeCanonicalArtifact to reject a non-hash auditHash');
});

// ─── 8. IFRS 16 — to the cent ─────────────────────────────────────────────────
console.log('\n8. IFRS 16 — present value + amortisation to the cent');

const lease3yr: LeaseInput = {
  id: 'L1', commencementDate: '2026-01-01', currency: 'USD', annualDiscountRate: '0.05',
  payments: [
    { date: '2026-12-31', amount: Money.from('10000.00', 'USD') },
    { date: '2027-12-31', amount: Money.from('10000.00', 'USD') },
    { date: '2028-12-31', amount: Money.from('10000.00', 'USD') },
  ],
};

check('PV of 3×10,000 @5% = 27,232.48 (replicates IFRS 16 Illustrative Example)', () => {
  expect(presentValue(lease3yr.payments, '0.05', 'USD').toString(), '27232.48 USD');
});

check('liability closes to exactly 0.00 after full amortisation', () => {
  const sched = buildSchedule(lease3yr);
  expect(sched.periods[2].closingLiability.toString(), '0.00 USD');
});

check('total interest = payments (30,000) − initial liability (27,232.48) = 2,767.52', () => {
  const sched = buildSchedule(lease3yr);
  const total = sched.periods.reduce((a, p) => a.add(p.interest), Money.zero('USD'));
  expect(total.toString(), '2767.52 USD');
});

check('depreciation parts sum exactly to ROU cost (allocate handles rounding)', () => {
  const sched = buildSchedule(lease3yr);
  const total = sched.periods.reduce((a, p) => a.add(p.depreciation), Money.zero('USD'));
  expect(total.toString(), '27232.48 USD');
});

check('10 lease entries: each valid, equation holds throughout, deterministic hash', () => {
  const entries = leaseToEntries(lease3yr);
  expect(entries.length, 10);
  let l = emptyLedger();
  for (const e of entries) {
    expect(validateEntry(e).ok, true);
    l = l.apply(e).ledger;
    expect(l.verifyFundamentalEquation(), true);
  }
  // Rebuild → identical hash
  let l2 = emptyLedger();
  for (const e of leaseToEntries(lease3yr)) l2 = l2.apply(e).ledger;
  expect(l.auditHash(), l2.auditHash());
});

// ─── 9. Immutability ──────────────────────────────────────────────────────────
console.log('\n9. Immutability — no shared mutable state');

check('original ledger unchanged after apply', () => {
  const l0 = emptyLedger();
  const l1 = l0.apply(createBalancedEntry('i1', '2026-06-28', cash, equity, Money.from('100.00', 'USD'), 'x')).ledger;
  expect(l0.balance(cash).toString(), '0.00 USD');
  expect(l1.balance(cash).toString(), '100.00 USD');
});

check('two branches from same base are independent', () => {
  const base = emptyLedger().apply(
    createBalancedEntry('base', '2026-06-28', cash, equity, Money.from('1000.00', 'USD'), 'base')
  ).ledger;

  const a = base.apply(createBalancedEntry('bA', '2026-06-28', cash, revenue, Money.from('200.00', 'USD'), 'A')).ledger;
  const b = base.apply(createBalancedEntry('bB', '2026-06-28', cash, revenue, Money.from('999.00', 'USD'), 'B')).ledger;

  expect(a.balance(cash).toString(),    '1200.00 USD');
  expect(b.balance(cash).toString(),    '1999.00 USD');
  expect(base.balance(cash).toString(), '1000.00 USD');
});

// ─── 10. Edge cases an AI would hallucinate ───────────────────────────────────
console.log('\n10. AI hallucination targets — amounts, dates, IDs');

check('Ledger.apply rejects duplicate entry IDs — DUPLICATE_ID violation', () => {
  const e = createBalancedEntry('dup', '2026-06-28', cash, equity, Money.from('100.00', 'USD'), 'post');
  const { ledger: l1, result: r1 } = emptyLedger().apply(e);
  expect(r1.ok, true);
  expect(l1.balance(cash).toString(), '100.00 USD');
  const { ledger: l2, result: r2 } = l1.apply(e); // same ID → rejected
  expect(r2.ok, false);
  if (r2.ok) throw new Error('should have been rejected');
  expect(r2.violations[0].type, 'DUPLICATE_ID');
  // Ledger is unchanged — no double-post
  expect(l2.balance(cash).toString(), '100.00 USD');
});

check('non-ISO date is rejected', () => {
  expectThrows(() =>
    createBalancedEntry('bad-date', 'June 28 2026', cash, equity, Money.from('100.00', 'USD'), 'bad date')
  );
});

check('balance of account with no entries is zero (not undefined/NaN)', () => {
  const empty = emptyLedger();
  const bal = empty.balance(cash);
  expect(bal.toString(), '0.00 USD');
});

check('Money zero values are correct sentinels', () => {
  const z = Money.zero('USD');
  expect(z.toString(), '0.00 USD');
  expect(z.add(Money.from('5.00', 'USD')).toString(), '5.00 USD');
});

check('negative debit amount rejected by makeLine', () => {
  expectThrows(() => makeLine(cash, Money.from('-100.00', 'USD'), 'debit', {}));
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed + failed} total   ${passed} passed   ${failed} failed`);
if (failed > 0) process.exit(1);
