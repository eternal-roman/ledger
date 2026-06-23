# Adapters for non-plugin hosts

- Cursor: copy `docs/adapters/cursor/ledger.mdc` into `.cursor/rules/`.
- Other: copy `AGENTS.md` or `skills/ledger/SKILL.md` (or the neutral `skills/ledger-core/SKILL.md`).
- Always pair with the mechanical verifier: `npx tsx .../scripts/ledger-verify.ts --scan .`

For full experience use the plugin (skills + commands) on supported hosts.
