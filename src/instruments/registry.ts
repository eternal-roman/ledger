import { AssetSpec, makeAssetSpec } from './asset.js';

/**
 * Immutable registry of asset specs (dedupe by key, pure `add`, JSON roundtrip).
 * Its `scaleOf` is the source of truth wired into Money's scale resolver via
 * `installAssetScales`.
 */
export class AssetRegistry {
  private readonly _assets: ReadonlyMap<string, AssetSpec>;

  constructor(assets: AssetSpec[] = []) {
    const map = new Map<string, AssetSpec>();
    for (const a of assets) {
      const spec = makeAssetSpec(a);
      if (map.has(spec.symbol)) {
        throw new Error(`Duplicate asset symbol in AssetRegistry: ${spec.symbol}`);
      }
      map.set(spec.symbol, spec);
    }
    this._assets = map;
  }

  get(symbol: string): AssetSpec | undefined {
    return this._assets.get(symbol.toUpperCase());
  }

  /** Scale for a symbol, or undefined if not registered (Money then falls back). */
  scaleOf(symbol: string): number | undefined {
    return this._assets.get(symbol.toUpperCase())?.scale;
  }

  has(symbol: string): boolean {
    return this._assets.has(symbol.toUpperCase());
  }

  /** Pure: returns a new registry with the asset added (throws on duplicate). */
  add(spec: AssetSpec): AssetRegistry {
    return new AssetRegistry([...this._assets.values(), spec]);
  }

  list(): readonly AssetSpec[] {
    return Object.freeze([...this._assets.values()]);
  }

  toJSON(): { v: string; assets: AssetSpec[] } {
    return { v: '1', assets: [...this._assets.values()] };
  }

  static fromJSON(j: any): AssetRegistry {
    if (!j || j.v !== '1' || !Array.isArray(j.assets)) {
      throw new Error('AssetRegistry.fromJSON: invalid or unsupported shape');
    }
    return new AssetRegistry(j.assets);
  }
}

/**
 * A practical default registry covering common crypto, stablecoins, and fiat.
 * Fiat scales here mirror Money's built-in fiat map (so installing this changes
 * nothing for fiat); they exist only so AssetRegistry can describe a full chart.
 */
export function defaultAssetRegistry(): AssetRegistry {
  return new AssetRegistry([
    // Fiat (descriptive; Money already knows these)
    { symbol: 'USD', scale: 2, class: 'fiat', displayName: 'US Dollar' },
    { symbol: 'EUR', scale: 2, class: 'fiat', displayName: 'Euro' },
    { symbol: 'GBP', scale: 2, class: 'fiat', displayName: 'Pound Sterling' },
    { symbol: 'JPY', scale: 0, class: 'fiat', displayName: 'Japanese Yen' },
    // Crypto
    { symbol: 'BTC', scale: 8, class: 'crypto', displayName: 'Bitcoin' },
    { symbol: 'ETH', scale: 18, class: 'crypto', displayName: 'Ether' },
    { symbol: 'SOL', scale: 9, class: 'crypto', displayName: 'Solana' },
    { symbol: 'ADA', scale: 6, class: 'crypto', displayName: 'Cardano' },
    // Stablecoins
    { symbol: 'USDT', scale: 6, class: 'stablecoin', displayName: 'Tether' },
    { symbol: 'USDC', scale: 6, class: 'stablecoin', displayName: 'USD Coin' },
    // Equities (fractional shares to 4 dp is common at retail brokers)
    { symbol: 'AAPL', scale: 4, class: 'equity', displayName: 'Apple Inc.' },
    { symbol: 'SPY', scale: 4, class: 'fund', displayName: 'SPDR S&P 500 ETF' },
  ]);
}
