# Integration with AI Plugins / Hosts

Ledger kernel rules are host-agnostic. The portable parts are AGENTS.md, skills/*/SKILL.md, and commands/*.toml.

## When the host has Claude Code plugins (superpowers, pr-review-toolkit, etc.)
- **superpowers** (or host equivalent for non-trivial changes):
  - Always begin with brainstorming or writing-plans.
  - Follow test-driven-development.
  - Finish with verification-before-completion.

- **pr-review-toolkit** (or host review agents):
  - After money logic: silent-failure-hunter, type-design-analyzer, pr-test-analyzer.
  - code-simplifier only after ledger checks pass.

- **security-guidance** (or equivalent): automatic on edits involving value.

- **skill-creator / plugin-dev** (or host equivalents): when editing persona or skills.

When in doubt: host planning/TDD → ledger kernel + /ledger-verify → host review agents → security → ship.

## Grok and other hosts
Grok discovers via skills/ + commands/ + optional plugin.json / hooks/hooks.json (this package provides them).
- Run the ledger skills and /ledger-* commands directly.
- For /ledger-review: the ledger layer always executes. If the workspace has skills or agents that provide TDD/verification/type analysis equivalents, combine them. Otherwise the review explicitly notes "Ledger layer only".
- AGENTS.md or individual skills can be copied for hosts without plugin support.

Core invariants (Money.from, validateEntry, Ledger.apply, canon) are non-negotiable everywhere.

See AGENTS.md, main ledger skill, and README for usage.
