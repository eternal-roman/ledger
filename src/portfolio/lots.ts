import { Money, ROUND_HALF_UP } from '../core/money.js';
import { Ledger } from '../core/ledger.js';
import { LOT_TAGS } from '../trading/postings.js';


export type LotMethod = 'FIFO' | 'LIFO' | 'HIFO';

/** An open tax/cost lot: remaining quantity of an asset and its remaining basis. */
export interface Lot {
  readonly id: string;            // deterministic: derived from the acquiring entry
  readonly asset: string;
  readonly acquiredDate: string;
  readonly originEntryId: string;
  readonly quantity: Money;       // remaining, in asset units
  readonly costBasis: Money;      // remaining total basis, in quote currency
}

export interface RealizedDisposal {
  readonly tradeId: string;
  readonly date: string;
  readonly asset: string;
  readonly quantity: Money;       // disposed, in asset units
  readonly proceeds: Money;       // quote
  readonly basis: Money;          // quote
  readonly gain: Money;           // quote (negative = loss)
}

export interface ReliefResult {
  readonly asset: string;
  readonly quote: string;
  readonly openLots: Lot[];
  readonly realized: RealizedDisposal[];
  readonly totalRealized: Money;  // quote
}

interface Acquire { kind: 'acquire'; date: string; entryId: string; qty: Money; basis: Money; }
interface Dispose { kind: 'dispose'; date: string; tradeId: string; qty: Money; proceeds: Money; }

/** Pull acquisition/disposal events for an asset from custody lines, in ledger order. */
function eventsFor(ledger: Ledger, asset: string): { events: (Acquire | Dispose)[]; quote: string | undefined } {
  const A = asset.toUpperCase();
  const events: (Acquire | Dispose)[] = [];
  let quote: string | undefined;
  for (const entry of ledger.entries) {
    for (const line of entry.lines) {
      const t = line.tags;
      if (!t || !t[LOT_TAGS.tradeId]) continue;
      if (line.amount.currency !== A) continue;
      if (!line.account.code.startsWith('CUST:')) continue;
      const q = t[LOT_TAGS.quote];
      if (q) {
        if (quote && quote !== q) throw new Error(`Asset ${A} has mixed quote currencies (${quote} vs ${q})`);
        quote = q;
      }
      if (t[LOT_TAGS.role] === 'acquire') {
        events.push({
          kind: 'acquire', date: entry.effectiveDate, entryId: entry.id,
          qty: line.amount, basis: Money.from(t[LOT_TAGS.costBasis]!, q!),
        });
      } else if (t[LOT_TAGS.role] === 'dispose') {
        events.push({
          kind: 'dispose', date: entry.effectiveDate, tradeId: t[LOT_TAGS.tradeId]!,
          qty: line.amount, proceeds: Money.from(t[LOT_TAGS.proceeds]!, q!),
        });
      }
    }
  }
  return { events, quote };
}

/** Choose the next lot index to relieve under the method (lots kept in acquisition order). */
function pickLot(lots: Lot[], method: LotMethod): number {
  if (lots.length === 0) return -1;
  if (method === 'FIFO') return 0;
  if (method === 'LIFO') return lots.length - 1;
  // HIFO: highest cost-basis-per-unit first (tax-loss-harvesting style), deterministic tie-break by id.
  let best = 0;
  let bestPer = lots[0].costBasis.toDecimal().div(lots[0].quantity.toDecimal());
  for (let i = 1; i < lots.length; i++) {
    const per = lots[i].costBasis.toDecimal().div(lots[i].quantity.toDecimal());
    if (per.cmp(bestPer) > 0 || (per.cmp(bestPer) === 0 && lots[i].id < lots[best].id)) {
      best = i; bestPer = per;
    }
  }
  return best;
}

/**
 * Reconstruct open lots and realized P&L for one asset from the immutable ledger.
 * Pure, deterministic projection — no parallel state. Fails closed on oversell.
 */
export function reliefFor(ledger: Ledger, asset: string, method: LotMethod = 'FIFO'): ReliefResult {
  const A = asset.toUpperCase();
  const { events, quote } = eventsFor(ledger, A);
  const q = quote ?? 'USD';
  const quoteScale = Money.zero(q).scale;
  const lots: Lot[] = [];
  const realized: RealizedDisposal[] = [];
  let totalRealized = Money.zero(q);
  let acquireSeq = 0;

  for (const ev of events) {
    if (ev.kind === 'acquire') {
      lots.push({
        id: `${ev.entryId}#${acquireSeq++}`, asset: A,
        acquiredDate: ev.date, originEntryId: ev.entryId,
        quantity: ev.qty, costBasis: ev.basis,
      });
      continue;
    }
    // dispose: relieve qty across lots per method
    let remaining = ev.qty.toDecimal();
    const proceedsTotal = ev.proceeds.toDecimal();
    const qtyTotal = ev.qty.toDecimal();
    let basisSum = Money.zero(q);
    let proceedsAllocated = Money.zero(q);

    while (remaining.gt(0)) {
      const idx = pickLot(lots, method);
      if (idx < 0) {
        throw new Error(`Oversell of ${A}: disposal ${ev.tradeId} exceeds held quantity`);
      }
      const lot = lots[idx];
      const lotQty = lot.quantity.toDecimal();
      const take = remaining.gte(lotQty) ? lotQty : remaining;
      const full = take.gte(lotQty);

      // Basis for the slice: whole remaining basis if lot fully consumed, else proportional.
      const basisTake = full
        ? lot.costBasis
        : Money.from(lot.costBasis.toDecimal().mul(take).div(lotQty).toDecimalPlaces(quoteScale, ROUND_HALF_UP).toString(), q);
      // Proceeds for the slice: proportional, with the final slice taking the remainder
      // so disposal proceeds reconcile exactly to the tagged total.
      const isLastSlice = remaining.minus(take).lte(0);
      const proceedsTake = isLastSlice
        ? ev.proceeds.sub(proceedsAllocated)
        : Money.from(proceedsTotal.mul(take).div(qtyTotal).toDecimalPlaces(quoteScale, ROUND_HALF_UP).toString(), q);

      basisSum = basisSum.add(basisTake);
      proceedsAllocated = proceedsAllocated.add(proceedsTake);

      // shrink or remove the lot
      if (full) {
        lots.splice(idx, 1);
      } else {
        lots[idx] = {
          ...lot,
          quantity: Money.from(lotQty.minus(take).toString(), A),
          costBasis: lot.costBasis.sub(basisTake),
        };
      }
      remaining = remaining.minus(take);
    }

    const gain = ev.proceeds.sub(basisSum);
    realized.push({
      tradeId: ev.tradeId, date: ev.date, asset: A,
      quantity: ev.qty, proceeds: ev.proceeds, basis: basisSum, gain,
    });
    totalRealized = totalRealized.add(gain);
  }

  return { asset: A, quote: q, openLots: lots, realized, totalRealized };
}

/** Open lots for an asset (convenience). */
export function buildLots(ledger: Ledger, asset: string, method: LotMethod = 'FIFO'): Lot[] {
  return reliefFor(ledger, asset, method).openLots;
}
