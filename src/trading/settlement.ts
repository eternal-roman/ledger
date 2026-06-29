import { Money } from '../core/money.js';
import { JournalEntry, JournalEntryLine, makeLine, createEntry, createBalancedEntry, isISODate } from '../core/journal.js';
import { Fill, PostingOptions } from './types.js';
import { notionalOf, LOT_TAGS } from './postings.js';
import {
  custodyAccount, clearingAccount, cashAccount, tradingFeeAccount, rebateAccount,
  settlementReceivableAccount, settlementPayableAccount,
} from './accounts.js';

/**
 * Settlement-date (T+N) accounting for a fill.
 *
 * Regulated venues recognize a trade on the trade date but move cash only on the
 * later settlement date (T+1 equities, T+2 FX, …). Spot `fillToEntries` collapses
 * both into one moment. `settleFill` splits the cash leg in time:
 *
 *   trade date  — asset moves into/out of custody; the cash leg is booked against
 *                 a settlement receivable (sell) or payable (buy) instead of cash.
 *   settlement  — the receivable/payable is swapped for actual cash, netting it to
 *                 zero. Cash only moves on this date.
 *
 * The economic result after both dates is identical to the spot posting — this is
 * purely a faithful timing decomposition, every leg balanced and kernel-validated.
 */
export interface SettlementResult {
  /** Entries effective on the trade date (base custody leg + quote leg via receivable/payable). */
  readonly tradeDate: JournalEntry[];
  /** Entries effective on the settlement date (swap receivable/payable for cash). */
  readonly settlement: JournalEntry[];
  /** Net cash that settles (notional ± fee/rebate), in the quote currency. */
  readonly settledCash: Money;
}

export function settleFill(fill: Fill, settlementDate: string, opts: PostingOptions = {}): SettlementResult {
  if (fill.base === fill.quote) throw new Error(`Fill ${fill.id}: base and quote must differ`);
  if (fill.fee && fill.rebate) throw new Error(`Fill ${fill.id}: provide fee OR rebate, not both`);
  if (fill.fee && fill.fee.currency !== fill.quote) throw new Error(`Fill ${fill.id}: fee must be in quote currency`);
  if (fill.rebate && fill.rebate.currency !== fill.quote) throw new Error(`Fill ${fill.id}: rebate must be in quote currency`);
  if (!isISODate(settlementDate)) throw new Error(`Fill ${fill.id}: settlementDate "${settlementDate}" is not a valid ISO date`);
  if (settlementDate < fill.effectiveDate) {
    throw new Error(`Fill ${fill.id}: settlementDate ${settlementDate} is before trade date ${fill.effectiveDate}`);
  }

  const notional = notionalOf(fill);
  const cust = custodyAccount(fill.venue, fill.base);
  const clrBase = clearingAccount(fill.venue, fill.base);
  const clrQuote = clearingAccount(fill.venue, fill.quote);
  const cash = cashAccount(fill.venue, fill.quote);
  const feeAcct = tradingFeeAccount(fill.venue);
  const rebAcct = rebateAccount(fill.venue);
  const payable = settlementPayableAccount(fill.venue, fill.quote);
  const receivable = settlementReceivableAccount(fill.venue, fill.quote);
  const method = opts.lotMethod ?? 'FIFO';
  const cites = opts.citations;

  const fee = fill.fee ?? Money.zero(fill.quote);
  const rebate = fill.rebate ?? Money.zero(fill.quote);

  if (fill.side === 'buy') {
    // base leg: receive asset into custody (identical to spot)
    const baseLeg = createEntry(`${fill.id}-base`, fill.effectiveDate, [
      makeLine(cust, fill.quantity, 'debit', {
        [LOT_TAGS.tradeId]: fill.id, [LOT_TAGS.role]: 'acquire',
        [LOT_TAGS.quote]: fill.quote, [LOT_TAGS.costBasis]: notional.toDecimal().toString(),
        [LOT_TAGS.method]: method,
      }),
      makeLine(clrBase, fill.quantity, 'credit'),
    ], `Buy ${fill.quantity.toString()} ${fill.base} @ ${fill.price.toString()} (base leg, unsettled)`, cites);

    // quote leg: owe cash = notional + fee - rebate, booked as a payable (not cash yet)
    const cashOwed = notional.add(fee).sub(rebate);
    const quoteLines: JournalEntryLine[] = [makeLine(clrQuote, notional, 'debit')];
    if (!fee.isZero()) quoteLines.push(makeLine(feeAcct, fee, 'debit'));
    quoteLines.push(makeLine(payable, cashOwed, 'credit'));
    if (!rebate.isZero()) quoteLines.push(makeLine(rebAcct, rebate, 'credit'));
    const quoteLeg = createEntry(`${fill.id}-quote`, fill.effectiveDate, quoteLines,
      `Buy ${fill.base} settlement obligation (quote leg, unsettled)`, cites);

    // settlement: pay the payable with cash on the settlement date
    const settleEntry = createBalancedEntry(
      `${fill.id}-settle`, settlementDate, payable, cash, cashOwed,
      `Settle ${fill.base} purchase cash`, cites,
    );

    return { tradeDate: [baseLeg, quoteLeg], settlement: [settleEntry], settledCash: cashOwed };
  }

  // sell: release asset from custody (identical to spot)
  const baseLeg = createEntry(`${fill.id}-base`, fill.effectiveDate, [
    makeLine(clrBase, fill.quantity, 'debit'),
    makeLine(cust, fill.quantity, 'credit', {
      [LOT_TAGS.tradeId]: fill.id, [LOT_TAGS.role]: 'dispose',
      [LOT_TAGS.quote]: fill.quote, [LOT_TAGS.proceeds]: notional.toDecimal().toString(),
      [LOT_TAGS.method]: method,
    }),
  ], `Sell ${fill.quantity.toString()} ${fill.base} @ ${fill.price.toString()} (base leg, unsettled)`, cites);

  // quote leg: owed cash = notional - fee + rebate, booked as a receivable (not cash yet)
  const cashDue = notional.sub(fee).add(rebate);
  const quoteLines: JournalEntryLine[] = [makeLine(receivable, cashDue, 'debit')];
  if (!fee.isZero()) quoteLines.push(makeLine(feeAcct, fee, 'debit'));
  quoteLines.push(makeLine(clrQuote, notional, 'credit'));
  if (!rebate.isZero()) quoteLines.push(makeLine(rebAcct, rebate, 'credit'));
  const quoteLeg = createEntry(`${fill.id}-quote`, fill.effectiveDate, quoteLines,
    `Sell ${fill.base} settlement receivable (quote leg, unsettled)`, cites);

  // settlement: collect cash against the receivable on the settlement date
  const settleEntry = createBalancedEntry(
    `${fill.id}-settle`, settlementDate, cash, receivable, cashDue,
    `Settle ${fill.base} sale cash`, cites,
  );

  return { tradeDate: [baseLeg, quoteLeg], settlement: [settleEntry], settledCash: cashDue };
}
