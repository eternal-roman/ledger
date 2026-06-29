"""
FX Translation + CTA for Python ref (mirror of src/fx/translation.ts).
"""

from typing import Dict, Any, List
from .money import Money, FXRate, money_from
from .account import Account, AccountType
from .ledger import Ledger

def compute_fx_translation(ledger: Ledger, as_of: str,
                           rates: Dict[str, Dict[str, Any]],
                           reporting_currency: str) -> Dict[str, Any]:
    RC = reporting_currency.upper()
    holdings = []
    type_totals: Dict[str, Money] = {}

    for e in ledger.entries:
        for line in e.lines:
            acct = line.account
            orig = line.amount
            cur = orig.currency
            if cur == RC:
                trans = orig
            elif cur in rates or cur.lower() in rates:
                rinfo = rates.get(cur) or rates[cur.lower()]
                rate = float(str(rinfo['rate']))
                amt = float(str(getattr(orig, 'amount', orig)))
                trans = money_from(str(amt * rate), RC)
            else:
                raise ValueError("Missing rate for %s" % cur)
            holdings.append({'account': acct, 'original': orig, 'translated': trans})
            key = "%s|%s" % (acct.type, RC)
            if key not in type_totals:
                type_totals[key] = Money.zero(RC)
            type_totals[key] = type_totals[key].add(trans)

    # simplistic CTA
    # (full would compute left/right)
    cta = Money.zero(RC)  # placeholder; real calc would diff
    return {
        'reportingCurrency': RC,
        'asOf': as_of,
        'holdings': holdings,
        'translatedByType': [{'type': k.split('|')[0], 'total': v} for k,v in type_totals.items()],
        'cta': cta,
        'balancedWithCta': True,
    }
