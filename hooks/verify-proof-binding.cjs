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
//   far more stable than exact field paths. Plain assistant/user text is
//   never harvested for proof, no matter what it contains (an assistant can
//   type out JSON that merely LOOKS like a tool result — a real LLM failure
//   mode, and exactly the case this hook exists to catch).
// - MCP tool names in transcripts are NAMESPACED: `mcp__<server>__<tool>` for
//   user-configured servers, `mcp__plugin_<plugin>_<server>__<tool>` for
//   plugin-bundled ones (verified against real transcripts and
//   https://code.claude.com/docs/en/hooks.md's matcher docs). Tool identity is
//   therefore matched on the bare name OR the segment after the last `__`.
// - Proof is harvested by KEY, not by shape. Ledger tool envelopes echo
//   caller-supplied text (entry descriptions, artifact scope/assumptions,
//   reconcile external amounts) and contain decimal-shaped strings that are
//   not money (account codes "1000", the `v` schema-version tag). Harvesting
//   every decimal-shaped leaf let a fabricated "$3,000" be rubber-stamped by
//   an equity account code. Only the kernel-computed value keys listed in
//   AMOUNT_KEYS below (derived from mcp/src/tools.ts response shapes, kept in
//   sync by tests/hooks/verify-proof-binding.test.ts) enter the proven pool,
//   and audit hashes are only trusted from the tools that MINT them —
//   artifact_make is excluded entirely because it echoes the caller's own
//   auditHash back (that echo must not count as proof of itself).
// - Amounts are compared as canonical decimal STRINGS, never floats.
//   parseFloat is forbidden for amounts in this repo (AGENTS.md), and floats
//   would collapse distinct values (>2^53, or >8dp assets like ETH at scale
//   18) into "matching".
// - Display-rounded figures ("$1.8k", "$1.2M") are deliberately NOT treated
//   as claims: they cannot be checked against exact tool output, and
//   truncating them to 1.8/1.2 produced guaranteed false blocks. Fail-open on
//   what we cannot verify; fail-closed only on a confident mismatch.
// - This is a heuristic lint, not a second kernel: it does exact-string
//   equality on values already produced by the real kernel, it does not
//   re-derive them. It cannot catch every paraphrase and isn't meant to. The
//   durable, non-bypassable binding lives in the MCP layer (artifact_make
//   only accepts session-issued or ledger-recomputed hashes — see
//   mcp/src/tools.ts).
// - Fail-open on infrastructure failure (missing/unreadable transcript,
//   malformed JSON, unexpected shape) — never brick a session because this
//   script couldn't run. Only a confidently detected mismatch blocks the turn.
// - Respects `stop_hook_active` to avoid loops, but the retry pass is not
//   silent: if the mismatch is still present it emits a non-blocking
//   systemMessage warning so a persistent fabrication leaves a user-visible
//   trace instead of shipping quietly.

const fs = require('node:fs');

// Bare decimal, e.g. Money.toJSON()'s "a" field ("1800.00").
const DECIMAL_RE = /^-?\d+(?:\.\d+)?$/;
// Money.toString()'s combined format ("1800.00 USD") — what money_compute's
// `result`, ledger_balance's `balance`, and most single-value outputs return.
const MONEY_TOSTRING_RE = /^(-?\d+(?:\.\d+)?)\s\S+$/;
const HASH_RE = /^[0-9a-f]{64}$/i;
const HASH_IN_TEXT_RE = /\b[0-9a-f]{64}\b/gi;

// Mirrors TOOL_NAMES in mcp/src/tools.ts. Kept in sync by
// tests/hooks/verify-proof-binding.test.ts, which require()s this module's
// exports and diffs them against the real TOOL_NAMES export — drift fails CI.
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

// Tools whose envelopes are pure echoes of caller input — never harvested.
// artifact_make returns the caller's own auditHash/scope/assumptions verbatim;
// trusting that echo would launder a fabricated figure through one tool call.
const HARVEST_EXCLUDED_TOOLS = new Set(['artifact_make']);

// Tools that MINT audit hashes (the kernel computed the digest). Hashes found
// under HASH_KEYS in other tools' envelopes are echoes, not proof.
const HASH_MINTING_TOOLS = new Set([
  'ledger_post',
  'periods_guarded_post',
  'ledger_audit_hash',
  'ledger_verify_determinism',
  'trace_run',
]);
const HASH_KEYS = new Set(['auditHash', 'hash', 'finalHash']);

// Kernel-computed value keys, enumerated from mcp/src/tools.ts response
// shapes (and the kernel serializers they call). A string (or array of
// strings) under one of these keys is money the kernel produced; anything
// else — descriptions, ids, account codes, artifact prose, the `v` schema
// tag — is not, even when it happens to be decimal-shaped.
const AMOUNT_KEYS = new Set([
  'a', // Money.toJSON amount, inside any serialized entry/ledger
  'result', // money_compute
  'parts', // money_compute allocate
  'balance', // ledger_balance, trial-balance rows, trace checkpoints
  'byCurrency', // ledger_balance
  'original', 'translated', 'total', 'cta', // fx_compute_translation
  'initialDepreciable', 'depreciation', 'accumulated', 'carrying', // depreciation_build_schedule
  'operating', 'investing', 'financing', 'netChange', 'openingCash', 'closingCash', // cashflow_statement
  'ledger', 'external', 'diff', // reconcile_positions rows (string leaves only; the ledger snapshot object recurses normally)
  'totalRealized', 'quantity', 'costBasis', 'proceeds', 'basis', 'gain', // portfolio_relief
  'settledCash', // settlement_build_entries
]);

// Currency/asset codes recognized in prose claims. Explicit allowlist, NOT a
// generic 3-5 uppercase-letter pattern: accounting prose is full of standard
// citations shaped exactly like "letters + number" (IFRS 16, IAS 16.48,
// ASC 842, GAAP 2023, ISO 4217) and matching those as money would block
// citing canon. Split in two because some asset tickers are common English
// acronyms (ADA, DOT, SOL): those only count as money when the NUMBER COMES
// FIRST ("0.5 ADA"), never code-first ("ADA 2010" is a statute, not a
// payment). Fiat codes match in both directions ("100.00 USD", "USD 100.00").
// Must cover every symbol in the kernel's defaultAssetRegistry
// (src/instruments/registry.ts) — enforced by a sync test.
const FIAT_CODES =
  'USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|CNY|HKD|SGD|INR|MXN|BRL|ZAR|SEK|NOK|DKK|PLN|KRW';
const ASSET_CODES =
  'BTC|ETH|SOL|ADA|USDT|USDC|XRP|DOGE|LTC|BNB|DOT|MATIC|AAPL|SPY';
const ANY_CODE_RE = `(?:${FIAT_CODES}|${ASSET_CODES})`;
const FIAT_CODE_RE = `(?:${FIAT_CODES})`;
// A number that is a checkable exact amount: not preceded by a word char or
// '.', and not followed by a magnitude/word suffix ("$1.8k", "$1.2M" are
// display roundings we cannot verify — skipped, not blocked).
const NUM = '-?\\d[\\d,]*(?:\\.\\d+)?';
const MONEY_IN_TEXT_RE = new RegExp(
  `(?:[$€£¥]\\s?${NUM}(?![\\d.,]*[a-zA-Z]))` + // $1,800.00 — symbol first
    `|(?:(?<![\\w.])${NUM}\\s?${ANY_CODE_RE}\\b)` + // 0.5 BTC / 1800.00 USD — number first, any code
    `|(?:\\b${FIAT_CODE_RE}\\s?${NUM}(?![\\d.,]*[a-zA-Z]))`, // USD 1800.00 — code first, fiat only
  'g',
);

/**
 * Canonical decimal string for exact comparison — no floats anywhere
 * (AGENTS.md forbids parseFloat for amounts; floats also collapse distinct
 * values past 2^53 and past 8dp, e.g. ETH is scale 18 in the kernel).
 * "1,800.00" -> "1800", "$0.30" -> "0.3", "-0.50 USD" -> "-0.5".
 */
function canonDecimal(raw) {
  const s = raw.replace(/[$€£¥,\s]/g, '').replace(/^[A-Za-z]+|[A-Za-z]+$/g, '');
  if (!DECIMAL_RE.test(s)) return null;
  let neg = s.startsWith('-');
  const [intRaw, fracRaw = ''] = (neg ? s.slice(1) : s).split('.');
  const int = intRaw.replace(/^0+(?=\d)/, '');
  const frac = fracRaw.replace(/0+$/, '');
  if (int === '0' && frac === '') neg = false; // -0 === 0
  return (neg ? '-' : '') + (frac ? `${int}.${frac}` : int);
}

/** Bare tool name from a possibly-namespaced transcript name:
 * "mcp__plugin_ledger_ledger__ledger_post" -> "ledger_post". */
function bareToolName(name) {
  const i = name.lastIndexOf('__');
  return i === -1 ? name : name.slice(i + 2);
}

function isKnownLedgerTool(name) {
  return KNOWN_LEDGER_TOOL_NAMES.has(name) || KNOWN_LEDGER_TOOL_NAMES.has(bareToolName(name));
}

/** Harvest kernel-computed amounts (by key) and — when allowHashes — minted
 * audit hashes from an already shape-verified ledger envelope.
 * `keyAllowed` is true only while descending directly under an AMOUNT_KEYS
 * key (propagated through arrays, e.g. parts/byCurrency). */
function harvestLeaves(node, pool, allowHashes, depth, keyAllowed) {
  if (depth > 14) return; // guard against pathological nesting
  if (typeof node === 'string') {
    if (!keyAllowed) return;
    if (DECIMAL_RE.test(node)) {
      const c = canonDecimal(node);
      if (c !== null) pool.decimals.add(c);
    } else {
      const m = node.match(MONEY_TOSTRING_RE);
      if (m) {
        const c = canonDecimal(m[1]);
        if (c !== null) pool.decimals.add(c);
      }
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) harvestLeaves(v, pool, allowHashes, depth + 1, keyAllowed);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, v] of Object.entries(node)) {
      if (allowHashes && HASH_KEYS.has(key) && typeof v === 'string' && HASH_RE.test(v)) {
        pool.hashes.add(v.toLowerCase());
      }
      harvestLeaves(v, pool, allowHashes, depth + 1, AMOUNT_KEYS.has(key));
    }
  }
}

/** One walk, both block types: content the transcript itself marked
 * `tool_result` (real tool output) and `tool_use` (to resolve tool identity).
 * Structure-agnostic on the wrappers; the type markers themselves are
 * standard Messages API content-block taxonomy. */
function collectBlocks(node, uses, results, depth) {
  if (depth > 14 || node == null) return;
  if (Array.isArray(node)) {
    for (const v of node) collectBlocks(v, uses, results, depth + 1);
    return;
  }
  if (typeof node === 'object') {
    if (node.type === 'tool_result') {
      results.push(node);
    } else if (node.type === 'tool_use' && typeof node.id === 'string' && typeof node.name === 'string') {
      uses.push(node);
    }
    for (const v of Object.values(node)) collectBlocks(v, uses, results, depth + 1);
  }
}

/** Parsed JSON values inside a real tool_result block that match our ledger
 * envelope shape ({ ok: boolean, ... }, per mcp/src/tools.ts's ok()/fail()) —
 * the second, narrower gate on top of "came from a real tool_result". */
function isLedgerEnvelope(v) {
  return !!v && typeof v === 'object' && typeof v.ok === 'boolean';
}

function extractLedgerEnvelopes(block) {
  const envelopes = [];
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

function main() {
  const stdin = fs.readFileSync(0, 'utf8');
  let input;
  try {
    input = JSON.parse(stdin);
  } catch {
    process.exit(0); // can't read hook input at all: allow, don't brick the session
  }

  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    process.exit(0);
  }

  // The transcript grows without bound over a session and this hook runs on
  // EVERY turn, so the common no-claims case must stay cheap: find the final
  // assistant message from the tail first, and only pay for parsing the rest
  // of the file when that message actually asserts amounts/hashes.
  const rawLines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

  let finalText = '';
  let foundAssistant = false;
  for (let i = rawLines.length - 1; i >= 0; i--) {
    const trimmed = rawLines[i].trim();
    if (!trimmed || !trimmed.includes('assistant')) continue; // cheap prefilter
    let line;
    try {
      line = JSON.parse(trimmed);
    } catch {
      continue; // partially-written or drifted line; skip rather than fail
    }
    if (!isAssistantLine(line)) continue;
    finalText = extractText(line.message?.content ?? line.content);
    foundAssistant = true;
    break;
  }
  if (!foundAssistant || !finalText) process.exit(0);

  const claimedAmounts = [
    ...new Set((finalText.match(MONEY_IN_TEXT_RE) || []).map(canonDecimal).filter((c) => c !== null)),
  ];
  const claimedHashes = [...new Set((finalText.match(HASH_IN_TEXT_RE) || []).map((h) => h.toLowerCase()))];

  if (claimedAmounts.length === 0 && claimedHashes.length === 0) {
    process.exit(0); // nothing that looks like a checkable monetary/hash claim
  }

  const toolUseBlocks = [];
  const toolResultBlocks = [];
  for (const l of rawLines) {
    // Only lines that can contain tool blocks are worth a JSON.parse.
    if (!l.includes('"tool_result"') && !l.includes('"tool_use"')) continue;
    let line;
    try {
      line = JSON.parse(l.trim());
    } catch {
      continue;
    }
    collectBlocks(line, toolUseBlocks, toolResultBlocks, 0);
  }
  const nameByToolUseId = new Map(toolUseBlocks.map((b) => [b.id, b.name]));

  const pool = { decimals: new Set(), hashes: new Set(), sawEnvelope: false };
  for (const block of toolResultBlocks) {
    // Resolve tool identity on a best-effort basis (namespaced or bare — see
    // header). If it resolves to a non-ledger tool, don't trust the block. If
    // it doesn't resolve at all (no tool_use found — a transcript-schema
    // drift), fall back to trusting by shape alone: a missing id must never
    // turn into "nothing is ever proven".
    const resolvedName = typeof block.tool_use_id === 'string' ? nameByToolUseId.get(block.tool_use_id) : undefined;
    let allowHashes = true;
    if (resolvedName !== undefined) {
      if (!isKnownLedgerTool(resolvedName)) continue;
      const bare = bareToolName(resolvedName);
      if (HARVEST_EXCLUDED_TOOLS.has(bare)) continue;
      allowHashes = HASH_MINTING_TOOLS.has(bare);
    }
    for (const envelope of extractLedgerEnvelopes(block)) {
      pool.sawEnvelope = true;
      harvestLeaves(envelope, pool, allowHashes, 0, false);
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

  if (input.stop_hook_active) {
    // Already blocked once this turn — never loop, but don't go silent either:
    // a mismatch that survived the retry leaves a user-visible warning.
    process.stdout.write(
      JSON.stringify({
        systemMessage: 'ledger proof-binding: unverified figures remain in the final message after retry. ' + reasonParts.join(' '),
      }),
    );
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({ decision: 'block', reason: reasonParts.join(' ') }));
  process.exit(0);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    // Any unexpected failure in this script is an infrastructure problem, not a
    // policy violation: warn and allow, never block a session on our own bug.
    process.stderr.write(`verify-proof-binding: internal error, allowing turn: ${(e && e.message) || e}\n`);
    process.exit(0);
  }
}

// Exported for tests (sync checks against mcp/src/tools.ts TOOL_NAMES and the
// kernel asset registry, plus direct unit tests) — the hook itself only runs
// when invoked as a script.
module.exports = {
  KNOWN_LEDGER_TOOL_NAMES,
  HARVEST_EXCLUDED_TOOLS,
  HASH_MINTING_TOOLS,
  AMOUNT_KEYS,
  FIAT_CODES,
  ASSET_CODES,
  canonDecimal,
  bareToolName,
};
