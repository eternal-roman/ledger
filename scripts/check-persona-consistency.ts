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

// Adapters are thin references; they point to canonical for full persona flavor.
const ADAPTERS = [
  '.cursor/rules/ledger.mdc',
  '.clinerules/ledger.md',
  '.windsurf/rules/ledger.md',
  '.kiro/steering/ledger.md',
  '.github/copilot-instructions.md',
];

// Additional mandatory persona surfaces (manifests, dev docs, agents) that must stay aligned.
// These get full phrase checks (or core for some) to close gaps missed in prior branding updates.
const ADDITIONAL_SURFACES = [
  'CLAUDE.md',
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'README.md',
  '.claude/agents/ledger-chad-reviewer.md',
  'hooks/README.md',
];

const COMMANDS = [
  'commands/ledger-verify.toml',
  'commands/ledger-audit.toml',
  'commands/ledger-cite.toml',
  'commands/ledger-reconcile.toml',
  'commands/ledger-sim.toml',
];

const CORE_REQUIRED = [
  'Money.from',
  'validateEntry',
  'Ledger.apply',
  'double-entry',
  'canon',
  'Zero-Skip',
  'unbalanced',
  'deterministic',
];

const BRAND_PHRASES = [
  'Ledger Chad',
  'Alpha',
  'Alpha Maxxing',
  'or Get Beta',
];

const REQUIRED_PHRASES = [...CORE_REQUIRED, ...BRAND_PHRASES];

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

  // 2. Adapters: pointers get CORE only (brand phrases live in canonicals). Prevents sync fragility.
  for (const a of ADAPTERS) {
    const c = load(a);
    if (!c) {
      issues.push(`Missing adapter: ${a}`);
      continue;
    }
    const isPointer = c.includes('AGENTS.md') || c.includes('skills/ledger/SKILL.md');
    const phrases = isPointer ? CORE_REQUIRED : REQUIRED_PHRASES;
    for (const phrase of phrases) {
      if (!c.includes(phrase)) {
        issues.push(`${a}: missing required phrase "${phrase}"`);
      }
    }
    if (!isPointer && (!c.includes('Money.from') || !c.includes('validateEntry'))) {
      issues.push(`${a}: short adapter must still reference core primitives or point to canonical`);
    }
    // float guard always
    if (c.includes('parseFloat') && !c.includes('never') && !c.includes('forbid')) {
      issues.push(`${a}: dangerous parseFloat reference without strong prohibition language`);
    }
  }

  // 2b. Additional surfaces (manifests, CLAUDE, README, agents) — require Chad brand + core primitives (not every single one, since short files).
  const MINIMAL_FOR_ADDL = ['Money.from', 'validateEntry', 'Ledger.apply', 'double-entry', 'canon', 'Zero-Skip', 'unbalanced', 'Ledger Chad', 'Alpha Maxxing', 'or Get Beta'];
  for (const f of ADDITIONAL_SURFACES) {
    const c = load(f);
    if (!c) {
      issues.push(`Missing persona surface: ${f}`);
      continue;
    }
    for (const phrase of MINIMAL_FOR_ADDL) {
      if (!c.includes(phrase)) {
        issues.push(`${f}: missing required phrase "${phrase}"`);
      }
    }
    // still ban bad floats
    if (c.includes('parseFloat') && !c.includes('never') && !c.includes('forbid')) {
      issues.push(`${f}: dangerous parseFloat reference without strong prohibition language`);
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

  // 5. Graphic/branding asset consistency + no stale mixed refs (hardens against partial updates).
  const CURRENT_ASSET = 'ledger-chad';
  const STALE_ASSET = 'bean-counter';
  const STALE_OK_CONTEXTS = ['old', 'history', 'archive', 'changelog', 'refined', 'legacy'];
  function hasStaleAsset(content: string): boolean {
    const lower = content.toLowerCase();
    if (!lower.includes(STALE_ASSET)) return false;
    return !STALE_OK_CONTEXTS.some(ctx => lower.includes(ctx));
  }
  const allPersonaFiles = [...CANONICAL_SOURCES, ...ADAPTERS, ...ADDITIONAL_SURFACES];
  for (const f of allPersonaFiles) {
    const c = load(f);
    if (c && hasStaleAsset(c)) {
      issues.push(`${f}: stale asset reference (${STALE_ASSET}); must use current ${CURRENT_ASSET}* for active branding`);
    }
    if (c && f === 'README.md' && !c.includes(CURRENT_ASSET) && c.includes('assets/')) {
      issues.push(`${f}: README graphic reference should use current ${CURRENT_ASSET}`);
    }
  }

  // 6. Package + manifests quick consistency (Chad in desc).
  const pkg = load('package.json');
  if (pkg) {
    if (!pkg.includes('Ledger Chad') && !pkg.includes('Alpha Maxxing')) {
      issues.push('package.json: description should reflect current Ledger Chad persona');
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
