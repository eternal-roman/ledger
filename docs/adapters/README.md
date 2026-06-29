# Adapters for non-plugin hosts

- Cursor and similar: create `.cursor/rules/ledger.mdc` (or equivalent) containing the guidance from `AGENTS.md` or `skills/ledger/SKILL.md`.
- Other hosts: copy `AGENTS.md` or `skills/ledger/SKILL.md` (or the neutral `skills/ledger-core/SKILL.md`).
- Always pair with the mechanical verifier: `npx tsx scripts/ledger-verify.ts --scan .` (or `npm run verify:ledger` after install).

For full experience use the plugin (skills + commands) on supported hosts.
