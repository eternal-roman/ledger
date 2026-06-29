import { Money } from '../core/money.js';
import { JournalEntry, makeLine, createEntry } from '../core/journal.js';
import { custodyAccount, networkFeeAccount, inTransitAccount } from '../trading/accounts.js';

/**
 * Move an asset between two venues in a single settled entry (same asset currency,
 * so no FX bridge). The network fee is burned: the receiver gets amount − fee.
 *   Dr CUST:to (amount - fee) + Dr FEE:NET fee  /  Cr CUST:from amount
 */
export function transferToEntries(
  id: string, effectiveDate: string,
  fromVenue: string, toVenue: string,
  amount: Money, fee?: Money, description?: string,
): JournalEntry[] {
  const asset = amount.currency;
  if (fee && fee.currency !== asset) throw new Error('transfer fee must be in the asset currency');
  const f = fee ?? Money.zero(asset);
  const received = amount.sub(f);
  if (received.toDecimal().lte(0)) throw new Error('transfer fee exceeds amount');

  const lines = [makeLine(custodyAccount(toVenue, asset), received, 'debit')];
  if (!f.isZero()) lines.push(makeLine(networkFeeAccount(asset), f, 'debit'));
  lines.push(makeLine(custodyAccount(fromVenue, asset), amount, 'credit'));

  return [createEntry(id, effectiveDate, lines,
    description ?? `Transfer ${amount.toString()} ${fromVenue}->${toVenue}`)];
}

/**
 * Two-phase transfer for in-flight settlement. `transferSend` debits an in-transit
 * account on the send date; `transferReceive` credits it on arrival, net of fee.
 * The in-transit account nets to zero once the transfer completes.
 */
export function transferSend(
  id: string, effectiveDate: string, fromVenue: string, amount: Money, description?: string,
): JournalEntry {
  const asset = amount.currency;
  return createEntry(id, effectiveDate, [
    makeLine(inTransitAccount(asset), amount, 'debit'),
    makeLine(custodyAccount(fromVenue, asset), amount, 'credit'),
  ], description ?? `Send ${amount.toString()} from ${fromVenue} (in transit)`);
}

export function transferReceive(
  id: string, effectiveDate: string, toVenue: string, amount: Money, fee?: Money, description?: string,
): JournalEntry {
  const asset = amount.currency;
  if (fee && fee.currency !== asset) throw new Error('transfer fee must be in the asset currency');
  const f = fee ?? Money.zero(asset);
  const received = amount.sub(f);
  if (received.toDecimal().lte(0)) throw new Error('transfer fee exceeds amount');

  const lines = [makeLine(custodyAccount(toVenue, asset), received, 'debit')];
  if (!f.isZero()) lines.push(makeLine(networkFeeAccount(asset), f, 'debit'));
  lines.push(makeLine(inTransitAccount(asset), amount, 'credit'));

  return createEntry(id, effectiveDate, lines,
    description ?? `Receive ${received.toString()} at ${toVenue}`);
}
