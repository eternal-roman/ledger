import { Account } from '../core/account.js';
import { Ledger } from '../core/ledger.js';
import { Money } from '../core/money.js';

/**
 * Position reconciliation — compare ledger-derived balances against an external
 * source of truth (exchange API snapshot, custodian statement, bank feed).
 *
 * This is the #1 operational control for any automated set of books: prove that
 * what the ledger says you hold matches what the venue says you hold, to the
 * minor unit, with zero float drift.
 *
 * Pure projection over the immutable ledger (no parallel state). Every diff is
 * exact Money. Fails closed: a currency that cannot be compared is surfaced as a
 * mismatch, never silently dropped.
 *
 * Citations: internal-control / reconciliation is a basic accounting cycle step
 * (see knowledge seed `gaap-period-cutoff-closing`).
 */

/** One externally-reported balance to reconcile against a ledger account. */
export interface ExternalBalance {
  readonly accountCode: string;
  /** Reported amount as an exact decimal string (never a float). */
  readonly amount: string;
  readonly currency: string;
}

export type ReconcileStatus =
  | 'matched'            // ledger == external, to the minor unit
  | 'mismatch'           // both present, amounts differ
  | 'missing_in_ledger'  // external reports a balance the ledger has no activity for
  | 'missing_in_external'; // ledger holds a balance the external source does not report

export interface ReconcileRow {
  readonly accountCode: string;
  readonly currency: string;
  readonly ledger: string | null;    // ledger balance as string, null if absent
  readonly external: string | null;  // external balance as string, null if absent
  readonly diff: string | null;      // ledger - external (exact), null if a side is absent
  readonly status: ReconcileStatus;
}

export interface ReconcileResult {
  readonly reconciled: boolean;       // true iff every row is 'matched'
  readonly rows: ReconcileRow[];
  readonly matched: number;
  readonly discrepancies: number;
}

/** Key a position by account code + currency (a multi-currency account reconciles per currency). */
function key(code: string, currency: string): string {
  return `${code}|${currency.toUpperCase()}`;
}

/**
 * Reconcile the ledger's per-account, per-currency balances against an external
 * snapshot. Accounts are matched by code AND currency so multi-currency holdings
 * reconcile leg-by-leg.
 *
 * @param ledger immutable ledger (source of derived truth)
 * @param external externally reported balances
 * @param asOf optional as-of date (YYYY-MM-DD) to reconcile a historical position
 */
export function reconcilePositions(
  ledger: Ledger,
  external: readonly ExternalBalance[],
  asOf?: string,
): ReconcileResult {
  // Build the ledger side: one entry per (account code, currency).
  const ledgerByKey = new Map<string, { account: Account; balance: Money }>();
  for (const { account, balance } of ledger.trialBalance()) {
    // trialBalance has no asOf; when asOf is supplied, recompute per currency as-of that date.
    if (asOf) {
      for (const bal of ledger.balancesByCurrency(account, asOf)) {
        ledgerByKey.set(key(account.code, bal.currency), { account, balance: bal });
      }
    } else {
      ledgerByKey.set(key(account.code, balance.currency), { account, balance });
    }
  }

  // Build the external side, constructing exact Money (fails closed on sub-scale / float input).
  const extByKey = new Map<string, Money>();
  for (const e of external) {
    extByKey.set(key(e.accountCode, e.currency), Money.from(e.amount, e.currency));
  }

  const rows: ReconcileRow[] = [];
  const seen = new Set<string>();

  // Walk every key present on either side, in a deterministic order.
  const allKeys = Array.from(new Set([...ledgerByKey.keys(), ...extByKey.keys()])).sort();

  for (const k of allKeys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const [accountCode, currency] = k.split('|');
    const l = ledgerByKey.get(k);
    const x = extByKey.get(k);

    if (l && x) {
      const diff = l.balance.sub(x);
      rows.push({
        accountCode,
        currency,
        ledger: l.balance.toString(),
        external: x.toString(),
        diff: diff.toString(),
        status: diff.isZero() ? 'matched' : 'mismatch',
      });
    } else if (l && !x) {
      rows.push({
        accountCode,
        currency,
        ledger: l.balance.toString(),
        external: null,
        diff: null,
        status: 'missing_in_external',
      });
    } else if (!l && x) {
      rows.push({
        accountCode,
        currency,
        ledger: null,
        external: x.toString(),
        diff: null,
        status: 'missing_in_ledger',
      });
    }
  }

  const matched = rows.filter(r => r.status === 'matched').length;
  const discrepancies = rows.length - matched;

  return {
    reconciled: discrepancies === 0,
    rows,
    matched,
    discrepancies,
  };
}
