import { Money } from '../core/money.js';
import { PortfolioValuation, PriceBook } from '../portfolio/valuation.js';
import { OrderSide } from '../trading/types.js';
import { TargetAllocation } from './allocation.js';

const ROUND_HALF_UP = 4;

export interface RebalanceTrade {
  readonly asset: string;
  readonly side: OrderSide;
  readonly quantity: Money;   // in asset units
  readonly estValue: Money;   // in reporting currency
}

export interface RebalancePlan {
  readonly reportingCurrency: string;
  readonly total: Money;
  readonly trades: RebalanceTrade[];
  readonly skipped: string[]; // assets that need trading but lack a price mark
}

export interface RebalanceOptions {
  /** Skip trades whose absolute reporting-currency value is below this. */
  readonly minTrade?: Money;
  /** Tolerance band (decimal string, e.g. '0.02'): skip if |currentWeight - targetWeight| < band. */
  readonly band?: string;
}

/**
 * Plan trades to move a portfolio toward target weights. PLAN ONLY — it emits
 * intended trades; execute them through `fillToEntries`. Target values are split
 * with `Money.allocate`, so they sum back to NAV exactly (kernel invariant reuse).
 * The reporting currency itself is treated as the residual cash sleeve (not traded).
 */
export function planRebalance(
  valuation: PortfolioValuation,
  target: TargetAllocation,
  book: PriceBook,
  opts: RebalanceOptions = {},
): RebalancePlan {
  const RC = valuation.reportingCurrency;
  const total = valuation.total;
  const valueOf = new Map(valuation.holdings.map(h => [h.asset, h.value]));

  const assets = [...new Set([...Object.keys(target.weights).map(a => a.toUpperCase()), ...valueOf.keys()])].sort();
  const ratios = assets.map(a => target.weights[a] ?? target.weights[a.toLowerCase()] ?? '0');
  const targetValues = total.allocate(ratios);

  const trades: RebalanceTrade[] = [];
  const skipped: string[] = [];
  const totalDec = total.toDecimal();

  assets.forEach((asset, i) => {
    if (asset === RC) return; // cash sleeve adjusts residually
    const targetVal = targetValues[i];
    const currentVal = valueOf.get(asset) ?? Money.zero(RC);
    const delta = targetVal.sub(currentVal);
    if (delta.isZero()) return;

    if (opts.band && !totalDec.isZero()) {
      const curW = currentVal.toDecimal().div(totalDec);
      const tgtW = targetVal.toDecimal().div(totalDec);
      if (curW.sub(tgtW).abs().lt(opts.band)) return;
    }
    if (opts.minTrade && delta.abs().compare(opts.minTrade) < 0) return;

    const mark = book.markFor(asset, valuation.asOf);
    if (!mark) { skipped.push(asset); return; }

    const assetScale = Money.zero(asset).scale;
    const qtyDec = delta.abs().toDecimal().div(mark.price.toDecimal()).toDecimalPlaces(assetScale, ROUND_HALF_UP);
    if (qtyDec.isZero()) return;
    const quantity = Money.from(qtyDec.toString(), asset);
    const estValue = mark.price.mul(quantity.toDecimal().toString(), ROUND_HALF_UP);
    trades.push({ asset, side: delta.toDecimal().gt(0) ? 'buy' : 'sell', quantity, estValue });
  });

  return { reportingCurrency: RC, total, trades, skipped };
}
