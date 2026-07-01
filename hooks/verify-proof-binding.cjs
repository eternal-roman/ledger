#!/usr/bin/env node
// verify-proof-binding — Claude Code Stop hook.
//
// The ledger MCP tools (money_compute, ledger_post, ledger_audit_hash, ...) are
// fail-closed and kernel-verified, but nothing stops an agent from answering a
// monetary question in prose without calling them at all, or restating a
// number that doesn't match what a tool actually returned. This hook is a
// best-effort backstop for exactly that gap: before the turn is allowed to
// end, it checks whether every currency-amount / audit-hash the assistant's
// final message asserts is traceable to a real ledger MCP tool result
// produced earlier in the session.
//
// Design constraints (read before "fixing" this):
// - The transcript JSONL schema is undocumented and can change between Claude
//   Code releases (see https://code.claude.com/docs/en/hooks.md). Rather than
//   depending on exact field names, this script recognizes ledger tool output
//   by a signature WE control: every ledger MCP tool response is a JSON object
//   with a top-level boolean `ok` (see mcp/src/tools.ts `ok()`/`fail()`). Any
//   string in the transcript that parses to such an object is treated as a
//   real kernel result; its leaf values (decimal strings, SHA-256 hex hashes)
//   are the "proven" pool a claim must match.
// - This is a heuristic lint, not a second kernel: it does decimal-string
//   equality on values already produced by the real kernel, it does not
//   re-derive them. It cannot catch every paraphrase (spelled-out numbers,
//   rounding for display, split-across-sentences amounts) and isn't meant to.
// - Fail-open on infrastructure failure (missing/unreadable transcript,
//   malformed JSON, unexpected shape) — never brick a session because this
//   script couldn't run. Only a confidently detected mismatch blocks the turn.
// - Respects `stop_hook_active` to avoid loops (Claude Code also caps at 8
//   consecutive blocks, but we shouldn't rely on that).

const fs = require('node:fs');

const DECIMAL_RE = /^-?\d+(?:\.\d+)?$/;
const HASH_RE = /^[0-9a-f]{64}$/i;
const HASH_IN_TEXT_RE = /\b[0-9a-f]{64}\b/gi;
// A monetary claim: a currency symbol adjacent to a number, or a decimal
// number adjacent to a 3-4 letter currency/asset code. Deliberately does NOT
// match bare integers/decimals (dates, counts, ids) with no currency signal.
const MONEY_IN_TEXT_RE =
  /(?:[$€£¥]\s?-?\d[\d,]*(?:\.\d+)?)|(?:-?\d[\d,]*\.\d{2,}\s?(?:[A-Z]{3,5})\b)|(?:\b[A-Z]{3,5}\s?-?\d[\d,]*(?:\.\d+)?)/g;

function round(n) {
  // Collapse float noise from JSON number leaves (e.g. compare: -1/0/1); the
  // real amounts we care about arrive as exact decimal strings, not numbers.
  return Math.round(n * 1e8) / 1e8;
}

function normalizeAmount(raw) {
  const stripped = raw.replace(/[$€£¥,]/g, '').replace(/[A-Z]{3,5}/g, '').trim();
  const n = Number.parseFloat(stripped);
  return Number.isFinite(n) ? round(n) : null;
}

/** Recursively harvest decimal/hash leaves, but only once inside a recognized
 * ledger-tool-output envelope (`{ ok: boolean, ... }`), so raw tool *inputs*
 * and unrelated transcript metadata never pollute the proven pool. */
function harvest(node, pool, insideEnvelope, depth) {
  if (depth > 14) return; // guard against pathological/cyclic-looking nesting
  if (typeof node === 'string') {
    if (!insideEnvelope) {
      try {
        const parsed = JSON.parse(node);
        if (parsed && typeof parsed === 'object' && typeof parsed.ok === 'boolean') {
          pool.sawEnvelope = true;
          harvest(parsed, pool, true, depth + 1);
        }
      } catch {
        /* not a JSON envelope string; not inside one either, nothing to harvest */
      }
      return;
    }
    if (DECIMAL_RE.test(node)) pool.decimals.add(round(Number.parseFloat(node)));
    if (HASH_RE.test(node)) pool.hashes.add(node.toLowerCase());
    return;
  }
  if (typeof node === 'number' && insideEnvelope) {
    pool.decimals.add(round(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) harvest(v, pool, insideEnvelope, depth + 1);
    return;
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) harvest(v, pool, insideEnvelope, depth + 1);
  }
}

function isAssistantLine(line) {
  return line?.type === 'assistant' || line?.message?.role === 'assistant';
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && (b.type === 'text' || typeof b.text === 'string'))
      .map((b) => b.text)
      .filter((t) => typeof t === 'string')
      .join('\n');
  }
  return '';
}

function readTranscriptLines(transcriptPath) {
  const raw = fs.readFileSync(transcriptPath, 'utf8');
  const lines = [];
  for (const l of raw.split('\n')) {
    const trimmed = l.trim();
    if (!trimmed) continue;
    try {
      lines.push(JSON.parse(trimmed));
    } catch {
      // Schema drift or a partially-written line; skip it rather than fail.
    }
  }
  return lines;
}

function main() {
  const stdin = fs.readFileSync(0, 'utf8');
  let input;
  try {
    input = JSON.parse(stdin);
  } catch {
    process.exit(0); // can't read hook input at all: allow, don't brick the session
  }

  if (input.stop_hook_active) {
    process.exit(0); // already retried once this turn; never loop
  }

  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    process.exit(0);
  }

  const lines = readTranscriptLines(transcriptPath);
  if (lines.length === 0) process.exit(0);

  const lastAssistant = [...lines].reverse().find(isAssistantLine);
  if (!lastAssistant) process.exit(0);

  const finalText = extractText(lastAssistant.message?.content ?? lastAssistant.content);
  if (!finalText) process.exit(0);

  const claimedAmounts = [...new Set((finalText.match(MONEY_IN_TEXT_RE) || []).map(normalizeAmount).filter((n) => n !== null))];
  const claimedHashes = [...new Set((finalText.match(HASH_IN_TEXT_RE) || []).map((h) => h.toLowerCase()))];

  if (claimedAmounts.length === 0 && claimedHashes.length === 0) {
    process.exit(0); // nothing that looks like a monetary/hash claim to check
  }

  const pool = { decimals: new Set(), hashes: new Set(), sawEnvelope: false };
  for (const line of lines) harvest(line, pool, false, 0);

  const unmatchedAmounts = claimedAmounts.filter((a) => !pool.decimals.has(a));
  const unmatchedHashes = claimedHashes.filter((h) => !pool.hashes.has(h));

  if (unmatchedAmounts.length === 0 && unmatchedHashes.length === 0) {
    process.exit(0); // every claim traces back to a real ledger MCP tool result
  }

  const reasonParts = [];
  if (!pool.sawEnvelope) {
    reasonParts.push('No ledger MCP tool result was found in this session at all.');
  }
  if (unmatchedAmounts.length > 0) {
    reasonParts.push(
      `These amounts appear in your final message but do not match any value returned by a ledger MCP tool this session: ${unmatchedAmounts.join(', ')}.`,
    );
  }
  if (unmatchedHashes.length > 0) {
    reasonParts.push(
      `These audit hashes appear in your final message but were not returned by ledger_post / ledger_audit_hash / ledger_verify_determinism this session: ${unmatchedHashes.join(', ')}.`,
    );
  }
  reasonParts.push(
    'Per the Ledger kernel canon: recompute with money_compute, validate with entry_validate, post with ledger_post, ' +
      'and restate the figure exactly as the tool returned it (or correct your claim) before finishing.',
  );

  process.stdout.write(JSON.stringify({ decision: 'block', reason: reasonParts.join(' ') }));
  process.exit(0);
}

try {
  main();
} catch (e) {
  // Any unexpected failure in this script is an infrastructure problem, not a
  // policy violation: warn and allow, never block a session on our own bug.
  process.stderr.write(`verify-proof-binding: internal error, allowing turn: ${(e && e.message) || e}\n`);
  process.exit(0);
}
