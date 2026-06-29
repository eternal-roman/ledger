import { Money, ROUND_HALF_UP } from '../core/money.js';
import { Account } from '../core/account.js';
import { Ledger } from '../core/ledger.js';


/** An explicit, sourced price mark. `source` is required — valuation is never unsourced. */
export interface PriceMark {
  readonly asset: string;   // e.g. 'BTC'
  readonly quote: string;   // currency the price is expressed in, e.g. 'USD'
  readonly price: Money;    // quote per 1 unit of asset
  readonly asOf: string;    // ISO date
  readonly source: string;  // citation / provenance (REQUIRED)
}

/** Immutable bundle of marks; `markFor` returns the latest mark on/before a date. */
export class PriceBook {
  private readonly _marks: ReadonlyMap<string, PriceMark[]>;

  constructor(marks: PriceMark[] = []) {
    const map = new Map<string, PriceMark[]>();
    for (const m of marks) {
      if (!m.source) throw new Error(`PriceMark for ${m.asset} requires a source`);
      const key = m.asset.toUpperCase();
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.asOf.localeCompare(b.asOf));
    this._marks = map;
  }

  add(mark: PriceMark): PriceBook {
    const all: PriceMark[] = [];
    for (const arr of this._marks.values()) all.push(...arr);
    all.push(mark);
    return new PriceBook(all);
  }

  markFor(asset: string, asOf?: string): PriceMark | undefined {
    const arr = this._marks.get(asset.toUpperCase());
    if (!arr || arr.length === 0) return undefined;
    if (!asOf) return arr[arr.length - 1];
    let chosen: PriceMark | undefined;
    for (const m of arr) { if (m.asOf <= asOf) chosen = m; else break; }
    return chosen;
  }
}

export interface AssetHolding {
  readonly asset: string;
  readonly quantity: Money;     // in asset units
  readonly value: Money;        // in reporting currency
  readonly markSource: string;  // '' for the reporting currency itself (face value)
}

export interface PortfolioValuation {
  readonly reportingCurrency: string;
  readonly asOf?: string;
  readonly holdings: AssetHolding[];
  readonly total: Money;        // NAV of marked holdings, in reporting currency
  readonly uncited: string[];   // assets held but lacking a price mark (excluded from total)
}

/** Net holdings per asset from custody/cash Asset accounts (one entry per currency). */
function holdingsByAsset(ledger: Ledger, asOf?: string): Map<string, Money> {
  // Dedupe accounts by code (the same code can appear as distinct instances across
  // entries; balancesByCurrency keys off code, so counting each instance double-counts).
  const accounts = new Map<string, Account>();
  for (const e of ledger.entries) {
    for (const l of e.lines) {
      if (l.account.code.startsWith('CUST:') || l.account.code.startsWith('CASH:')) {
        accounts.set(l.account.code, l.account);
      }
    }
  }
  const out = new Map<string, Money>();
  for (const acct of accounts.values()) {
    for (const bal of ledger.balancesByCurrency(acct, asOf)) {
      const cur = bal.currency;
      out.set(cur, (out.get(cur) ?? Money.zero(cur)).add(bal));
    }
  }
  return out;
}

/**
 * Value a multi-asset portfolio into a single reporting currency using cited marks.
 * Fail-closed: any held asset without a mark is listed in `uncited` and excluded from
 * the total (never silently valued at zero or a guessed price). This is a valuation
 * OVERLAY — it does not alter the historical-cost ledger or its statements.
 */
export function valuePortfolio(
  ledger: Ledger, book: PriceBook, reportingCurrency: string, asOf?: string,
): PortfolioValuation {
  const RC = reportingCurrency.toUpperCase();
  const holdings: AssetHolding[] = [];
  const uncited: string[] = [];
  let total = Money.zero(RC);

  const byAsset = holdingsByAsset(ledger, asOf);
  for (const asset of [...byAsset.keys()].sort()) {
    const qty = byAsset.get(asset)!;
    if (qty.isZero()) continue;
    if (asset === RC) {
      holdings.push({ asset, quantity: qty, value: qty, markSource: '' });
      total = total.add(qty);
      continue;
    }
    const mark = book.markFor(asset, asOf);
    if (!mark) { uncited.push(asset); continue; }
    if (mark.quote.toUpperCase() !== RC) {
      throw new Error(`Mark for ${asset} is quoted in ${mark.quote}, not reporting currency ${RC}`);
    }
    const value = mark.price.mul(qty.toDecimal().toString(), ROUND_HALF_UP);
    holdings.push({ asset, quantity: qty, value, markSource: mark.source });
    total = total.add(value);
  }

  return { reportingCurrency: RC, asOf, holdings, total, uncited };
}
