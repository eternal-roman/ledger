/**
 * Stub for small bank ledger example using rules + knowledge.
 */
import { Money, Account, AccountType, createBalancedEntry, emptyLedger, validateAssetRecognition, loadDefaultKnowledge } from '../src/index.js';

const loans = new Account('120', 'Loans Receivable', AccountType.Asset);
const deposits = new Account('200', 'Customer Deposits', AccountType.Liability);
const capital = new Account('300', 'Bank Capital', AccountType.Equity);

export function buildBasicBank() {
  let ledger = emptyLedger();
  const g = loadDefaultKnowledge();

  const entry = createBalancedEntry('loan1', '2026-06-21', loans, deposits, Money.from(100000, 'USD'), 'Issue loan funded by deposit');
  ledger = ledger.apply(entry).ledger;

  const ruleCheck = validateAssetRecognition(entry, g);
  console.log('Rule check ok:', ruleCheck.ok, 'citations:', ruleCheck.citations.length);

  console.log('Verify equation:', ledger.verifyFundamentalEquation());
  return ledger;
}

if (import.meta.main) buildBasicBank();
