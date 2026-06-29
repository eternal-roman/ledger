#!/usr/bin/env tsx
/**
 * Benchmark runner. Default (fixture) mode is deterministic and CI-safe:
 *
 *   npm run eval                 # recorded baseline proposals
 *   npm run eval -- --live       # ask a Claude model (needs ANTHROPIC_API_KEY)
 *
 * Writes a Markdown report to docs/BENCHMARK.md and prints the headline. Exits
 * non-zero if the guarded run fails to fully protect the books (so CI can assert).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tasks } from './dataset.js';
import { runBenchmark, type BenchmarkResult } from './harness.js';
import { fixtureProposer, liveProposer } from './proposers.js';

function renderReport(result: BenchmarkResult, source: string): string {
  const { baseline, guarded, outcomes } = result;
  const pct = (n: number, d: number) => (d === 0 ? '0' : ((100 * n) / d).toFixed(0));

  const rows = outcomes
    .map((o) => {
      const task = tasks.find((t) => t.id === o.taskId);
      const status = o.valid ? '✅ valid' : '❌ ' + [...new Set(o.violationTypes)].join(', ');
      return `| \`${o.taskId}\` | ${task?.prompt ?? ''} | ${status} |`;
    })
    .join('\n');

  return `# Benchmark: deterministic guardrail for AI bookkeeping

_Proposals from: **${source}**. Regenerate with \`npm run eval\`._

An AI bookkeeper proposes ${baseline.proposed} journal entries. We commit them two
ways: **baseline** (as-is, no guardrail) and **guarded** (each must pass the
\`@eternal-roman/ledger\` kernel — \`validateEntry\` + \`Ledger.apply\` — before it
lands). We then count how many invariant violations reach the committed books.

> This is an invariant-enforcement benchmark: the properties hold by construction of the kernel,
> not a claim that the model got smarter.

## Headline

| | Baseline (no guardrail) | Guarded (kernel) |
|---|---|---|
| Entries proposed | ${baseline.proposed} | ${guarded.proposed} |
| **Invariant violations reaching the books** | **${baseline.violationsReachingBooks} (${pct(baseline.violationsReachingBooks, baseline.proposed)}%)** | **${guarded.violationsReachingBooks} (0%)** |
| Rejected by the guardrail before commit | — | ${guarded.rejectedByGuardrail} |
| Entries committed | ${baseline.posted} | ${guarded.posted} |
| Books balance (debits = credits / equation) | ${baseline.finalBalanced ? 'yes' : '**no**'} | ${guarded.finalBalanced ? 'yes' : 'no'} |
| Tamper-evident audit hash | — | \`${guarded.auditHash?.slice(0, 16)}…\` |
| Deterministic (rebuild = identical hash) | — | ${guarded.deterministic ? 'yes' : 'no'} |

Baseline silently commits **${baseline.violationsReachingBooks}** corrupt entries and
leaves the books **${baseline.finalBalanced ? 'balanced' : 'unbalanced'}**. The kernel
caught **every one** — they never reached the books — and the surviving ledger is
balanced, audit-hashed, and reproducible.

## Per-proposal detail

| Task | Instruction | Kernel verdict |
|------|-------------|----------------|
${rows}

Failure modes present in the baseline proposals — float / sub-cent precision drift,
unbalanced debits vs credits, and silent currency mixing — are exactly the
token-level errors LLMs make on numbers. The guarded path makes them
un-committable.
`;
}

async function main(): Promise<void> {
  const live = process.argv.includes('--live');
  const source = live ? `live Claude model (${process.env.LEDGER_EVAL_MODEL ?? 'claude-sonnet-4-6'})` : 'recorded fixture';
  const proposals = live ? await liveProposer() : fixtureProposer();

  const result = runBenchmark(proposals);
  const report = renderReport(result, source);

  const outPath = path.resolve(fileURLToPath(new URL('../docs/BENCHMARK.md', import.meta.url)));
  writeFileSync(outPath, report);

  const { baseline, guarded } = result;
  console.log(`\nLedger benchmark (${source})`);
  console.log(`  baseline: ${baseline.violationsReachingBooks}/${baseline.proposed} corrupt entries committed; books ${baseline.finalBalanced ? 'balanced' : 'UNBALANCED'}`);
  console.log(`  guarded : ${guarded.violationsReachingBooks}/${guarded.proposed} corrupt entries committed; ${guarded.rejectedByGuardrail} rejected; books ${guarded.finalBalanced ? 'balanced' : 'UNBALANCED'}; deterministic=${guarded.deterministic}`);
  console.log(`  report  : docs/BENCHMARK.md\n`);

  const fullyProtected =
    guarded.violationsReachingBooks === 0 && guarded.finalBalanced && guarded.deterministic === true;
  if (!fullyProtected) {
    console.error('FAIL: guarded run did not fully protect the books.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('eval failed:', err);
  process.exit(1);
});
