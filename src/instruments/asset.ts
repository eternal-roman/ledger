/**
 * Asset specification — the precision and class of a tradable unit.
 *
 * In this kernel a non-cash asset (a crypto coin, an equity share) is just a
 * non-fiat "currency" carried by Money. The only thing the kernel needs to treat
 * it correctly is its decimal scale (BTC=8, ETH=18, AAPL fractional shares=4),
 * which the AssetRegistry feeds to Money via the scale resolver.
 */
export type AssetClass = 'fiat' | 'crypto' | 'stablecoin' | 'equity' | 'fund' | 'bond' | 'commodity';

export interface AssetSpec {
  /** Canonical, uppercase symbol used as the Money currency code: 'BTC', 'AAPL', 'USD'. */
  readonly symbol: string;
  /** Decimal places this asset is quoted/held in (BTC=8, ETH=18, USD=2, AAPL=4). */
  readonly scale: number;
  readonly class: AssetClass;
  readonly displayName?: string;
}

/** Normalize + validate a spec (uppercased symbol, non-negative integer scale). */
export function makeAssetSpec(spec: AssetSpec): AssetSpec {
  const symbol = spec.symbol.trim().toUpperCase();
  if (!symbol) throw new Error('AssetSpec: symbol required');
  if (!Number.isInteger(spec.scale) || spec.scale < 0) {
    throw new Error(`AssetSpec ${symbol}: scale must be a non-negative integer, got ${spec.scale}`);
  }
  return Object.freeze({ ...spec, symbol });
}
