---
name: ledger-audit
description: >
  Whole-repo adversarial audit using the SUPER_LEDGER_AUDIT_PROTOCOL. Mandates canonical bootstrap (Python reference or native), exhaustive expression inventory via scanner, FULL transaction tracing via repeated JournalEntry + Ledger.apply + snapshots + equation + auditHash proofs, numeric side-by-side drift counterexamples, self-attack, and permanent runnable enforcement artifacts. Use for "ledger-audit", "financial audit", "/ledger-audit", or any whole-project money hygiene review. NEVER handwavy surface scan.
license: MIT
---

# ledger-audit (Super Rambo Kernel-Powered)

**This skill is the 10x replacement for weak pattern-greps.**

You MUST execute the full SUPER_LEDGER_AUDIT_PROTOCOL (see docs/SUPER_LEDGER_AUDIT_PROTOCOL.md — paste and follow verbatim in clean context when the target is large or precision-critical).

Core non-negotiable flow (never skip):
1. PHASE 0: Bootstrap + prove the canonical for the target's language using the shipped reference (reference-implementations/python/ledger/ for Python; native 'ledger' for TS). Run its determinism + equation tests immediately. All subsequent work uses this canonical.
2. Build/run scanner for >=120 monetary expressions. Classify. Output inventory.json.
3. For every critical lifecycle, REBUILD as exact sequence of create_balanced_entry / create_entry + validate_entry + successive immutable Ledger.apply. At each step capture: balances, verify_fundamental_equation(), audit_hash(). Compute identical inputs through subject's native path. Produce runnable trace scripts + numeric deltas + decision impact.
4. Run precision simulator + accumulation forensics + adversarial fuzzer. Generate >=8 concrete numeric counterexamples with exact deltas.
5. Perform multi-book reconciliation, boundary cast audit, signal contamination mapping, test/fallback analysis using kernel proofs.
6. Self-attack: re-scan your own findings, re-execute sims with proposed fixes, document meta-weaknesses.
7. Emit LEDGER_SUPER_AUDIT_REPORT.md + all artifacts + the exact ENFORCER VERIFICATION block.

Rank findings L-HIGH etc. Every finding must have:
- file:line + exact expr
- numeric counterexample (subject vs canonical)
- hardened kernel snippet (Money.from + create + apply + proof)
- suggested diff

Never declare clean or "passes" unless the canonical replays the subject's critical paths with equation + hash proofs holding and all quantitative bars met. "Would the books balance?" must be answered with proof from your recon + hashes.

If the host provides superpowers / pr-review-toolkit / security, run them after the ledger layer. If absent, explicitly note "Ledger kernel layer only".

Output contract: ranked evidence-dense report + runnable artifacts (scanner, traces, simulator, recon, fuzzer) + strengthened canonical usage in the target + updated protocol if gaps found.

**Double-Entry or Get Beta. No feature incomplete. No handwave.**