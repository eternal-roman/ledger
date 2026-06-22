import { Account } from '../core/account.js';
import { custodyAccount, cashAccount, clearingAccount } from '../trading/accounts.js';

/**
 * A centralized-exchange (CEX) account: the per-venue block of custody and cash
 * accounts. Pure description — balances live in the Ledger, not here.
 */
export interface ExchangeAccount {
  readonly venue: string;
  readonly custody: Map<string, Account>;  // asset symbol -> custody account
  readonly cash: Map<string, Account>;     // fiat symbol  -> cash account
}

export function openExchange(venue: string, assets: string[], fiats: string[] = ['USD']): ExchangeAccount {
  const custody = new Map<string, Account>();
  const cash = new Map<string, Account>();
  for (const a of assets) custody.set(a.toUpperCase(), custodyAccount(venue, a));
  for (const f of fiats) cash.set(f.toUpperCase(), cashAccount(venue, f));
  return { venue, custody, cash };
}

/**
 * Flat chart of accounts for a venue: custody + settlement clearing for each asset,
 * cash + clearing for each fiat. Useful for registering a ChartOfAccounts up front.
 */
export function exchangeChart(venue: string, assets: string[], fiats: string[] = ['USD']): Account[] {
  const out: Account[] = [];
  for (const a of assets) { out.push(custodyAccount(venue, a), clearingAccount(venue, a)); }
  for (const f of fiats) { out.push(cashAccount(venue, f), clearingAccount(venue, f)); }
  return out;
}
