import { Money, ROUND_HALF_UP } from '../core/money.js';
import { Ledger } from '../core/ledger.js';
import { Lot, LotMethod, reliefFor, RealizedDisposal } from './lots.js';
import { PriceMark } from './valuation.js';


export interface RealizedPnL {
  readonly asset: string;
  readonly quote: string;
  readonly total: Money;
  readonly byDisposal: RealizedDisposal[];
}

/** Realized gains/losses for an asset, re-derived from the immutable ledger. */
export function realizedPnL(ledger: Ledger, asset: string, method: LotMethod = 'FIFO'): RealizedPnL {
  const r = reliefFor(ledger, asset, method);
  return { asset: r.asset, quote: r.quote, total: r.totalRealized, byDisposal: r.realized };
}

export interface UnrealizedPnL {
  readonly asset: string;
  readonly quote: string;
  readonly quantity: Money;
  readonly marketValue: Money;
  readonly costBasis: Money;
  readonly unrealized: Money;   // marketValue - costBasis (negative = loss)
  readonly markSource: string;
}

/** Unrealized P&L for a set of open lots against an explicit, cited mark. Pure projection. */
export function unrealizedPnL(openLots: Lot[], mark: PriceMark): UnrealizedPnL {
  if (!mark.source) throw new Error('unrealizedPnL requires a cited mark');
  const quote = mark.quote;
  let qty = Money.zero(openLots[0]?.asset ?? mark.asset);
  let cost = Money.zero(quote);
  for (const lot of openLots) {
    if (lot.asset !== mark.asset.toUpperCase()) {
      throw new Error(`Lot asset ${lot.asset} != mark asset ${mark.asset}`);
    }
    qty = qty.add(lot.quantity);
    cost = cost.add(lot.costBasis);
  }
  const marketValue = mark.price.mul(qty.toDecimal().toString(), ROUND_HALF_UP);
  return {
    asset: mark.asset.toUpperCase(), quote,
    quantity: qty, marketValue, costBasis: cost,
    unrealized: marketValue.sub(cost), markSource: mark.source,
  };
}
