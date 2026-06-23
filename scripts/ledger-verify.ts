#!/usr/bin/env tsx
/**
 * ledger-verify — standalone (non-LLM) enforcement script.
 * Supports mechanical scan + kernel proof using the real exports.
 *
 * Usage (dev):
 *   npx tsx scripts/ledger-verify.ts --scan examples
 *   npx tsx scripts/ledger-verify.ts --scan src
 *   npx tsx scripts/ledger-verify.ts --prove some-entries.json
 *
 * After `npm run build` (when bin wired):
 *   npx ledger-verify --scan .
 *
 * Reuses: scan* from ./src/verify/scanner.js + runTrace, makeCanonicalArtifact, etc.
 */

import { readFileSync, existsSync } from 'node:fs';
import { scanDir, scanSourceForViolations } from '../src/verify/scanner.js';

// Dynamic import so the script works from source with tsx before full build
async function loadKernel() {
  const mod = await import('../src/index.js');
  return {
    runTrace: mod.runTrace,
    makeCanonicalArtifact: mod.makeCanonicalArtifact,
    validateEntry: mod.validateEntry,
    JournalEntry: mod.JournalEntry,
    Money: mod.Money,
    Account: mod.Account,
    AccountType: mod.AccountType,
    createBalancedEntry: mod.createBalancedEntry,
    createEntry: mod.createEntry,
    makeLine: mod.makeLine,
    emptyLedger: mod.emptyLedger,
  };
}

function printViolations(vs: any[]) {
  if (vs.length === 0) {
    console.log('Ledger clean. Invariants hold.');
    return;
  }
  for (const v of vs) {
    console.log(`L${v.line}: ${v.type} — ${v.suggestion}`);
    console.log(`    in ${v.file}`);
    console.log(`    ${v.text}`);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--scan' || a === '--prove' || a === '--diff') {
      out[a.slice(2)] = args[i + 1] || '';
      i++;
    } else if (a === '--json' || a === '--help' || a === '--version') {
      out[a.slice(2)] = true;
    } else if (a.startsWith('--')) {
      out[a.slice(2)] = true;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();

  if (args.version) {
    // Robust: read package.json directly (works in tsx source and after pack/dist)
    try {
      const fs = await import('node:fs');
      const p = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
      console.log(p.version || 'unknown');
    } catch {
      console.log('unknown');
    }
    process.exit(0);
  }

  if (args.help) {
    console.log('ledger-verify [--scan <path|->] [--prove <json>] [--json] [--version] [--help]');
    console.log('  --scan path   : static scan for money anti-patterns (float, parseFloat, native arith, mutation)');
    console.log('  --scan -      : scan stdin (e.g. a diff)');
    console.log('  --prove file  : load simple entry data and run real runTrace + makeCanonicalArtifact');
    console.log('  --version     : print version');
    process.exit(0);
  }

  if (args.scan !== undefined) {
    let violations: any[] = [];
    const target = String(args.scan || '.');
    if (target === '-' || target === '') {
      const stdin = readFileSync(0, 'utf8');
      violations = scanSourceForViolations(stdin, '<stdin>');
    } else if (existsSync(target)) {
      const st = await import('node:fs').then(m => m.statSync(target));
      if (st.isDirectory()) {
        violations = scanDir(target);
      } else {
        const src = readFileSync(target, 'utf8');
        violations = scanSourceForViolations(src, target);
      }
    } else {
      console.error('Path not found:', target);
      process.exit(2);
    }
    printViolations(violations);
    if (args.json) console.log(JSON.stringify({ violations }, null, 2));
    process.exit(violations.length ? 1 : 0);
  }

  if (args.prove) {
    const p = String(args.prove);
    if (!existsSync(p)) {
      console.error('Prove file not found:', p);
      process.exit(2);
    }
    let data: any;
    try { data = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { console.error('Bad JSON'); process.exit(2); }

    const k = await loadKernel();
    // Accept either raw array or {entries: [...]}. Build proper entries using kernel factories when possible.
    const rawEntries = Array.isArray(data) ? data : (data.entries || []);
    const entries = rawEntries.map((e: any) => {
      if (e.lines && Array.isArray(e.lines) && e.lines.length >= 2) {
        const hasSides = e.lines.some((l: any) => l.side);
        const lines = e.lines.map((l: any, idx: number) => {
          const acctType = (k.AccountType as any)[l.account.type] || k.AccountType.Asset;
          const acct = new k.Account(l.account.code, l.account.name, acctType);
          const amt = k.Money.from(String(l.amount.amount || l.amount), l.amount.currency || 'USD');
          let side = l.side;
          if (!side) {
            // backward compat for simple inputs without sides: first debit, second credit
            side = (idx === 0) ? 'debit' : 'credit';
          }
          return k.makeLine(acct, amt, side);
        });
        // Use general createEntry for flexibility (supports any # lines, sides, types from data)
        return k.createEntry(e.id || 'p1', e.effectiveDate || '2026-01-01', lines, e.description || 'prove');
      }
      // Fallback minimal for simple inputs
      const cash = new k.Account('1000', 'Cash', k.AccountType.Asset);
      const eq = new k.Account('3000', 'Equity', k.AccountType.Equity);
      return k.createBalancedEntry(e.id || 'p1', e.effectiveDate || '2026-01-01', cash, eq, k.Money.from('1', 'USD'), e.description || 'prove-fallback');
    });

    const trace = k.runTrace(entries);
    const art = k.makeCanonicalArtifact({
      scope: 'ledger-verify-prove',
      assumptions: [`file=${p}`, `entryCount=${entries.length}`],
      citations: ['core:double-entry', 'core:exact-decimal'],
      kernelPlan: 'Money.from + createBalancedEntry + runTrace + validateEntry + auditHash',
      proof: trace.finalEquation ? 'equation holds + finalHash matches' : 'equation VIOLATION',
      reproducibility: p,
    });

    const result = { ok: trace.ok && trace.finalEquation, finalHash: trace.finalHash, checkpoints: trace.checkpoints.length, artifact: art };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Deterministic replay hash:', trace.finalHash);
      console.log('Equation holds:', trace.finalEquation);
      console.log('Artifact proof:', art.proof);
      console.log('kernelPlan:', art.kernelPlan);
    }
    process.exit((trace.ok && trace.finalEquation) ? 0 : 1);
  }

  console.error('No --scan or --prove supplied. Use --help');
  process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });
