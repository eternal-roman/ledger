"""
ledger — Python reference canonical implementation.

Usage in audits:
    from ledger.money import Money
    from ledger.account import Account, AccountType
    from ledger.journal import JournalEntry, create_entry, make_line, validate_entry, create_balanced_entry
    from ledger.ledger import Ledger, empty_ledger
    from ledger.verify import verify_determinism, validate_canonical_artifact, CanonicalFinancialArtifact, run_trace
    from ledger import trading
    # trading.reconcile_buy_fill(...), trading.reconcile_sell_fill(...), trading.replay_fill_trace(...)

Must be used to model all value in Python target repositories during kernel-grounded audits.
Roundtrips with JSON and passes same determinism/equation proofs as TS kernel.
"""

from .money import Money, FXRate, money_from
from .account import Account, AccountType
from .journal import (
    JournalEntry, JournalEntryLine, make_line,
    create_entry, create_balanced_entry, validate_entry,
    ValidationResult, ValidationViolation, is_iso_date, create_fx_conversion
)
from .ledger import Ledger, empty_ledger, LedgerSnapshot
from .verify import (
    verify_determinism, validate_canonical_artifact,
    full_verify, CanonicalFinancialArtifact,
    run_trace, TraceReplayResult, TraceCheckpoint
)
from . import trading
from .audit_scanner import scan_tree, find_monetary_in_file
from .lots import Lot, RealizedDisposal, ReliefResult, relief_for, build_lots, realized_pnl

__all__ = [
    "Money", "FXRate", "money_from",
    "Account", "AccountType",
    "JournalEntry", "JournalEntryLine", "make_line",
    "create_entry", "create_balanced_entry", "validate_entry",
    "ValidationResult", "ValidationViolation", "is_iso_date", "create_fx_conversion",
    "Ledger", "empty_ledger", "LedgerSnapshot",
    "verify_determinism", "validate_canonical_artifact", "full_verify", "CanonicalFinancialArtifact",
    "run_trace", "TraceReplayResult", "TraceCheckpoint",
    "trading",
    "scan_tree", "find_monetary_in_file",
    "Lot", "RealizedDisposal", "ReliefResult", "relief_for", "build_lots", "realized_pnl",
]

__version__ = "0.7.5-ref"  # align conceptually with TS
