---
name: ledger-core
description: >
  Kernel-only enforcement for monetary code. Use when writing or reviewing Money.from,
  JournalEntry, validateEntry, Ledger.apply, or when you see parseFloat / native number
  amounts. Zero-Skip + Canonical Financial Artifact. Prefer this in libraries that
  depend on @eternal-roman/ledger without the full plugin.
license: MIT
---

# Ledger core

Same rules as `AGENTS.md` / `docs/CORE-PROTOCOL.md`, no host plugin required.

`Money.from` → `JournalEntry` → `validateEntry` → `Ledger.apply`. No floats. No unbalanced state. Artifact before a financial answer. `npx ledger-verify --scan .`.
