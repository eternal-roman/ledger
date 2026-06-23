"""
Python canonical: Account + AccountType. Mirrors src/core/account.ts exactly.
"""

from enum import Enum
from typing import Any


class AccountType(str, Enum):
    Asset = "Asset"
    Liability = "Liability"
    Equity = "Equity"
    Income = "Income"
    Expense = "Expense"


class Account:
    def __init__(self, code: str, name: str, type_: AccountType, normal_balance: str = None):
        self.code = code
        self.name = name
        self.type = type_ if isinstance(type_, AccountType) else AccountType(type_)
        if normal_balance is None:
            self.normal_balance = "debit" if self.type in (AccountType.Asset, AccountType.Expense) else "credit"
        else:
            self.normal_balance = normal_balance

    def __repr__(self) -> str:
        return f"{self.code} {self.name} ({self.type.value})"

    def to_json(self) -> dict:
        return {"code": self.code, "name": self.name, "type": self.type.value}

    @classmethod
    def from_json(cls, j: Any) -> "Account":
        if not isinstance(j, dict) or not j.get("code") or not j.get("name") or not j.get("type"):
            raise ValueError("Account.from_json: invalid account shape")
        return cls(j["code"], j["name"], AccountType(j["type"]))
