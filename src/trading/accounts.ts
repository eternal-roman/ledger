import { Account, AccountType } from '../core/account.js';

/**
 * Account-naming conventions for trading / custody / settlement.
 *
 * Every account maps onto one of the kernel's five existing AccountTypes — we add
 * NO new AccountType (that would ripple through normalBalance, the fundamental
 * equation, and serialization). Structure lives in the account *code* instead.
 *
 * Codes:
 *   CUST:{VENUE}:{ASSET}   Asset      — custody holding of an asset at a venue
 *   CASH:{VENUE}:{FIAT}    Asset      — settlement cash at a venue
 *   CLR:{VENUE}:{ASSET}    Liability  — per-asset cross-currency settlement clearing
 *   TRANSIT:{ASSET}        Asset      — in-flight transfer (sent, not yet received)
 *   FEE:TRADE:{VENUE}      Expense    — trading fees
 *   FEE:NET:{ASSET}        Expense    — on-chain / network fees
 *   REBATE:{VENUE}         Income     — maker rebates
 *   PNL:REAL:{ASSET}       Income     — realized gains (a loss is a debit here)
 *   PNL:UNREAL:{ASSET}     Income     — unrealized (mark-to-market) gains
 *   RESERVE:REVAL:{ASSET}  Equity     — revaluation reserve (MTM offset)
 *   FUNDING:OWNER          Equity     — external funding (deposits/withdrawals)
 */

function norm(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

export function custodyAccount(venue: string, asset: string): Account {
  const v = norm(venue), a = norm(asset);
  return new Account(`CUST:${v}:${a}`, `${a} custody @ ${v}`, AccountType.Asset);
}

export function cashAccount(venue: string, fiat: string): Account {
  const v = norm(venue), f = norm(fiat);
  return new Account(`CASH:${v}:${f}`, `${f} cash @ ${v}`, AccountType.Asset);
}

export function clearingAccount(venue: string, asset: string): Account {
  const v = norm(venue), a = norm(asset);
  return new Account(`CLR:${v}:${a}`, `${a} settlement clearing @ ${v}`, AccountType.Liability);
}

export function inTransitAccount(asset: string): Account {
  const a = norm(asset);
  return new Account(`TRANSIT:${a}`, `${a} in transit`, AccountType.Asset);
}

export function tradingFeeAccount(venue: string): Account {
  const v = norm(venue);
  return new Account(`FEE:TRADE:${v}`, `Trading fees @ ${v}`, AccountType.Expense);
}

export function networkFeeAccount(asset: string): Account {
  const a = norm(asset);
  return new Account(`FEE:NET:${a}`, `${a} network fees`, AccountType.Expense);
}

export function rebateAccount(venue: string): Account {
  const v = norm(venue);
  return new Account(`REBATE:${v}`, `Maker rebates @ ${v}`, AccountType.Income);
}

export function realizedPnlAccount(asset: string): Account {
  const a = norm(asset);
  return new Account(`PNL:REAL:${a}`, `Realized P&L ${a}`, AccountType.Income);
}

export function unrealizedPnlAccount(asset: string): Account {
  const a = norm(asset);
  return new Account(`PNL:UNREAL:${a}`, `Unrealized P&L ${a}`, AccountType.Income);
}

export function revaluationReserveAccount(asset: string): Account {
  const a = norm(asset);
  return new Account(`RESERVE:REVAL:${a}`, `Revaluation reserve ${a}`, AccountType.Equity);
}

export function ownerFundingAccount(): Account {
  return new Account('FUNDING:OWNER', 'Owner funding', AccountType.Equity);
}
