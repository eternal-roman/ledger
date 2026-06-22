import { Money } from '../core/money.js';

export type OrderSide = 'buy' | 'sell';
export type LiquidityRole = 'maker' | 'taker';

/**
 * A single executed fill. Pure data — no posting logic. `quantity` and `price`
 * are Money (never floats): quantity in the base asset, price as quote-per-1-base.
 *
 * Fees are modelled explicitly. A normal fee is expensed; a maker `rebate`
 * (mutually exclusive with `fee`) is booked as income. Both are in the quote currency.
 */
export interface Fill {
  readonly id: string;
  readonly effectiveDate: string;   // ISO YYYY-MM-DD (kernel constraint)
  readonly venue: string;           // exchange id, drives custody/cash account naming
  readonly base: string;            // asset symbol, e.g. 'BTC'
  readonly quote: string;           // settlement asset, e.g. 'USD'
  readonly side: OrderSide;
  readonly quantity: Money;         // in base units (e.g. 0.5 BTC)
  readonly price: Money;            // quote per 1 base (e.g. 60000 USD)
  readonly fee?: Money;             // taker/maker fee paid, in quote (expensed)
  readonly rebate?: Money;          // maker rebate received, in quote (income)
  readonly liquidity?: LiquidityRole;
}

export interface PostingOptions {
  /** Extra citations to attach to the produced entries. */
  readonly citations?: string[];
  /** Lot-relief method recorded on disposals (default 'FIFO'). */
  readonly lotMethod?: string;
}
