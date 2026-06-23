"""
Python canonical Ledger (immutable append-only, balances, verify equation, audit hash, trial balance).

Faithful semantic port of src/core/ledger.ts . This is the heart of transaction tracing power.
Use successive .apply(entry) and inspect snapshots/balances/equation at every checkpoint.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple, Any
from decimal import Decimal
import hashlib

from .money import Money
from .account import Account, AccountType
from .journal import JournalEntry, JournalEntryLine, validate_entry, ValidationResult


def empty_ledger() -> "Ledger":
    return Ledger([])


@dataclass(frozen=True)
class LedgerSnapshot:
    entries: tuple[JournalEntry, ...]
    as_of: str


class Ledger:
    def __init__(self, entries: List[JournalEntry] = None):
        ents = list(entries) if entries else []
        # Freeze for immutability (tuple of frozen entries)
        self._entries: tuple[JournalEntry, ...] = tuple(ents)

    @property
    def entries(self) -> tuple[JournalEntry, ...]:
        return self._entries

    def apply(self, entry: JournalEntry) -> Tuple["Ledger", ValidationResult]:
        result = validate_entry(entry)
        if not result.ok:
            return self, result
        new_entries = list(self._entries) + [entry]
        return Ledger(new_entries), result

    def _account_lines(self, account: Account, as_of: Optional[str] = None) -> List[JournalEntryLine]:
        relevant = [e for e in self._entries if not as_of or e.effective_date <= as_of]
        lines: List[JournalEntryLine] = []
        for e in relevant:
            for l in e.lines:
                if l.account.code == account.code:
                    lines.append(l)
        return lines

    def _currencies_of(self, lines: List[JournalEntryLine]) -> List[str]:
        seen: List[str] = []
        for l in lines:
            if l.amount.currency not in seen:
                seen.append(l.amount.currency)
        return seen

    def _net_in_currency(self, account: Account, lines: List[JournalEntryLine], currency: str) -> Money:
        debit = Money.zero(currency)
        credit = Money.zero(currency)
        for l in lines:
            if l.amount.currency != currency:
                continue
            if l.side == "debit":
                debit = debit.add(l.amount)
            else:
                credit = credit.add(l.amount)
        if account.normal_balance == "debit":
            return debit.sub(credit)
        return credit.sub(debit)

    def balances_by_currency(self, account: Account, as_of: Optional[str] = None) -> List[Money]:
        lines = self._account_lines(account, as_of)
        return [self._net_in_currency(account, lines, c) for c in self._currencies_of(lines)]

    def balance(self, account: Account, as_of: Optional[str] = None, currency: Optional[str] = None) -> Money:
        lines = self._account_lines(account, as_of)
        currs = self._currencies_of(lines)
        if currency:
            return self._net_in_currency(account, lines, currency)
        if not currs:
            # fallback like TS
            if self._entries:
                first = self._entries[0].lines[0].amount.currency if self._entries[0].lines else "USD"
                return Money.zero(first)
            return Money.zero("USD")
        if len(currs) > 1:
            raise ValueError(
                f"Account {account.code} has multiple currencies ({currs}); pass explicit currency or use balances_by_currency()"
            )
        return self._net_in_currency(account, lines, currs[0])

    def verify_fundamental_equation(self, accounts: Optional[List[Account]] = None) -> bool:
        accts = accounts or self._discover_accounts()
        by_curr: Dict[str, Dict[str, Money]] = {}
        for acct in accts:
            is_debit_normal = acct.type in (AccountType.Asset, AccountType.Expense)
            for bal in self.balances_by_currency(acct):
                c = bal.currency
                if c not in by_curr:
                    by_curr[c] = {"debit": Money.zero(c), "credit": Money.zero(c)}
                s = by_curr[c]
                if is_debit_normal:
                    s["debit"] = s["debit"].add(bal)
                else:
                    s["credit"] = s["credit"].add(bal)
        for bucket in by_curr.values():
            if not (bucket["debit"].to_decimal() == bucket["credit"].to_decimal()):
                return False
        return True

    def _discover_accounts(self) -> List[Account]:
        seen: Dict[str, Account] = {}
        for e in self._entries:
            for l in e.lines:
                if l.account.code not in seen:
                    seen[l.account.code] = l.account
        return list(seen.values())

    def trial_balance(self) -> List[Tuple[Account, Money]]:
        rows: List[Tuple[Account, Money]] = []
        for acct in self._discover_accounts():
            for bal in self.balances_by_currency(acct):
                rows.append((acct, bal))
        return rows

    def summarize_by_type(self) -> List[Dict[str, Any]]:
        groups: Dict[str, Dict[str, Any]] = {}
        for acct, bal in self.trial_balance():
            key = f"{acct.type.value}|{bal.currency}"
            if key not in groups:
                groups[key] = {"type": acct.type, "total": bal}
            else:
                groups[key]["total"] = groups[key]["total"].add(bal)
        return list(groups.values())

    def snapshot(self, as_of: Optional[str] = None) -> LedgerSnapshot:
        if as_of is None:
            as_of = "1970-01-01"  # or current; caller will supply
        return LedgerSnapshot(entries=self._entries, as_of=as_of)

    def to_json(self) -> dict:
        return {
            "v": "1",
            "entries": [e.to_json() for e in self._entries],
        }

    @classmethod
    def from_json(cls, j: dict) -> "Ledger":
        if not j or j.get("v") != "1" or not isinstance(j.get("entries"), list):
            raise ValueError("Ledger.from_json: invalid or unsupported shape")
        entries = [JournalEntry.from_json(ej) for ej in j["entries"]]
        return Ledger(list(entries))

    def audit_hash(self) -> str:
        """Stable SHA-256 chain mirroring TS logic (length-prefixed fields)."""
        chain = hashlib.sha256(b"ledger-audit-v1").hexdigest()
        for e in self._entries:
            fields: List[str] = [e.id, e.effective_date, e.description]
            for l in e.lines:
                fields.append(l.side)
                fields.append(l.account.code)
                fields.append(l.amount.to_hashable())
                fields.append(str(l.tags or None))
            fields.append(str(e.tags or None))
            fields.append(str(e.citations or None))
            h = hashlib.sha256((chain).encode())
            for f in fields:
                h.update(f"{len(f)}:{f}".encode("utf-8"))
            chain = h.hexdigest()
        return chain

    def income_statement(self) -> Dict[str, Money]:
        sums = {s["type"].value: s["total"] for s in self.summarize_by_type()}
        curr = self._pick_currency()
        inc = sums.get("Income", Money.zero(curr))
        exp = sums.get("Expense", Money.zero(curr))
        return {"totalIncome": inc, "totalExpenses": exp, "netIncome": inc.sub(exp) if inc.currency == exp.currency else inc}

    def balance_sheet(self) -> Dict[str, Any]:
        sums: Dict[str, Money] = {}
        for s in self.summarize_by_type():
            sums[s["type"].value] = s["total"]
        curr = self._pick_currency()
        assets = sums.get("Asset", Money.zero(curr))
        expenses = sums.get("Expense", Money.zero(curr))
        liab = sums.get("Liability", Money.zero(curr))
        equity = sums.get("Equity", Money.zero(curr))
        income = sums.get("Income", Money.zero(curr))
        left = assets.add(expenses)
        right = liab.add(equity).add(income)
        return {"left": left, "right": right, "balanced": (left.to_decimal() == right.to_decimal())}

    def _pick_currency(self, fallback: str = "USD") -> str:
        for e in self._entries:
            for l in e.lines:
                if l.amount.currency != "USD":
                    return l.amount.currency
        if self._entries and self._entries[0].lines:
            return self._entries[0].lines[0].amount.currency
        return fallback
