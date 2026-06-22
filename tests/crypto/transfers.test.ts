import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Money, registerScaleResolver } from '../../src/core/money.js';
import { emptyLedger } from '../../src/core/ledger.js';
import { validateEntry } from '../../src/core/journal.js';
import { defaultAssetRegistry, installAssetScales } from '../../src/instruments/index.js';
import { depositToEntry, fillToEntries, custodyAccount, networkFeeAccount, inTransitAccount } from '../../src/trading/index.js';
import { transferToEntries, transferSend, transferReceive } from '../../src/crypto/index.js';

beforeAll(() => installAssetScales(defaultAssetRegistry()));
afterAll(() => registerScaleResolver(undefined));

function seedBtc() {
  let l = emptyLedger();
  l = l.apply(depositToEntry('d', '2026-06-22', 'KRAKEN', Money.from('60000', 'USD'))).ledger;
  for (const e of fillToEntries({ id: 'b', effectiveDate: '2026-06-22', venue: 'KRAKEN',
    base: 'BTC', quote: 'USD', side: 'buy', quantity: Money.from('1', 'BTC'), price: Money.from('60000', 'USD') })) {
    l = l.apply(e).ledger;
  }
  return l;
}

describe('inter-exchange transfers', () => {
  it('one-shot transfer burns the network fee and keeps the equation', () => {
    let l = seedBtc();
    const entries = transferToEntries('t1', '2026-06-23', 'KRAKEN', 'COINBASE',
      Money.from('1', 'BTC'), Money.from('0.0001', 'BTC'));
    for (const e of entries) expect(validateEntry(e).ok).toBe(true);
    l = l.apply(entries[0]).ledger;

    expect(l.verifyFundamentalEquation()).toBe(true);
    expect(l.balance(custodyAccount('KRAKEN', 'BTC'), undefined, 'BTC').toString()).toBe('0.00000000 BTC');
    expect(l.balance(custodyAccount('COINBASE', 'BTC'), undefined, 'BTC').toString()).toBe('0.99990000 BTC');
    expect(l.balance(networkFeeAccount('BTC'), undefined, 'BTC').toString()).toBe('0.00010000 BTC');
  });

  it('two-phase transfer nets the in-transit account to zero on completion', () => {
    let l = seedBtc();
    l = l.apply(transferSend('snd', '2026-06-23', 'KRAKEN', Money.from('1', 'BTC'))).ledger;
    expect(l.balance(inTransitAccount('BTC'), undefined, 'BTC').toString()).toBe('1.00000000 BTC');
    l = l.apply(transferReceive('rcv', '2026-06-24', 'COINBASE', Money.from('1', 'BTC'), Money.from('0.0001', 'BTC'))).ledger;
    expect(l.balance(inTransitAccount('BTC'), undefined, 'BTC').toString()).toBe('0.00000000 BTC');
    expect(l.balance(custodyAccount('COINBASE', 'BTC'), undefined, 'BTC').toString()).toBe('0.99990000 BTC');
    expect(l.verifyFundamentalEquation()).toBe(true);
  });

  it('rejects a fee that exceeds the amount', () => {
    expect(() => transferToEntries('t', '2026-06-23', 'A', 'B', Money.from('0.0001', 'BTC'), Money.from('0.001', 'BTC')))
      .toThrow(/exceeds/i);
  });
});
