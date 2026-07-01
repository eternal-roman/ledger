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
//   Code releases (see https://code.claude.com/docs/en/hooks.md). This script
//   still needs ONE structural fact to hold: only content blocks explicitly
//   marked `type: "tool_result"` are treated as real tool output — this is
//   part of the Anthropic Messages API content-block taxonomy Claude Code's
//   transcripts are built on, not an internal implementation detail, so it's
//   far more stable than exact field paths.
// - That restriction is load-bearing, not incidental: an earlier version
//   recognized "real tool output" purely by shape (any JSON string anywhere
//   with a top-level boolean `ok`, matching mcp/src/tools.ts's ok()/fail()
//   envelope) regardless of where it appeared. That meant an assistant text
//   block that merely *described* or *hallucinated* what a tool call would
//   return — a known LLM failure mode, and exactly the case this hook exists
//   to catch — could launder a fabricated figure straight into the "proven"
//   pool just by happening to be JSON-shaped. Only content Claude Code itself
//   marks as a tool_result is trusted now; plain assistant/user text is never
//   harvested for proof, no matter what it contains.
// - This is a heuristic lint, not a second kernel: it does decimal-string
//   equality on values already produced by the real kernel, it does not
//   re-derive them. It cannot catch every paraphrase (spelled-out numbers,
//   rounding for display, split-across-sentences amounts) and isn't meant to.
// - Tool identity is checked on a best-effort basis: a tool_result's
//   tool_use_id is resolved against the tool_use block that requested it
//   (also standard Messages API taxonomy), and if that resolves to a name
//   NOT in KNOWN_LEDGER_TOOL_NAMES, the result is not trusted — closes the
//   gap where some other MCP server's tool coincidentally returns the same
//   {ok: boolean} envelope shape with a colliding number/hash. But if
//   resolution isn't possible at all (no id/name fields found anywhere,
//   suggesting this Claude Code version doesn't expose them the way we
//   expect), we fall back to trusting by shape alone rather than rejecting
//   everything — a missing id must never turn into "nothing is ever proven".
// - Fail-open on infrastructure failure (missing/unreadable transcript,
//   malformed JSON, unexpected shape) — never brick a session because this
//   script couldn't run. Only a confidently detected mismatch blocks the turn.
// - Respects `stop_hook_active` to avoid loops (Claude Code also caps at 8
//   consecutive blocks, but we shouldn't rely on that).

const fs = require('node:fs');

// Bare decimal, e.g. Money.toJSON()'s "a" field ("1800.00") where amount and
// currency are already split into separate fields.
const DECIMAL_RE = /^-?\d+(?:\.\d+)?$/;
// Money.toString()'s own format ("1800.00 USD") — amount and currency/asset
// code combined in one string. This is what money_compute's `result`,
// ledger_balance's `balance`, and most other single-value tool outputs
// actually return (see the pervasive `.toString()` calls in mcp/src/tools.ts).
// Without this, harvesting only bare decimals would miss nearly every
// legitimate proof and block the single most common interaction pattern in
// the whole system: compute or look up one value, then state it.
const MONEY_TOSTRING_RE = /^(-?\d+(?:\.\d+)?)\s\S+$/;
const HASH_RE = /^[0-9a-f]{64}$/i;
const HASH_IN_TEXT_RE = /\b[0-9a-f]{64}\b/gi;

// Mirrors TOOL_NAMES in mcp/src/tools.ts. Kept in sync by
// tests/hooks/verify-proof-binding.test.ts, which imports the real export
// and diffs it against this list — drift fails CI instead of silently
// widening (new tool omitted here) or narrowing (removed tool still
// trusted) the set of names this hook will accept as ledger proof.
const KNOWN_LEDGER_TOOL_NAMES = new Set([
  'money_compute',
  'entry_validate',
  'ledger_post',
  'ledger_balance',
  'ledger_trial_balance',
  'ledger_verify_equation',
  'ledger_audit_hash',
  'ledger_verify_determinism',
  'trace_run',
  'cite_lookup',
  'artifact_make',
  'periods_create_lock',
  'periods_guarded_post',
  'closing_generate_entries',
  'fx_compute_translation',
  'depreciation_build_schedule',
  'cashflow_statement',
  'reconcile_positions',
  'portfolio_relief',
  'settlement_build_entries',
]);

// Explicit allowlist of currency/asset codes, NOT a generic 3-5 uppercase-
// letter pattern. Accounting/finance prose is full of standard citations that
// look exactly like "3-5 letters + number" (IFRS 16, IAS 16.48, ASC 842, GAAP
// 2023, ASU 2016-02, ISO 4217) — matching any such token as a "currency code"
// would flag citing canon (the behavior the kernel rules exist to encourage)
// as an unproven monetary claim. Biased toward under-triggering: an amount in
// a currency not on this list simply isn't checked (fail-open on obscurity),
// which is the safer direction for a heuristic backstop than blocking a
// citation. Covers ISO 4217 majors + the kernel's default asset registry
// (src/instruments/registry.ts) + common crypto not yet in that registry.
const CURRENCY_CODES =
  'USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|CNY|HKD|SGD|INR|MXN|BRL|ZAR|SEK|NOK|DKK|PLN|KRW|' +
  'BTC|ETH|SOL|ADA|USDT|USDC|XRP|DOGE|LTC|BNB|DOT|MATIC';
const CURRENCY_CODE_RE = `(?:${CURRENCY_CODES})`;
// A monetary claim: a currency symbol adjacent to a number, or a decimal
// number adjacent to a known currency/asset code. Deliberately does NOT match
// bare integers/decimals (dates, counts, ids, standard citations) with no
// currency signal.
const MONEY_IN_TEXT_RE = new RegExp(
  `(?:[$€£¥]\\s?-?\\d[\\d,]*(?:\\.\\d+)?)` +
    `|(?:-?\\d[\\d,]*(?:\\.\\d+)?\\s?${CURRENCY_CODE_RE}\\b)` +
    `|(?:\\b${CURRENCY_CODE_RE}\\s?-?\\d[\\d,]*(?:\\.\\d+)?)`,
  'g',
);

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

/** Recursively harvest decimal/hash leaves from an already-parsed, already
 * shape-verified ledger envelope. No re-detection here — callers only ever
 * invoke this on an object confirmed to be `{ ok: boolean, ... }` sourced
 * from a real tool_result block (see extractLedgerEnvelopes).
 *
 * String leaves only, deliberately — every ledger MCP tool serializes money
 * as an exact decimal STRING (Money.toString()/toJSON(), never a native
 * number; see mcp/src/tools.ts, which calls .toString() on every monetary
 * value it returns). A raw `number` leaf in these envelopes is always
 * incidental metadata (entryCount, compare's -1/0/1, array lengths, ...),
 * never an amount. Treating numbers as "proven" amounts would let a
 * fabricated small claim like "$1" pass just because some unrelated
 * entryCount happened to equal 1. */
function harvestLeaves(node, pool, depth) {
  if (depth > 14) return; // guard against pathological/cyclic-looking nesting
  if (typeof node === 'string') {
    if (DECIMAL_RE.test(node)) {
      pool.decimals.add(round(Number.parseFloat(node)));
    } else {
      const m = node.match(MONEY_TOSTRING_RE);
      if (m) pool.decimals.add(round(Number.parseFloat(m[1])));
    }
    if (HASH_RE.test(node)) pool.hashes.add(node.toLowerCase());
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) harvestLeaves(v, pool, depth + 1);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, v] of Object.entries(node)) {
      // "v" is this kernel's schema-version tag, always the string "1"
      // (Ledger.toJSON, JournalEntry.toJSON, Money.toJSON all use it — see
      // src/core/{ledger,journal,money}.ts). It is never an amount, but it
      // IS decimal-shaped, so without this exclusion any Money/entry/ledger
      // object anywhere in a real tool result would pollute the proven pool
      // with a spurious "1" — which would then rubber-stamp any fabricated
      // "$1" / "1 <asset>" claim regardless of what was actually posted.
      if (key === 'v') continue;
      harvestLeaves(v, pool, depth + 1);
    }
  }
}

/** Find every content block the transcript itself marked as `tool_result`,
 * anywhere in the line (structure-agnostic on the wrapper, but the
 * `type: "tool_result"` marker itself is required — see header comment). */
function collectToolResultBlocks(node, out, depth) {
  if (depth > 14 || node == null) return;
  if (Array.isArray(node)) {
    for (const v of node) collectToolResultBlocks(v, out, depth + 1);
    return;
  }
  if (typeof node === 'object') {
    if (node.type === 'tool_result') out.push(node);
    for (const v of Object.values(node)) collectToolResultBlocks(v, out, depth + 1);
  }
}

/** Find every `tool_use` block (the request a `tool_result` answers), same
 * structure-agnostic walk. Used only to resolve tool_use_id -> tool name. */
function collectToolUseBlocks(node, out, depth) {
  if (depth > 14 || node == null) return;
  if (Array.isArray(node)) {
    for (const v of node) collectToolUseBlocks(v, out, depth + 1);
    return;
  }
  if (typeof node === 'object') {
    if (node.type === 'tool_use' && typeof node.id === 'string' && typeof node.name === 'string') {
      out.push(node);
    }
    for (const v of Object.values(node)) collectToolUseBlocks(v, out, depth + 1);
  }
}

/** Given a real tool_result block, return every parsed JSON value inside its
 * content that matches our ledger envelope shape (`{ ok: boolean, ... }`,
 * per mcp/src/tools.ts's ok()/fail()) — the second, narrower gate on top of
 * "came from a real tool_result", so a coincidentally-shaped result from
 * some unrelated MCP tool isn't trusted either. */
function isLedgerEnvelope(v) {
  return !!v && typeof v === 'object' && typeof v.ok === 'boolean';
}

function extractLedgerEnvelopes(block) {
  const envelopes = [];
  // Every ledger MCP tool sets both content[].text (JSON.stringify'd, per
  // mcp/src/tools.ts's ok()/fail()) and structuredContent (the same object,
  // already parsed). Accept either shape the transcript preserves.
  if (isLedgerEnvelope(block.structuredContent)) envelopes.push(block.structuredContent);

  const texts = [];
  const c = block.content;
  if (typeof c === 'string') texts.push(c);
  else if (Array.isArray(c)) {
    for (const b of c) if (b && typeof b.text === 'string') texts.push(b.text);
  } else if (c && typeof c.text === 'string') {
    texts.push(c.text);
  }
  for (const text of texts) {
    try {
      const parsed = JSON.parse(text);
      if (isLedgerEnvelope(parsed)) envelopes.push(parsed);
    } catch {
      /* not JSON, or not our envelope shape */
    }
  }
  return envelopes;
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

  const toolUseBlocks = [];
  for (const line of lines) collectToolUseBlocks(line, toolUseBlocks, 0);
  const nameByToolUseId = new Map(toolUseBlocks.map((b) => [b.id, b.name]));

  const pool = { decimals: new Set(), hashes: new Set(), sawEnvelope: false };
  const toolResultBlocks = [];
  for (const line of lines) collectToolResultBlocks(line, toolResultBlocks, 0);
  for (const block of toolResultBlocks) {
    // Resolve tool identity on a best-effort basis: if tool_use_id resolves
    // to a name we don't recognize as a ledger tool, don't trust this
    // block's envelopes even if they happen to match our {ok: boolean}
    // shape. If it doesn't resolve at all (no tool_use_id, or no matching
    // tool_use found), fall back to trusting by shape alone — see header
    // comment for why an unresolvable id must not become "nothing is ever
    // proven".
    const resolvedName = typeof block.tool_use_id === 'string' ? nameByToolUseId.get(block.tool_use_id) : undefined;
    if (resolvedName !== undefined && !KNOWN_LEDGER_TOOL_NAMES.has(resolvedName)) continue;
    for (const envelope of extractLedgerEnvelopes(block)) {
      pool.sawEnvelope = true;
      harvestLeaves(envelope, pool, 0);
    }
  }

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
