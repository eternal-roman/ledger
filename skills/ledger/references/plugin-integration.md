# Integration with Claude Code Plugins

This skill is designed to work alongside installed plugins for rigorous development:

- **superpowers** (required for non-trivial changes):
  - Always begin with `brainstorming` or `writing-plans`.
  - Follow `test-driven-development`.
  - Finish with `verification-before-completion`.

- **pr-review-toolkit**:
  - After writing or modifying money logic, ask for:
    - `silent-failure-hunter` (no hidden errors in balances or calculations)
    - `type-design-analyzer` (strong invariants on Money, Entry, Ledger)
    - `pr-test-analyzer` (coverage of kernel edge cases)
  - Run `code-simplifier` only after passing all ledger checks (kernel must stay minimal).

- **security-guidance**:
  - Automatic on file edits. Pay special attention to any future API surfaces, serialization of amounts, or rate inputs.

- **claude-md-management / skill-creator / plugin-dev**:
  - When editing this skill or AGENTS.md, use the corresponding skills to keep quality high.
  - Follow progressive disclosure: frontmatter → concise SKILL.md → references/.

- **commit-commands**:
  - Prefer `commit-push-pr` for changes that touch core.

When in doubt: superpowers plan first → implement with ledger kernel → ledger-verify → pr-review agents → security review → commit.

See also: CLAUDE.md and AGENTS.md "When Developing This Library" section.
