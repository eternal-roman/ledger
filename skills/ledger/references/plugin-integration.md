# Hosts

Portable pieces: `AGENTS.md`, `skills/*/SKILL.md`, `commands/*.toml`.

Ledger always runs. If the host has planning/TDD/review/security skills, run those after kernel checks. If not, say "Ledger layer only".

Invariants are the same on every host: `Money.from`, `validateEntry`, `Ledger.apply`.
