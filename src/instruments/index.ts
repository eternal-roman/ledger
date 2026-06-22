import { registerScaleResolver } from '../core/money.js';
import { AssetRegistry } from './registry.js';

export * from './asset.js';
export * from './registry.js';

/**
 * Wire an AssetRegistry into Money's scale resolver so that asset amounts
 * (BTC, ETH, AAPL, …) carry their correct decimal scale. Idempotent: a later
 * call replaces the active registry. Pass `undefined` to clear (back to fiat-only).
 *
 * Determinism: install a frozen registry once, before posting, and persist it
 * alongside any serialized Ledger so asset Money rehydrates at the same scale.
 */
export function installAssetScales(registry: AssetRegistry | undefined): void {
  registerScaleResolver(registry ? (sym) => registry.scaleOf(sym) : undefined);
}
