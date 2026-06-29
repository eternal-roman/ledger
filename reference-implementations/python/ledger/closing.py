"""
Closing / Retained Earnings for Python ref (mirror of src/closing/closing.ts).

Uses trial balance style to close actual Income/Expense accounts to RE.
"""

from typing import List, Optional
from .money import Money
from .account import Account, AccountType
from .journal import create_balanced_entry, JournalEntry
from .ledger import Ledger

def create_retained_earnings_account(code: str = '3100', name: str = 'Retained Earnings') -> Account:
    return Account(code, name, AccountType.Equity)

def generate_closing_entries(ledger: Ledger, close_date: str,
                             retained_earnings: Optional[Account] = None) -> List[JournalEntry]:
    re = retained_earnings or create_retained_earnings_account()
    entries: List[JournalEntry] = []
    # Use trial-like: walk entries to find temp accounts (simplified for ref)
    temp_bals: dict = {}
    for e in ledger.entries:
        for line in e.lines:
            if line.account.type in (AccountType.Income, AccountType.Expense):
                key = (line.account.code, line.account.name, line.account.type, line.amount.currency)
                if key not in temp_bals:
                    temp_bals[key] = Money.zero(line.amount.currency)
                if line.side == 'debit':
                    temp_bals[key] = temp_bals[key].sub(line.amount)  # simplistic net
                else:
                    temp_bals[key] = temp_bals[key].add(line.amount)

    seq = 0
    for (code, name, typ, curr), bal in temp_bals.items():
        if bal.is_zero():
            continue
        temp_acct = Account(code, name, typ)
        if typ == AccountType.Income:
            # Dr income, Cr RE
            entries.append(create_balanced_entry(
                f'close-{code}-{close_date}-{seq}', close_date,
                temp_acct, re, bal,
                f'Close {name} to RE', ['gaap-closing-entries-re']
            ))
        else:
            # Dr RE, Cr expense
            entries.append(create_balanced_entry(
                f'close-{code}-{close_date}-{seq}', close_date,
                re, temp_acct, bal,
                f'Close {name} to RE', ['gaap-closing-entries-re']
            ))
        seq += 1
    return entries
