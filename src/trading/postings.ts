import { Money, ROUND_HALF_UP } from '../core/money.js';
import { JournalEntry, JournalEntryLine, makeLine, createEntry, createBalancedEntry } from '../core/journal.js';
import { Fill, PostingOptions } from './types.js';
import {
  custodyAccount, cashAccount, clearingAccount, tradingFeeAccount,
  rebateAccount, ownerFundingAccount,
} from './accounts.js';


/**
 * Lot-tracking metadata carried in line tags. These flow into the kernel's
 * auditHash (tags are hashed), so cost basis is itself tamper-evident, and lots
 * can be reconstructed from the ledger alone with no external state.
 */
export const LOT_TAGS = {
  tradeId: 'tradeId',
  role: 'lotRole',        // 'acquire' | 'dispose'
  quote: 'lotQuote',      // settlement currency for basis/proceeds
  costBasis: 'costBasis', // total quote notional acquired (exact string)
  proceeds: 'proceeds',   // total quote notional realized (exact string)
  method: 'lotMethod',
} as const;

/** Exact quote notional for a fill: price-per-unit × quantity, rounded to quote scale. */
export function notionalOf(fill: Fill): Money {
  if (fill.price.currency !== fill.quote) {
    throw new Error(`Fill ${fill.id}: price currency ${fill.price.currency} != quote ${fill.quote}`);
  }
  // price is Money in quote currency; multiply by the (exact) base quantity.
  return fill.price.mul(fill.quantity.toDecimal().toString(), ROUND_HALF_UP);
}

/**
 * Convert a fill into balanced journal entries.
 *
 * A cross-currency trade can't live in one entry (the kernel rejects CURRENCY_MIX),
 * so we emit two single-currency legs bridged by per-asset clearing accounts:
 *   base leg  (in base currency):  moves the asset in/out of custody
 *   quote leg (in quote currency): moves cash, with the fee/rebate balancing within
 *
 * Fees are expensed (FEE:TRADE) and rebates booked as income (REBATE); cost basis
 * is the notional only. The acquisition/disposal custody line carries lot tags.
 */
export function fillToEntries(fill: Fill, opts: PostingOptions = {}): JournalEntry[] {
  if (fill.base === fill.quote) throw new Error(`Fill ${fill.id}: base and quote must differ`);
  if (fill.fee && fill.rebate) throw new Error(`Fill ${fill.id}: provide fee OR rebate, not both`);
  if (fill.fee && fill.fee.currency !== fill.quote) throw new Error(`Fill ${fill.id}: fee must be in quote currency`);
  if (fill.rebate && fill.rebate.currency !== fill.quote) throw new Error(`Fill ${fill.id}: rebate must be in quote currency`);

  const notional = notionalOf(fill);
  const cust = custodyAccount(fill.venue, fill.base);
  const clrBase = clearingAccount(fill.venue, fill.base);
  const clrQuote = clearingAccount(fill.venue, fill.quote);
  const cash = cashAccount(fill.venue, fill.quote);
  const feeAcct = tradingFeeAccount(fill.venue);
  const rebAcct = rebateAccount(fill.venue);
  const method = opts.lotMethod ?? 'FIFO';
  const cites = opts.citations;

  const fee = fill.fee ?? Money.zero(fill.quote);
  const rebate = fill.rebate ?? Money.zero(fill.quote);

  if (fill.side === 'buy') {
    // base leg: receive asset into custody
    const baseLeg = createEntry(`${fill.id}-base`, fill.effectiveDate, [
      makeLine(cust, fill.quantity, 'debit', {
        [LOT_TAGS.tradeId]: fill.id, [LOT_TAGS.role]: 'acquire',
        [LOT_TAGS.quote]: fill.quote, [LOT_TAGS.costBasis]: notional.toDecimal().toString(),
        [LOT_TAGS.method]: method,
      }),
      makeLine(clrBase, fill.quantity, 'credit'),
    ], `Buy ${fill.quantity.toString()} ${fill.base} @ ${fill.price.toString()} (base leg)`, cites);

    // quote leg: pay cash = notional + fee - rebate
    const cashOut = notional.add(fee).sub(rebate);
    const quoteLines: JournalEntryLine[] = [makeLine(clrQuote, notional, 'debit')];
    if (!fee.isZero()) quoteLines.push(makeLine(feeAcct, fee, 'debit'));
    quoteLines.push(makeLine(cash, cashOut, 'credit'));
    if (!rebate.isZero()) quoteLines.push(makeLine(rebAcct, rebate, 'credit'));
    const quoteLeg = createEntry(`${fill.id}-quote`, fill.effectiveDate, quoteLines,
      `Buy ${fill.base} settlement (quote leg)`, cites);

    return [baseLeg, quoteLeg];
  }

  // sell: release asset from custody
  const baseLeg = createEntry(`${fill.id}-base`, fill.effectiveDate, [
    makeLine(clrBase, fill.quantity, 'debit'),
    makeLine(cust, fill.quantity, 'credit', {
      [LOT_TAGS.tradeId]: fill.id, [LOT_TAGS.role]: 'dispose',
      [LOT_TAGS.quote]: fill.quote, [LOT_TAGS.proceeds]: notional.toDecimal().toString(),
      [LOT_TAGS.method]: method,
    }),
  ], `Sell ${fill.quantity.toString()} ${fill.base} @ ${fill.price.toString()} (base leg)`, cites);

  // quote leg: receive cash = notional - fee + rebate
  const cashIn = notional.sub(fee).add(rebate);
  const quoteLines: JournalEntryLine[] = [makeLine(cash, cashIn, 'debit')];
  if (!fee.isZero()) quoteLines.push(makeLine(feeAcct, fee, 'debit'));
  quoteLines.push(makeLine(clrQuote, notional, 'credit'));
  if (!rebate.isZero()) quoteLines.push(makeLine(rebAcct, rebate, 'credit'));
  const quoteLeg = createEntry(`${fill.id}-quote`, fill.effectiveDate, quoteLines,
    `Sell ${fill.base} settlement (quote leg)`, cites);

  return [baseLeg, quoteLeg];
}

/**
 * Deposit external cash into a venue: Dr CASH:venue:fiat / Cr FUNDING:OWNER (equity).
 * Single-currency, no FX bridge needed.
 */
export function depositToEntry(
  id: string, effectiveDate: string, venue: string, amount: Money, description?: string,
): JournalEntry {
  return createBalancedEntry(
    id, effectiveDate,
    cashAccount(venue, amount.currency), ownerFundingAccount(),
    amount, description ?? `Deposit ${amount.toString()} to ${venue}`,
  );
}

/** Withdraw cash from a venue: Dr FUNDING:OWNER / Cr CASH:venue:fiat. */
export function withdrawalToEntry(
  id: string, effectiveDate: string, venue: string, amount: Money, description?: string,
): JournalEntry {
  return createBalancedEntry(
    id, effectiveDate,
    ownerFundingAccount(), cashAccount(venue, amount.currency),
    amount, description ?? `Withdraw ${amount.toString()} from ${venue}`,
  );
}
