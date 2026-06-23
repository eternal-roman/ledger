"""
Python canonical JournalEntry + validate. Faithful port of src/core/journal.ts .

Key invariants enforced:
- >= 2 lines (double entry)
- Valid ISO date (YYYY-MM-DD)
- All amounts > 0
- No amount finer than currency scale (sub-scale guard)
- Per-currency: total debits == total credits (exact Decimal)
- No mixed currencies inside a single entry (explicit FX legs required)
"""

import re
from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional, Dict, Any, Literal, Tuple
from decimal import Decimal

from .money import Money
from .account import Account


Side = Literal["debit", "credit"]


def is_iso_date(s: str) -> bool:
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return False
    try:
        y, m, d = map(int, s.split("-"))
        dt = date(y, m, d)
        return dt.year == y and dt.month == m and dt.day == d
    except Exception:
        return False


@dataclass(frozen=True)
class JournalEntryLine:
    account: Account
    amount: Money
    side: Side
    tags: Optional[Dict[str, str]] = None

    def __post_init__(self):
        # Freeze tags if present (deep-ish)
        if self.tags is not None:
            object.__setattr__(self, "tags", dict(self.tags))


@dataclass(frozen=True)
class JournalEntry:
    id: str
    effective_date: str
    lines: tuple[JournalEntryLine, ...]
    description: str
    citations: Optional[tuple[str, ...]] = None
    tags: Optional[Dict[str, str]] = None

    def __post_init__(self):
        # Ensure immutable tuple for lines
        if not isinstance(self.lines, tuple):
            object.__setattr__(self, "lines", tuple(self.lines))
        if self.citations is not None and not isinstance(self.citations, tuple):
            object.__setattr__(self, "citations", tuple(self.citations))
        if self.tags is not None:
            object.__setattr__(self, "tags", dict(self.tags))

    def to_json(self) -> dict:
        return {
            "v": "1",
            "id": self.id,
            "effectiveDate": self.effective_date,
            "lines": [
                {
                    "account": l.account.to_json(),
                    "amount": l.amount.to_json(),
                    "side": l.side,
                    "tags": dict(l.tags) if l.tags else None,
                }
                for l in self.lines
            ],
            "description": self.description,
            "citations": list(self.citations) if self.citations else None,
            "tags": dict(self.tags) if self.tags else None,
        }

    @classmethod
    def from_json(cls, j: dict) -> "JournalEntry":
        if not j or j.get("v") != "1":
            raise ValueError("JournalEntry.from_json: unsupported version or shape")
        if not j.get("id") or not j.get("effectiveDate") or not isinstance(j.get("lines"), list) or not j.get("description"):
            raise ValueError("JournalEntry.from_json: missing required fields")
        lines = []
        for l in j["lines"]:
            acct = Account.from_json(l["account"])
            amt = Money.from_json(l["amount"])
            lines.append(make_line(acct, amt, l["side"], l.get("tags")))
        return create_entry(
            j["id"], j["effectiveDate"], lines, j["description"],
            j.get("citations"), j.get("tags")
        )


@dataclass
class ValidationViolation:
    type: str  # UNBALANCED | TOO_FEW_LINES | CURRENCY_MIX | INVALID_AMOUNT | SUB_SCALE | INVALID_DATE
    message: str
    diff: Optional[str] = None


@dataclass
class ValidationResult:
    ok: bool
    violations: List[ValidationViolation]


def make_line(account: Account, amount: Money, side: Side, tags: Optional[Dict[str, str]] = None) -> JournalEntryLine:
    if amount.to_decimal() <= 0:
        raise ValueError("Amount must be > 0 (use side for direction)")
    return JournalEntryLine(account, amount, side, tags)


def create_balanced_entry(
    id_: str,
    effective_date: str,
    debit_account: Account,
    credit_account: Account,
    amount: Money,
    description: str,
    citations: Optional[List[str]] = None,
    tags: Optional[Dict[str, str]] = None,
) -> JournalEntry:
    lines = [
        make_line(debit_account, amount, "debit"),
        make_line(credit_account, amount, "credit"),
    ]
    return create_entry(id_, effective_date, lines, description, citations, tags)


def create_entry(
    id_: str,
    effective_date: str,
    lines: List[JournalEntryLine],
    description: str,
    citations: Optional[List[str]] = None,
    tags: Optional[Dict[str, str]] = None,
) -> JournalEntry:
    entry = JournalEntry(
        id_,
        effective_date,
        tuple(lines),
        description,
        tuple(citations) if citations else None,
        dict(tags) if tags else None,
    )
    vr = validate_entry(entry)
    if not vr.ok:
        msgs = ", ".join(v.message for v in vr.violations)
        raise ValueError(f"Failed to create entry: {msgs}")
    return entry


def validate_entry(entry: JournalEntry) -> ValidationResult:
    violations: List[ValidationViolation] = []

    if len(entry.lines) < 2:
        violations.append(ValidationViolation("TOO_FEW_LINES", "Journal entry must have at least two lines (double-entry)"))

    if not is_iso_date(entry.effective_date):
        violations.append(ValidationViolation("INVALID_DATE", f'effective_date must be valid ISO date (YYYY-MM-DD); got "{entry.effective_date}"'))

    for line in entry.lines:
        if line.amount.to_decimal() <= 0:
            violations.append(ValidationViolation("INVALID_AMOUNT", "All line amounts must be strictly positive"))
        # Sub-scale guard (mirror TS)
        dp = line.amount.to_decimal().as_tuple().exponent
        # exponent negative means decimal places = -exponent
        decimal_places = -dp if dp < 0 else 0
        if decimal_places > line.amount.scale:
            violations.append(ValidationViolation(
                "SUB_SCALE",
                f"Amount {line.amount.to_decimal()} {line.amount.currency} is finer than the {line.amount.scale}-dp currency scale"
            ))

    # Group by currency
    by_curr: Dict[str, Dict[str, Money]] = {}
    for line in entry.lines:
        curr = line.amount.currency
        if curr not in by_curr:
            by_curr[curr] = {"debit": Money.zero(curr), "credit": Money.zero(curr)}
        bucket = by_curr[curr]
        if line.side == "debit":
            bucket["debit"] = bucket["debit"].add(line.amount)
        else:
            bucket["credit"] = bucket["credit"].add(line.amount)

    # Balance check + mixed currency detection (core rule: explicit FX legs or separate entries)
    if len(by_curr) > 1:
        violations.append(ValidationViolation("CURRENCY_MIX", "Mixed currencies in one entry. Provide explicit FX conversion legs or split entries."))

    for curr, bucket in by_curr.items():
        if not (bucket["debit"].to_decimal() == bucket["credit"].to_decimal()):
            diff = str(bucket["debit"].sub(bucket["credit"]))
            violations.append(ValidationViolation("UNBALANCED", f"Debits do not equal credits for {curr}", diff))

    return ValidationResult(ok=len(violations) == 0, violations=violations)


# Optional: simple FX helper (mirrors createFxConversion logic at high level)
def create_fx_conversion(
    id_base: str,
    effective_date: str,
    foreign_debit: Account,
    domestic_credit: Account,
    foreign_amt: Money,
    domestic_amt: Money,
    clearing_foreign: Account,
    clearing_domestic: Account,
    description: str,
    rate_source: Optional[str] = None,
) -> List[JournalEntry]:
    if foreign_amt.currency == domestic_amt.currency:
        raise ValueError("FX currencies must differ")
    cites = [rate_source] if rate_source else None
    leg_f = create_entry(
        f"{id_base}-f", effective_date,
        [make_line(foreign_debit, foreign_amt, "debit"), make_line(clearing_foreign, foreign_amt, "credit")],
        f"{description} (FX foreign leg)", cites
    )
    leg_d = create_entry(
        f"{id_base}-d", effective_date,
        [make_line(clearing_domestic, domestic_amt, "debit"), make_line(domestic_credit, domestic_amt, "credit")],
        f"{description} (FX domestic leg)", cites
    )
    return [leg_f, leg_d]
