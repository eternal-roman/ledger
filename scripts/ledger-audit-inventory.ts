/**
 * Basic monetary expression inventory scanner for TS/JS repositories.
 * Helper for discovering monetary expressions during kernel-grounded audits (see skills/ledger-audit).
 *
 * Run: npx tsx scripts/ledger-audit-inventory.ts --path /path/to/target --out inventory.json
 *
 * It is deliberately simple and aggressive — finds float casts, bare arithmetic near money words,
 * accumulators, 0.99 hacks, etc. Protocol requires manual + AST follow-up.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

interface InventoryItem {
  file: string;
  line: number;
  expr: string;
  classification: string;
  risk: 'HIGH' | 'MED' | 'LOW' | 'INFO';
  snippet: string;
}

const MONEY_WORDS = /(price|qty|quantity|amount|pnl|fee|capital|value|cost|usd|equity|atr|risk|gross|net|proceeds|basis|filled|realized|unrealized|drawdown|sharpe|return)/i;

function walk(dir: string, exts = ['.ts', '.tsx', '.js', '.mjs']): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e.startsWith('.') || e === 'node_modules' || e === 'dist' || e === 'ledger' || e.includes('test')) continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

function classify(line: string): { cls: string; risk: InventoryItem['risk'] } {
  if (/float\(|parseFloat|Number\(/.test(line)) return { cls: 'BOUNDARY|TRANSPORT', risk: 'HIGH' };
  if (/\b(total|equity|pnl|daily|peak|curve)\s*\+?=/.test(line)) return { cls: 'ACCUM', risk: 'HIGH' };
  if (/0\.(99|999|9|1e-|1e1)/.test(line)) return { cls: 'DECISION|GUARD', risk: 'HIGH' };
  if (MONEY_WORDS.test(line) && /[\*\/\-\+]/.test(line)) return { cls: 'CALC', risk: 'MED' };
  if (/\.value\s*[\*\/]/.test(line)) return { cls: 'SIGNAL|CALC', risk: 'HIGH' };
  if (/REAL|float|number/i.test(line) && /CREATE|INSERT|SELECT|schema|column/i.test(line)) return { cls: 'STORAGE', risk: 'MED' };
  return { cls: 'OTHER', risk: 'LOW' };
}

function scanFile(file: string): InventoryItem[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const items: InventoryItem[] = [];
  lines.forEach((line, idx) => {
    const lno = idx + 1;
    if (MONEY_WORDS.test(line) || /float\(|parseFloat|\.0\b|0\.0|0\.99/.test(line)) {
      const { cls, risk } = classify(line);
      items.push({
        file: file.replace(/\\/g, '/'),
        line: lno,
        expr: line.trim().slice(0, 120),
        classification: cls,
        risk,
        snippet: lines.slice(Math.max(0, idx - 1), idx + 2).map((s, i) => `${lno - 1 + i}: ${s}`).join('\n'),
      });
    }
  });
  return items;
}

function main() {
  const args = process.argv.slice(2);
  let target = '.';
  let out = 'monetary_inventory.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path') target = args[++i];
    if (args[i] === '--out') out = args[++i];
  }
  const files = walk(target);
  let all: InventoryItem[] = [];
  for (const f of files) {
    all = all.concat(scanFile(f));
  }
  // de-dup rough
  const seen = new Set<string>();
  all = all.filter(i => {
    const k = `${i.file}:${i.line}:${i.expr.slice(0, 30)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  writeFileSync(out, JSON.stringify({ count: all.length, items: all }, null, 2));
  console.log(`Scanned ${files.length} files. ${all.length} candidate monetary expressions -> ${out}`);
  // also human summary
  const byRisk = all.reduce((m, i) => { (m[i.risk] ||= 0); m[i.risk]++; return m; }, {} as any);
  console.log('By risk:', byRisk);
}

main();
