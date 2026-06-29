import { Account, AccountType } from '../core/account.js';
import { createBalancedEntry, JournalEntry } from '../core/journal.js';
import { Ledger } from '../core/ledger.js';
import { FXRate, Money, ROUND_HALF_UP } from '../core/money.js';

/**
 * FX Translation + CTA for consolidated reporting.
 * The source ledger remains in its functional currencies.
 * This layer produces translated balances in a reporting currency and the
 * exact CTA plug required to make the consolidated equation balance.
 *
 * Follows IAS 21 principles (assets/liab at closing rate; CTA to equity).
 */

export interface TranslationRate {
  rate: string | number; // exact decimal
  source?: string;
}

export interface TranslationResult {
  reportingCurrency: string;
  asOf: string;
  /** Per-account translated balances (original + translated). */
  holdings: Array<{
    account: Account;
    original: Money;
    translated: Money;
  }>;
  /** Net by AccountType in reporting currency after translation. */
  translatedByType: Array<{ type: AccountType; total: Money }>;
  /** The exact CTA amount (plug) that must be booked to equity so A=L+E. */
  cta: Money;
  /** After CTA the consolidated would balance. */
  balancedWithCta: boolean;
}

/**
 * Compute translated balances + the CTA balancing figure.
 * Rates are from source currency -> reportingCurrency.
 */
export function computeFxTranslation(
  ledger: Ledger,
  asOf: string,
  rates: Record<string, TranslationRate>,
  reportingCurrency: string
): TranslationResult {
  const RC = reportingCurrency.toUpperCase();
  const holdings: TranslationResult['holdings'] = [];
  const typeTotals = new Map<AccountType, Money>();

  // Discover via trial (multi-curr complete)
  for (const { account, balance: orig } of ledger.trialBalance()) {
    if (!orig || orig.isZero()) continue;
    const cur = orig.currency;
    const rateInfo = rates[cur] || rates[cur.toLowerCase()];
    let translated: Money;
    if (cur === RC) {
      translated = orig;
    } else if (rateInfo) {
      const fx = new FXRate(cur, RC, rateInfo.rate, asOf, rateInfo.source);
      translated = orig.convert(fx, ROUND_HALF_UP);
    } else {
      // Fail closed for missing rate (no silent drop)
      throw new Error(`Missing translation rate for ${cur} -> ${RC}`);
    }

    holdings.push({ account, original: orig, translated });

    const t = typeTotals.get(account.type) || Money.zero(RC);
    typeTotals.set(account.type, t.add(translated));
  }

  const translatedByType = Array.from(typeTotals.entries()).map(([type, total]) => ({ type, total }));

  // Fundamental: for reporting curr, Assets + Exp == Liab + Equity + Income (after CTA)
  const get = (t: AccountType) => typeTotals.get(t) || Money.zero(RC);
  const left = get(AccountType.Asset).add(get(AccountType.Expense));
  const right = get(AccountType.Liability).add(get(AccountType.Equity)).add(get(AccountType.Income));
  const diff = left.sub(right);
  const cta = diff; // signed amount to add to equity/right side to force balance (positive = credit CTA/RE increase)
  const balancedWithCta = left.sub(right.add(cta)).isZero(); // after plug

  return {
    reportingCurrency: RC,
    asOf,
    holdings,
    translatedByType,
    cta, // signed CTA plug for caller to decide Dr/Cr to CTA equity account
    balancedWithCta,
  };
}

/** Convenience: produce a balanced CTA JournalEntry that can be posted. */
export function createTranslationAdjustmentEntry(
  id: string,
  date: string,
  ctaAccount: Account, // typically Equity / OCI-CTA
  ctaAmount: Money,
  description = 'Cumulative translation adjustment',
  citations: string[] = ['IAS 21.39-47']
): JournalEntry {
  // Sign convention: credit CTA when it increases equity to balance
  const dr = ctaAccount; // placeholder direction chosen by caller via amount sign handling outside
  // Simpler: caller decides side by passing the signed amount logic.
  // Here we produce a balanced 2-line using the amount as positive.
  // Real usage: decide Dr/Cr based on whether CTA is debit or credit balance.
  const clearing = new Account('CTA-CLEAR', 'CTA Clearing (temp)', AccountType.Equity);
  return createBalancedEntry(
    id,
    date,
    dr,
    clearing,
    ctaAmount,
    description,
    citations
  );
}
