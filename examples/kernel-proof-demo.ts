/**
 * Dogfood of scanner + real kernel proof (runTrace + makeCanonicalArtifact).
 * Run: npx tsx examples/kernel-proof-demo.ts
 */
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, runTrace, makeCanonicalArtifact, scanSourceForViolations } from '../src/index.js';

const cash = new Account('1000', 'Cash', AccountType.Asset);
const equity = new Account('3000', 'Equity', AccountType.Equity);
const feeExp = new Account('5100', 'FeeExpense', AccountType.Expense);

function main() {
  const e1 = createBalancedEntry('cap', '2026-06-22', cash, equity, Money.from('10000', 'USD'), 'Initial capital');
  const e2 = createBalancedEntry('fee', '2026-06-22', feeExp, cash, Money.from('25', 'USD'), 'Fee on cap');
  const e3 = createBalancedEntry('adj', '2026-06-22', cash, equity, Money.from('100', 'USD'), 'Adjustment entry');

  const trace = runTrace([e1, e2, e3]);
  const art = makeCanonicalArtifact({
    scope: 'kernel-proof-demo',
    assumptions: ['date=2026-06-22', 'currency=USD'],
    citations: ['core:double-entry', 'core:exact-decimal'],
    kernelPlan: 'Money.from + createBalancedEntry + runTrace + validateEntry + auditHash',
    proof: trace.finalEquation ? 'equation holds + hash chain' : 'VIOLATION',
    reproducibility: 'static demo',
  });

  console.log('=== kernel-proof-demo ===');
  console.log('Final hash prefix:', trace.finalHash.slice(0, 16));
  console.log('Equation holds:', trace.finalEquation);
  console.log('Artifact:', art);

  // Scanner dogfood on a bad snippet
  const bad = 'const leak = 0.05 * 10000;';
  const vios = scanSourceForViolations(bad, 'snippet.ts');
  console.log('Scanner on bad snippet found:', vios.length, 'violations (expected >0)');
  console.log('Suggestion sample:', vios[0]?.suggestion);
}

main();
