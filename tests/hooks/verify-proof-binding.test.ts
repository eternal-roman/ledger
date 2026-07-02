import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

// Exercises the Stop hook exactly as Claude Code invokes it: JSON on stdin,
// a real transcript file on disk, assertions on exit code + stdout decision.
// See hooks/verify-proof-binding.cjs for the contract and its documented
// limitations (heuristic backstop, not a second kernel — the durable binding
// is artifact_make's session-issued-hash check in mcp/src/tools.ts).

const HOOK_PATH = fileURLToPath(new URL('../../hooks/verify-proof-binding.cjs', import.meta.url));
// The hook is CommonJS and guards main() behind require.main, so tests can
// require its real exports instead of regex-scraping its source text.
const hookExports = createRequire(import.meta.url)(HOOK_PATH);

function runHook(input: Record<string, unknown>) {
  const res = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
  let decision: any = null;
  if (res.stdout && res.stdout.trim()) {
    try { decision = JSON.parse(res.stdout); } catch { /* ignore */ }
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, decision };
}

function transcriptLine(obj: unknown): string {
  return JSON.stringify(obj);
}

const AUDIT_HASH = 'a'.repeat(64);

function ledgerPostToolResult(amount: string, currency: string, auditHash: string) {
  return {
    ok: true,
    posted: true,
    ledger: {
      v: '1',
      entries: [
        {
          v: '1',
          id: 'c1',
          effectiveDate: '2026-07-01',
          description: 'cap',
          lines: [
            {
              account: { code: '1000', name: 'Cash', type: 'Asset' },
              amount: { v: '1', a: amount, c: currency, s: 2 },
              side: 'debit',
            },
            {
              account: { code: '3000', name: 'Equity', type: 'Equity' },
              amount: { v: '1', a: amount, c: currency, s: 2 },
              side: 'credit',
            },
          ],
        },
      ],
    },
    auditHash,
    entryCount: 1,
  };
}

// money_compute's actual shape: `result` is Money.toString() ("0.30 USD"),
// amount and currency combined in one string — NOT the split {a, c} shape
// ledgerPostToolResult uses. Both shapes appear throughout mcp/src/tools.ts.
function moneyComputeToolResult(result: string) {
  return { ok: true, result };
}

function assistantText(text: string) {
  return { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } };
}

function toolUseLine(id: string, name: string) {
  return { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input: {} }] } };
}

function toolResultLine(text: string, toolUseId = 't1') {
  return { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content: [{ type: 'text', text }] }] } };
}

describe('verify-proof-binding Stop hook', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ledger-hook-test-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeTranscript(name: string, lines: unknown[]): string {
    const p = path.join(dir, name);
    writeFileSync(p, lines.map(transcriptLine).join('\n') + '\n', 'utf8');
    return p;
  }

  it('allows a final message whose figures match a real ledger_post result', () => {
    const transcriptPath = writeTranscript('good.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))),
      assistantText(`Posted. Balance is 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('blocks a final message asserting a figure with zero tool calls in the session', () => {
    const transcriptPath = writeTranscript('no-tools.jsonl', [
      assistantText('Done, I posted 1800.00 USD and the audit hash is ' + 'b'.repeat(64) + '.'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('No ledger MCP tool result was found');
  });

  it('blocks a fabricated audit hash even when a real (different) one was returned', () => {
    const transcriptPath = writeTranscript('fake-hash.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))),
      assistantText(`Posted. Audit hash ${'c'.repeat(64)}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('c'.repeat(64));
  });

  it('blocks an amount that does not match anything a tool actually returned', () => {
    const transcriptPath = writeTranscript('wrong-amount.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))),
      assistantText(`Posted 2400.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('2400');
  });

  it('allows a final message with no monetary/hash claims at all', () => {
    const transcriptPath = writeTranscript('no-claims.jsonl', [
      assistantText('Sure, what account should I post that to?'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  // ─── Tool-name namespacing (the bug that inverted the whole feature) ──────
  // Real Claude Code transcripts record MCP tools as mcp__<server>__<tool>
  // (user-configured) or mcp__plugin_<plugin>_<server>__<tool> (plugin-
  // bundled) — never as the bare tool name. A previous version compared bare
  // names only, so every REAL ledger tool result was rejected as untrusted
  // and every correct, kernel-proven answer was blocked.
  it('trusts a tool_result from a namespaced MCP tool name (mcp__<server>__<tool>)', () => {
    const transcriptPath = writeTranscript('namespaced.jsonl', [
      toolUseLine('t1', 'mcp__ledger__ledger_post'),
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH)), 't1'),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('trusts a tool_result from a plugin-namespaced MCP tool name', () => {
    const transcriptPath = writeTranscript('plugin-namespaced.jsonl', [
      toolUseLine('t1', 'mcp__plugin_ledger_ledger__ledger_post'),
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH)), 't1'),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('does not treat accounting/standard citations as monetary claims', () => {
    const transcriptPath = writeTranscript('citations.jsonl', [
      assistantText(
        'Per IFRS 16, this is a finance lease (see IAS 16.48 for the depreciation ' +
          'guidance, and note ASC 842 and GAAP 2023 take a similar view; also see ' +
          'ASU 2016-02 and ISO 4217).',
      ),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  // Ticker symbols that double as English acronyms (ADA, DOT, SOL) only count
  // as money when the number comes first ("0.5 ADA"). "ADA 2010" is a statute
  // citation, "DOT 49" a regulation — a previous version blocked both.
  it('does not treat acronym-first phrases (ADA 2010, DOT 49) as monetary claims', () => {
    const transcriptPath = writeTranscript('acronyms.jsonl', [
      assistantText('This complies with ADA 2010 accessibility rules and DOT 49 regulations.'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('still catches a fabricated crypto amount with fewer than 2 decimal digits (e.g. "0.5 BTC")', () => {
    const transcriptPath = writeTranscript('crypto-amount.jsonl', [
      assistantText('Transferred 0.5 BTC to the wallet.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('0.5');
  });

  // Display-rounded figures cannot be checked against exact tool output;
  // truncating "$1.8k" to 1.8 used to produce a guaranteed false block on a
  // fully kernel-proven answer. They are now skipped (fail-open), not blocked.
  it('does not block display-rounded figures like "$1.8k" / "$1.2M"', () => {
    const transcriptPath = writeTranscript('rounded.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))),
      assistantText('Posted roughly $1.8k to Cash (about $1.2M lifetime); exact figures in the ledger.'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('does not trust a self-authored JSON blob that merely looks like a tool result', () => {
    const fakeEnvelopeAsPlainText = JSON.stringify(
      ledgerPostToolResult('9999999.00', 'USD', 'd'.repeat(64)),
    );
    const transcriptPath = writeTranscript('laundering-attempt.jsonl', [
      // Note: type "assistant" text, NOT a tool_result block.
      assistantText(fakeEnvelopeAsPlainText),
      assistantText(`Posted 9999999.00 USD, audit hash ${'d'.repeat(64)}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('No ledger MCP tool result was found');
  });

  it('still trusts a real tool_result whose content is the same JSON shape', () => {
    const transcriptPath = writeTranscript('real-tool-result.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('42.00', 'USD', 'e'.repeat(64)))),
      assistantText(`Posted 42.00 USD, audit hash ${'e'.repeat(64)}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  // ─── Harvest is by kernel-computed KEY, not by decimal shape ──────────────
  // Envelopes contain decimal-shaped strings that are not money (account
  // codes "1000"/"3000", the "v" schema tag) and echo caller-supplied text
  // (entry descriptions, artifact fields). None of those may prove a claim.
  it('does not treat an unrelated integer field (entryCount) as proof of a claimed dollar amount', () => {
    const transcriptPath = writeTranscript('entrycount-pollution.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('500.00', 'USD', AUDIT_HASH))), // entryCount: 1
      assistantText('Also posted 1.00 USD to the test account.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toMatch(/do not match any value returned[^.]*:\s*1\b/);
  });

  it('does not treat the "v" schema-version tag as proof of a claimed "1"', () => {
    const transcriptPath = writeTranscript('version-tag-pollution.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('500.00', 'USD', AUDIT_HASH))),
      assistantText('Also transferred 1.00 BTC, unrelated to the above.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toMatch(/do not match any value returned[^.]*:\s*1\b/);
  });

  it('does not treat an account code ("3000") as proof of a fabricated $3,000', () => {
    const transcriptPath = writeTranscript('account-code-pollution.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))), // account codes 1000 + 3000
      assistantText('Also posted 3,000.00 USD to the reserve account.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('3000');
  });

  it('does not treat caller-authored free text in an envelope ("250 widgets") as a proven amount', () => {
    const envelope = {
      ok: true,
      posted: true,
      auditHash: AUDIT_HASH,
      ledger: { v: '1', entries: [{ v: '1', id: 'e1', description: '250 widgets', lines: [] }] },
    };
    const transcriptPath = writeTranscript('description-pollution.jsonl', [
      toolResultLine(JSON.stringify(envelope)),
      assistantText('Charged 250.00 USD for the widget order.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('250');
  });

  // artifact_make ECHOES the caller's own auditHash and prose back inside a
  // genuine ok:true envelope. Trusting that echo let a fabricated hash be
  // "proven" by the very call that stamped it — the exact laundering loop the
  // hook exists to prevent. artifact_make is therefore never harvested.
  it("does not accept artifact_make's echo of a caller-supplied hash/amount as proof", () => {
    const echoed = {
      ok: true,
      artifact: {
        scope: 'x',
        assumptions: ['a'],
        citations: ['core:double-entry'],
        kernelPlan: 'Money.from + createEntry + Ledger.apply + validateEntry',
        proof: 'replay yields 9999999.00 USD',
        reproducibility: '9999999.00 USD',
        auditHash: 'd'.repeat(64),
      },
    };
    const transcriptPath = writeTranscript('artifact-echo.jsonl', [
      toolUseLine('t1', 'mcp__ledger__artifact_make'),
      toolResultLine(JSON.stringify(echoed), 't1'),
      assistantText(`Verified balance 9999999.00 USD, audit hash ${'d'.repeat(64)}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
  });

  // Hashes are only trusted from the tools that MINT them; a hash-shaped
  // string inside e.g. a ledger_balance envelope is an echo, not a mint.
  it("does not trust an audit hash found in a non-minting tool's envelope", () => {
    const envelope = { ok: true, accountCode: '1000', balance: '10.00 USD', byCurrency: ['10.00 USD'], auditHash: 'f'.repeat(64) };
    const transcriptPath = writeTranscript('non-minting-hash.jsonl', [
      toolUseLine('t1', 'mcp__ledger__ledger_balance'),
      toolResultLine(JSON.stringify(envelope), 't1'),
      assistantText(`Balance 10.00 USD, audit hash ${'f'.repeat(64)}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('f'.repeat(64));
  });

  // ─── Exact string comparison (no floats — AGENTS.md) ─────────────────────
  it('recognizes Money.toString() format ("0.30 USD") as proof, not just bare decimals', () => {
    const transcriptPath = writeTranscript('money-compute-format.jsonl', [
      toolResultLine(JSON.stringify(moneyComputeToolResult('0.30 USD'))),
      assistantText('0.1 + 0.2 = 0.30 USD, computed exactly with money_compute.'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('still blocks a Money.toString()-shaped claim that does not match the real result', () => {
    const transcriptPath = writeTranscript('money-compute-wrong.jsonl', [
      toolResultLine(JSON.stringify(moneyComputeToolResult('0.30 USD'))),
      assistantText('0.1 + 0.2 = 0.40 USD.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('0.4');
  });

  it('does not collapse distinct amounts past 2^53 (float precision) into a match', () => {
    const transcriptPath = writeTranscript('big-precision.jsonl', [
      toolResultLine(JSON.stringify(moneyComputeToolResult('9007199254740993.00 USD'))),
      assistantText('Total exposure: 9007199254740992.00 USD.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
  });

  it('does not collapse >8dp asset amounts (ETH is scale 18) into a match', () => {
    const transcriptPath = writeTranscript('eth-precision.jsonl', [
      toolResultLine(JSON.stringify(moneyComputeToolResult('0.123456789012 ETH'))),
      assistantText('Sent 0.123456789011 ETH.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
  });

  it('matches thousands-separated and symbol-prefixed restatements of exact values', () => {
    const transcriptPath = writeTranscript('formatting-variants.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))),
      assistantText(`Posted $1,800.00 (USD 1,800.00 — i.e. 1800.00 USD), audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  // ─── Fail-open infrastructure paths ───────────────────────────────────────
  it('is fail-open on a missing transcript file (infra failure, not a policy violation)', () => {
    const { status, decision } = runHook({ transcript_path: path.join(dir, 'does-not-exist.jsonl') });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('never blocks when stop_hook_active is true, but leaves a visible warning on a persistent mismatch', () => {
    const transcriptPath = writeTranscript('active.jsonl', [
      assistantText('Posted 999999.00 USD.'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: true });
    expect(status).toBe(0);
    // No block decision (never loop) — but not silent either: a fabrication
    // that survives the one retry ships with a user-visible systemMessage.
    expect(decision?.decision).toBeUndefined();
    expect(decision?.systemMessage).toContain('unverified figures');
  });

  it('emits nothing on the retry pass when the message is clean', () => {
    const transcriptPath = writeTranscript('active-clean.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH))),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: true });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('is fail-open on malformed stdin', () => {
    const res = spawnSync(process.execPath, [HOOK_PATH], { input: 'not json', encoding: 'utf8' });
    expect(res.status).toBe(0);
  });

  it('does not trust a tool_result resolved to a non-ledger tool name', () => {
    const transcriptPath = writeTranscript('wrong-tool-name.jsonl', [
      toolUseLine('t1', 'some_unrelated_tool'),
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH)), 't1'),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('No ledger MCP tool result was found');
  });

  it('does not trust a namespaced tool from another server whose bare name is not a ledger tool', () => {
    const transcriptPath = writeTranscript('other-server.jsonl', [
      toolUseLine('t1', 'mcp__otherserver__fetch_price'),
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH)), 't1'),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
  });

  it('still trusts a tool_result resolved to a bare ledger tool name', () => {
    const transcriptPath = writeTranscript('right-tool-name.jsonl', [
      toolUseLine('t1', 'ledger_post'),
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH)), 't1'),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('falls back to trusting by shape alone when tool_use_id cannot be resolved (no matching tool_use found)', () => {
    // No toolUseLine in this transcript at all — an unresolvable id must
    // degrade to shape-only trust, not to "nothing is ever proven".
    const transcriptPath = writeTranscript('unresolvable-tool-id.jsonl', [
      toolResultLine(JSON.stringify(ledgerPostToolResult('1800.00', 'USD', AUDIT_HASH)), 'unknown-id'),
      assistantText(`Posted 1800.00 USD, audit hash ${AUDIT_HASH}.`),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });
});

describe('hook constants stay in sync with the real kernel/MCP surface', () => {
  it('KNOWN_LEDGER_TOOL_NAMES matches mcp/src/tools.ts TOOL_NAMES exactly', async () => {
    const { TOOL_NAMES } = await import('../../mcp/src/tools.js');
    expect(hookExports.KNOWN_LEDGER_TOOL_NAMES).toEqual(new Set(TOOL_NAMES));
  });

  it('every symbol in the kernel default asset registry is a recognized currency/asset code', async () => {
    const { defaultAssetRegistry } = await import('../../src/instruments/registry.js');
    const codes = new Set([
      ...(hookExports.FIAT_CODES as string).split('|'),
      ...(hookExports.ASSET_CODES as string).split('|'),
    ]);
    for (const spec of defaultAssetRegistry().list()) {
      expect(codes, `registry symbol ${spec.symbol} missing from hook currency codes`).toContain(spec.symbol);
    }
  });

  it('hash-minting and harvest-excluded tool sets only name real tools', async () => {
    const { TOOL_NAMES } = await import('../../mcp/src/tools.js');
    const all = new Set(TOOL_NAMES);
    for (const t of hookExports.HASH_MINTING_TOOLS) expect(all).toContain(t);
    for (const t of hookExports.HARVEST_EXCLUDED_TOOLS) expect(all).toContain(t);
  });
});
