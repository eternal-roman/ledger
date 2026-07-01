import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// SessionStart activation (hooks/ledger-activate*) is intentionally best-effort
// and fail-open across hosts (see hooks/README.md) — it must never block a
// session from starting. But "best-effort" has silently meant "nobody notices
// if it stops printing anything" with zero test coverage. These tests don't
// change that fail-open behavior; they just make a silently broken banner a
// CI failure instead of something only a human notices by accident.

const HOOKS_DIR = fileURLToPath(new URL('../../hooks/', import.meta.url));

const EXPECTED_SUBSTRINGS = [
  'Ledger kernel active',
  'Zero-Skip',
  'double-entry',
];

function assertBanner(stdout: string) {
  for (const s of EXPECTED_SUBSTRINGS) {
    expect(stdout).toContain(s);
  }
}

describe('plugin-shipped hooks stay wired to real files', () => {
  it('node hook (hooks/ledger-activate.js) prints the kernel rules banner', () => {
    const res = spawnSync(process.execPath, [path.join(HOOKS_DIR, 'ledger-activate.js')], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    assertBanner(res.stdout);
  });

  it('bash hook (hooks/ledger-activate) prints the kernel rules banner', () => {
    if (process.platform === 'win32') return; // bash variant is for POSIX/Git Bash hosts
    const res = spawnSync('bash', [path.join(HOOKS_DIR, 'ledger-activate')], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    assertBanner(res.stdout);
  });

  it('hooks.json (plugin-shipped) SessionStart points at a node script that exists', () => {
    const cfg = JSON.parse(readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf8'));
    const cmd: string = cfg.hooks.SessionStart[0].hooks[0].command;
    expect(cmd).toContain('ledger-activate.js');
    expect(existsSync(path.join(HOOKS_DIR, 'ledger-activate.js'))).toBe(true);
  });

  it('claude-codex-hooks.json points at the run-hook.cmd wrapper which exists', () => {
    const cfg = JSON.parse(readFileSync(path.join(HOOKS_DIR, 'claude-codex-hooks.json'), 'utf8'));
    const cmd: string = cfg.hooks.SessionStart[0].hooks[0].command;
    expect(cmd).toContain('run-hook.cmd');
    expect(existsSync(path.join(HOOKS_DIR, 'run-hook.cmd'))).toBe(true);
  });

  it('hooks.json (Grok-shared) has no Stop key — Claude-Code-only hooks must not live here', () => {
    // Grok also auto-discovers this exact file; adding a Stop key here would
    // risk breaking Grok's activation for every user if its parser doesn't
    // tolerate an unrecognized hook-event name. Claude-Code-only hooks belong
    // in claude-code-hooks.json instead (see the next tests).
    const cfg = JSON.parse(readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf8'));
    expect(cfg.hooks?.Stop).toBeUndefined();
  });

  it('plugin.json points its "hooks" field at claude-code-hooks.json', () => {
    const pluginPath = fileURLToPath(new URL('../../.claude-plugin/plugin.json', import.meta.url));
    const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
    expect(plugin.hooks).toBe('./hooks/claude-code-hooks.json');
  });

  it('claude-code-hooks.json (Claude-Code-only, explicitly referenced) carries SessionStart', () => {
    // This file replaces default hooks/hooks.json auto-discovery for Claude
    // Code once plugin.json's "hooks" field is set, so it must repeat
    // SessionStart itself rather than relying on hooks.json.
    const cfg = JSON.parse(readFileSync(path.join(HOOKS_DIR, 'claude-code-hooks.json'), 'utf8'));
    const cmd: string = cfg.hooks.SessionStart[0].hooks[0].command;
    expect(cmd).toContain('ledger-activate.js');
    expect(cmd).toContain('CLAUDE_PLUGIN_ROOT');
  });

  it('claude-code-hooks.json Stop hook points at verify-proof-binding.cjs, which exists', () => {
    // Not .claude/settings.json, which is project-local and gitignored — see
    // hooks/README.md — so it ships automatically with the plugin for every
    // installer via ${CLAUDE_PLUGIN_ROOT}.
    const cfg = JSON.parse(readFileSync(path.join(HOOKS_DIR, 'claude-code-hooks.json'), 'utf8'));
    const stopHooks = cfg.hooks?.Stop ?? [];
    expect(stopHooks.length).toBeGreaterThan(0);
    const command: string = stopHooks[0].hooks[0].command;
    expect(command).toContain('verify-proof-binding.cjs');
    expect(command).toContain('CLAUDE_PLUGIN_ROOT');
    expect(existsSync(path.join(HOOKS_DIR, 'verify-proof-binding.cjs'))).toBe(true);
  });
});
