import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Exercises the Stop hook exactly as Claude Code invokes it: JSON on stdin,
// a real transcript file on disk, assertions on exit code + stdout decision.
// See hooks/verify-proof-binding.cjs for the contract and its documented
// limitations (heuristic backstop, not a second kernel).

const HOOK_PATH = fileURLToPath(new URL('../../hooks/verify-proof-binding.cjs', import.meta.url));

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
          ],
        },
      ],
    },
    auditHash,
    entryCount: 1,
  };
}

function assistantText(text: string) {
  return { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } };
}

function toolResultLine(text: string) {
  return { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text }] }] } };
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

  // Regression: an earlier version of MONEY_IN_TEXT_RE matched ANY 3-5 letter
  // uppercase code adjacent to a number, which is exactly the shape of every
  // standard citation in this domain (IFRS 16, IAS 16.48, ASC 842, GAAP 2023,
  // ASU 2016-02, ISO 4217). That misfired on the one behavior the kernel rules
  // exist to encourage: citing canon. No tool calls needed for any of these.
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

  it('still catches a fabricated crypto amount with fewer than 2 decimal digits (e.g. "0.5 BTC")', () => {
    const transcriptPath = writeTranscript('crypto-amount.jsonl', [
      assistantText('Transferred 0.5 BTC to the wallet.'),
    ]);
    const { decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: false });
    expect(decision?.decision).toBe('block');
    expect(decision.reason).toContain('0.5');
  });

  // Regression: an earlier version trusted ANY JSON string anywhere in the
  // transcript that had a top-level boolean `ok`, regardless of where it
  // appeared. An assistant that merely typed out text shaped like a tool
  // result (never actually calling the tool — a real LLM failure mode, and
  // exactly the case this hook exists to catch) could launder a fabricated
  // figure into the "proven" pool. Only real tool_result blocks are trusted
  // now; a plain assistant text block containing the same JSON string must
  // NOT count as proof.
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

  it('is fail-open on a missing transcript file (infra failure, not a policy violation)', () => {
    const { status, decision } = runHook({ transcript_path: path.join(dir, 'does-not-exist.jsonl') });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('is fail-open and non-looping when stop_hook_active is already true', () => {
    const transcriptPath = writeTranscript('active.jsonl', [
      assistantText('Posted 999999.00 USD.'),
    ]);
    const { status, decision } = runHook({ transcript_path: transcriptPath, stop_hook_active: true });
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('is fail-open on malformed stdin', () => {
    const res = spawnSync(process.execPath, [HOOK_PATH], { input: 'not json', encoding: 'utf8' });
    expect(res.status).toBe(0);
  });
});
