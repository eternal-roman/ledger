"""
Period lock support for Python ref (faithful mirror of src/periods/lock.ts).

Hard close: effective_date <= lock_date rejected via guarded apply.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Tuple
from .journal import JournalEntry, validate_entry, ValidationResult
from .ledger import Ledger

@dataclass(frozen=True)
class PeriodLock:
    id: str
    lock_date: str
    authority: str
    reason: str
    created_at: str = ""
    tags: Optional[Dict[str, str]] = None

def create_period_lock(id_: str, lock_date: str, authority: str, reason: str,
                       created_at: str = "", tags: Optional[Dict[str, str]] = None) -> PeriodLock:
    if not (isinstance(lock_date, str) and len(lock_date) == 10):
        raise ValueError("lock_date must be YYYY-MM-DD")
    return PeriodLock(id_, lock_date, authority, reason, created_at, tags)

def is_effective_date_locked(date: str, locks: List[PeriodLock]) -> bool:
    return any(date <= l.lock_date for l in locks)

def validate_entry_with_period_locks(entry: JournalEntry, locks: List[PeriodLock] = None) -> ValidationResult:
    locks = locks or []
    base = validate_entry(entry)
    if not base.ok:
        return base
    for l in locks:
        if entry.effective_date <= l.lock_date:
            return ValidationResult(
                ok=False,
                violations=base.violations + [type('V', (), {'type': 'PERIOD_LOCKED', 'message': f'effective_date {entry.effective_date} <= lock {l.lock_date}', 'lockDate': l.lock_date})()]
            )
    return base

def guarded_apply(ledger: Ledger, entry: JournalEntry, period_locks: List[PeriodLock] = None) -> Tuple[Ledger, ValidationResult]:
    period_locks = period_locks or []
    v = validate_entry_with_period_locks(entry, period_locks)
    if not v.ok:
        return ledger, v
    return ledger.apply(entry)
