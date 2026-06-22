#!/usr/bin/env tsx
/**
 * check-persona-consistency
 *
 * Enforces that all persona surfaces (AGENTS.md, skills, adapters, command prompts)
 * stay in sync with the canonical rules in skills/ledger/SKILL.md.
 *
 * This is the first hardening step toward commercial-grade enforcement.
 * Run via: npm run check:persona
 * Fails on drift.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

const CANONICAL_SOURCES = [
  'skills/ledger/SKILL.md',
  'AGENTS.md',
];

const ADAPTERS = [
  '.cursor/rules/ledger.mdc',
  '.clinerules/ledger.md',
  '.windsurf/rules/ledger.md',
  '.kiro/steering/ledger.md',
  '.github/copilot-instructions.md',
];

const COMMANDS = [
  'commands/ledger-verify.toml',
  'commands/ledger-audit.toml',
  'commands/ledger-cite.toml',
  'commands/ledger-reconcile.toml',
  'commands/ledger-sim.toml',
];

const REQUIRED_PHRASES = [
  'Money.from',
  'validateEntry',
  'Ledger.apply',
  'double-entry',
  'canon',
  'Zero-Skip',
  'Ledger Chad',
  'Alpha',
  'unbalanced',
  'deterministic',
  'Alpha Maxxing',
  'or Get Beta',
];

function load(file: string): string {
  try {
    return readFileSync(join(ROOT, file), 'utf8');
  } catch {
    return '';
  }
}

function checkFile(path: string, content: string, issues: string[]) {
  for (const phrase of REQUIRED_PHRASES) {
    if (!content.includes(phrase)) {
      issues.push(`${path}: missing required phrase "${phrase}"`);
    }
  }
  // Enforce no bare floats/numbers temptation language drift
  if (content.includes('parseFloat') && !content.includes('never') && !content.includes('forbid')) {
    issues.push(`${path}: dangerous parseFloat reference without strong prohibition language`);
  }
}

function main() {
  const issues: string[] = [];

  // 1. Verify main canonical files contain core language
  for (const f of CANONICAL_SOURCES) {
    const c = load(f);
    if (!c) {
      issues.push(`Missing canonical source: ${f}`);
      continue;
    }
    checkFile(f, c, issues);
    if (!c.includes('The Zero-Skip Execution Protocol') && !c.includes('Zero-Skip')) {
      issues.push(`${f}: does not prominently declare Zero-Skip Protocol`);
    }
  }

  // 2. Adapters must reference canonical or repeat the essentials
  for (const a of ADAPTERS) {
    const c = load(a);
    if (!c) {
      issues.push(`Missing adapter: ${a}`);
      continue;
    }
    checkFile(a, c, issues);
    if (!c.includes('AGENTS.md') && !c.includes('skills/ledger/SKILL.md')) {
      // Allow short adapters but they must still contain the kernel rule
      if (!c.includes('Money.from') || !c.includes('validateEntry')) {
        issues.push(`${a}: short adapter must still reference core primitives or point to canonical`);
      }
    }
  }

  // 3. Command prompts must be strict
  for (const cmd of COMMANDS) {
    const c = load(cmd);
    if (!c) continue;
    if (!c.includes('Money.from') && !c.includes('JournalEntry')) {
      issues.push(`${cmd}: command prompt should reference kernel primitives`);
    }
    if (cmd.includes('verify') && !c.includes('Artifact') && !c.includes('unverified')) {
      issues.push(`${cmd}: verify command should enforce Canonical Financial Artifact presence`);
    }
  }

  // 4. The main skill is the source of truth — assert key sections exist
  const mainSkill = load('skills/ledger/SKILL.md');
  if (mainSkill) {
    const mustSections = ['Persistence', 'Zero-Skip Execution Protocol', 'Non-negotiable Rules', 'Output Contract', 'Boundaries'];
    for (const sec of mustSections) {
      if (!mainSkill.includes(sec)) {
        issues.push(`skills/ledger/SKILL.md: missing required section "${sec}"`);
      }
    }
  }

  if (issues.length > 0) {
    console.error('PERSONA CONSISTENCY FAILURES:');
    issues.forEach(i => console.error('  - ' + i));
    console.error('\nFix drift. Ledger Chad does not tolerate inconsistency. Alpha Maxxing only.');
    process.exit(1);
  }

  console.log('Persona consistency OK. All surfaces aligned with canonical rules.');
  process.exit(0);
}

main();
