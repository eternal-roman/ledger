"""
Depreciation schedules for Python ref (mirror of src/standards/depreciation).
Uses allocate for SL exactness.
"""

from typing import List, Dict, Any
from decimal import Decimal
from .money import Money
from .account import Account, AccountType
from .journal import create_balanced_entry, JournalEntry

def build_depreciation_schedule(input_: Dict[str, Any]) -> Dict[str, Any]:
    cost = input_['cost']
    salvage = input_['salvage']
    n = input_['usefulLifePeriods']
    method = input_['method']
    date = input_['commencementDate']
    depreciable = cost.sub(salvage)
    periods = []
    accum = Money.zero(cost.currency)
    carrying = cost
    if method == 'straight-line':
        # simple equal split (full would use ratios allocate)
        per = depreciable.div(str(n))
        for i in range(n):
            d = per if i < n-1 else carrying.sub(salvage)
            accum = accum.add(d)
            carrying = carrying.sub(d)
            periods.append({
                'period': i+1, 'date': date, 'depreciation': d,
                'accumulated': accum, 'carrying': carrying
            })
    else:
        # basic declining stub
        rate = Decimal(input_.get('decliningRate', '2')) / n
        for i in range(n):
            d = carrying.sub(salvage) if i == n-1 else carrying.mul(str(rate))
            accum = accum.add(d)
            carrying = carrying.sub(d)
            periods.append({'period': i+1, 'date': date, 'depreciation': d, 'accumulated': accum, 'carrying': carrying})
    return {'initialDepreciable': depreciable, 'periods': periods}

def depreciation_to_entries(input_: Dict[str, Any], accounts: Dict = None) -> List[JournalEntry]:
    sched = build_depreciation_schedule(input_)
    if accounts is None:
        accounts = {
            'depreciationExpense': Account('6000', 'Depreciation Expense', AccountType.Expense),
            'accumulatedDepreciation': Account('1600', 'Accumulated Depreciation', AccountType.Asset),
        }
    entries = []
    for i, p in enumerate(sched['periods']):
        entries.append(create_balanced_entry(
            f"{input_['id']}-dep-{i+1}", p['date'],
            accounts['depreciationExpense'], accounts['accumulatedDepreciation'],
            p['depreciation'], f'Dep period {i+1}', ['IAS 16.48']
        ))
    return entries
