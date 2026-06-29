import { JournalEntry, ValidationResult, validateEntry } from '../core/journal.js';
import { Ledger } from '../core/ledger.js';

/**
 * PeriodLock — immutable fact representing a hard close for a period.
 * Once a period is locked (e.g. fiscal quarter end), the kernel guard must
 * reject any entry whose effectiveDate is on or before the lockDate.
 *
 * This is external governance state (not stored inside JournalEntry or Ledger).
 * It composes with the core without mutating it.
 *
 * Citations (attach via ledger-cite or seeds):
 * - GAAP period cutoff and internal control requirements.
 * - Prevents backdating (management override risk).
 */
export interface PeriodLock {
  readonly id: string;
  /** Inclusive: effectiveDate <= lockDate is closed. Strict YYYY-MM-DD. */
  readonly lockDate: string;
  readonly authority: string; // e.g. "CFO" or "board resolution 2026-Q2"
  readonly reason: string;
  readonly createdAt: string; // ISO timestamp for audit
  readonly tags?: Readonly<Record<string, string>>;
}

/** Factory that produces a frozen PeriodLock (immutable). */
export function createPeriodLock(
  id: string,
  lockDate: string,
  authority: string,
  reason: string,
  createdAt: string,
  tags?: Record<string, string>
): PeriodLock {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lockDate)) {
    throw new Error('PeriodLock.lockDate must be strict YYYY-MM-DD');
  }
  return Object.freeze({
    id,
    lockDate,
    authority,
    reason,
    createdAt,
    tags: tags ? Object.freeze({ ...tags }) : undefined,
  });
}

/** Returns true if the date is on or before any lock. */
export function isEffectiveDateLocked(date: string, locks: readonly PeriodLock[]): boolean {
  return locks.some(l => date <= l.lockDate);
}

/**
 * Pure composition: run core validateEntry, then layer period checks.
 * Never mutates. Returns the combined ValidationResult (new violation type possible).
 * Use this (or guardedApply) for any anti-fraud enforcement.
 */
export function validateEntryWithPeriodLocks(
  entry: JournalEntry,
  locks: readonly PeriodLock[] = []
): ValidationResult {
  const base = validateEntry(entry);
  if (!base.ok) return base;

  const offending = locks.find(l => entry.effectiveDate <= l.lockDate);
  if (offending) {
    return {
      ok: false,
      violations: [
        ...base.violations,
        {
          type: 'PERIOD_LOCKED',
          message: `effectiveDate ${entry.effectiveDate} is on or before lock ${offending.lockDate} (${offending.authority}: ${offending.reason})`,
          lockDate: offending.lockDate,
        },
      ],
    };
  }
  return base;
}

/**
 * Immutable guarded apply.
 * Core Ledger.apply is called only after all guards pass.
 * Returns the same shape as Ledger.apply so callers can treat uniformly.
 */
export function guardedApply(
  ledger: Ledger,
  entry: JournalEntry,
  options: { periodLocks?: readonly PeriodLock[] } = {}
): { ledger: Ledger; result: ValidationResult } {
  const locks = options.periodLocks ?? [];
  const guardResult = validateEntryWithPeriodLocks(entry, locks);
  if (!guardResult.ok) {
    return { ledger, result: guardResult };
  }
  // Delegate to pure kernel (identical behavior and auditHash chain)
  return ledger.apply(entry);
}
