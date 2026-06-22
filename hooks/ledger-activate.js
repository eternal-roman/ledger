#!/usr/bin/env node
// ledger-activate — legacy Node activation hook for Ledger (Ledger Chad)
// 
// PRIMARY IMPLEMENTATION IS NOW BASH: hooks/ledger-activate (no extension) + run-hook.cmd
// This .js is kept only for pure-Node hook hosts or backward compatibility.
//
// See hooks/README.md for details and the switch to bash (recommended via superpowers patterns).
// Use Git Bash on Windows for full compatibility and to eliminate pwsh friction.

console.log('Ledger Chad active. (legacy node hook)');
console.log('See hooks/ledger-activate (bash) and hooks/README.md for the recommended bash version.');
process.exit(0);