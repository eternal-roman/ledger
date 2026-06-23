import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

export type ViolationType =
  | 'FLOAT_LITERAL'
  | 'NON_INTEGER_NUMBER'
  | 'PARSE_FLOAT'
  | 'DIRECT_ARITHMETIC'
  | 'MONEY_LITERAL_WITHOUT_MONEY_FROM'
  | 'MUTATION_HINT';

export interface MoneyViolation {
  file: string;
  line: number;
  text: string;
  type: ViolationType;
  suggestion: string;
}

const MONEY_WORDS = /\b(amount|price|qty|quantity|fee|pnl|value|cost|capital|balance|proceeds|basis|exposure|risk|size|gross|net|filled|realized|unrealized|margin|position|deposit|withdrawal|equity|asset|liability)\b/i;
const FLOAT_LIT = /\b\d+\.\d{2,}\b/;
const NON_INT_NUM = /\b\d+\.\d+\b/;
const PARSE = /\bparse(?:Float|Int)\s*\(/i;
const DIRECT_ARITH = /\b(?:price|qty|amount|fee|pnl|value|cost|risk|balance|gross|net)\b\s*[\+\-\*\/]\s*[\w$0-9.]+|[\w$0-9.]+\s*[\+\-\*\/]\s*\b(?:price|qty|amount|fee|pnl|value|cost|risk|balance|gross|net)\b/i;
const MONEY_FROM_CALL = /Money\.from\s*\(/;
const MUTATION = /\.(entries\s*\.push|apply\s*\(\s*[^)]*\)\s*\.\s*ledger\s*=|balance\s*=)/;

/**
 * Scan a source string for monetary value anti-patterns.
 * Reuses patterns from tests/no-floats-guard.test.ts and
 * reference-implementations/python/ledger/audit_scanner.py.
 * Suggestions reference the exact error style from src/core/money.ts.
 */
export function scanSourceForViolations(source: string, filename: string): MoneyViolation[] {
  const violations: MoneyViolation[] = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    let code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    // Remove string literals for numeric checks (crude but effective)
    code = code.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '').replace(/`[^`]*`/g, '');
    const trimmed = code.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('* ')) return;
    // Skip obvious prose / log lines + regex definition lines inside the scanner itself
    if (/console\.(log|error)/.test(code) && !/Money\.from/.test(code)) return;
    if (/MONEY_WORDS|DIRECT_ARITH|MUTATION|RISK_WORDS| = \/.+\//.test(line)) return;
    if (/confidence\s*:\s*\d\./.test(line)) return; // seed data, not executable money
    if (filename.includes('/seeds/') || filename.includes('\\seeds\\') || /id:\s*"[^"]*\.\d|locator:.*\d\.\d|effective_from:/.test(line)) return;

    if (PARSE.test(code)) {
      violations.push({
        file: filename,
        line: ln,
        text: trimmed.slice(0, 120),
        type: 'PARSE_FLOAT',
        suggestion: 'use Money.from("123.45", "USD") — never parseFloat for monetary values (see src/core/money.ts)',
      });
    }

    const hasMoneyWord = MONEY_WORDS.test(line);
    if (hasMoneyWord || FLOAT_LIT.test(code)) {
      if (FLOAT_LIT.test(line) && !MONEY_FROM_CALL.test(line)) {
        violations.push({
          file: filename,
          line: ln,
          text: trimmed.slice(0, 120),
          type: 'FLOAT_LITERAL',
          suggestion: 'use Money.from("123.45", "USD") — pass string for any fractional amount (see Money.from in src/core/money.ts:86)',
        });
      }
      if (NON_INT_NUM.test(code) && !MONEY_FROM_CALL.test(code) && !/from|Money/.test(code)) {
        violations.push({
          file: filename,
          line: ln,
          text: trimmed.slice(0, 120),
          type: 'NON_INTEGER_NUMBER',
          suggestion: 'Money.from requires string for non-integer; e.g. Money.from("100.50", "USD")',
        });
      }
    }

    if (DIRECT_ARITH.test(code) && hasMoneyWord && !MONEY_FROM_CALL.test(code)) {
      violations.push({
        file: filename,
        line: ln,
        text: trimmed.slice(0, 120),
        type: 'DIRECT_ARITHMETIC',
        suggestion: 'use Money.from(...).add/.sub/.mul/.div — never native + - * / on monetary values',
      });
    }

    if (MUTATION.test(line)) {
      violations.push({
        file: filename,
        line: ln,
        text: trimmed.slice(0, 120),
        type: 'MUTATION_HINT',
        suggestion: 'use immutable Ledger.apply (returns new ledger); never mutate entries or balances',
      });
    }
  });

  return violations;
}

export function scanDir(
  root: string,
  exts: string[] = ['.ts', '.tsx', '.js'],
  exclude: string[] = ['node_modules', 'dist', '__pycache__', '.git', 'coverage', 'tests', '__tests__']
): MoneyViolation[] {
  const results: MoneyViolation[] = [];
  function walk(dir: string) {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (exclude.some(x => p.includes(x))) continue;
        walk(p);
      } else if (exts.includes(extname(p))) {
        if (exclude.some(x => p.includes(x))) continue;
        try {
          const src = readFileSync(p, 'utf8');
          results.push(...scanSourceForViolations(src, p));
        } catch {}
      }
    }
  }
  walk(root);
  // dedup
  const seen = new Set<string>();
  return results.filter(v => {
    const k = `${v.file}:${v.line}:${v.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
