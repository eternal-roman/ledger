/**
 * IFRS 16 (Leases) — lessee accounting, built entirely on the kernel.
 *
 * One faithful, fully-tested standard rather than broad stubs: exact decimal,
 * deterministic, every generated entry passes validateEntry, and the schedule is
 * verified to the cent by a golden-master test (tests/standards/ifrs16.test.ts).
 */
export * from './schedule.js';
export * from './entries.js';
