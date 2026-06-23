"""
Canonical verification harness for audits.

Mirrors src/verify/index.ts :
- CanonicalFinancialArtifact + validate
- full_verify (equation + citations stub)
- verify_determinism (build twice, compare audit_hash + equation)
"""

from dataclasses import dataclass
from typing import Any, List, Optional, Dict, Tuple
from .money import Money
from .journal import JournalEntry, create_balanced_entry, validate_entry
from .ledger import Ledger, empty_ledger
from .account import Account, AccountType


@dataclass
class CanonicalFinancialArtifact:
    scope: str
    assumptions: List[str]
    citations: List[str]
    kernel_plan: str  # must mention Money.from / createEntry / Ledger.apply / validateEntry
    proof: str
    reproducibility: str


def validate_canonical_artifact(artifact: Dict[str, Any]) -> Dict[str, Any]:
    violations: List[str] = []
    if not artifact.get("scope"):
        violations.append("scope required")
    if not artifact.get("assumptions") or len(artifact.get("assumptions", [])) == 0:
        violations.append("assumptions required")
    if not artifact.get("citations") or len(artifact.get("citations", [])) == 0:
        violations.append("citations required")
    kp = artifact.get("kernel_plan", "") or ""
    if not any(x in kp for x in ["Money.from", "create_entry", "Ledger.apply", "validate_entry"]):
        violations.append("kernel_plan must reference core primitives (Money.from / create_entry / Ledger.apply / validate_entry)")
    if not artifact.get("proof"):
        violations.append("proof required")
    return {"ok": len(violations) == 0, "violations": violations}


def full_verify(ledger: Ledger, entries: Optional[List[JournalEntry]] = None, levers: Optional[Dict] = None) -> Dict[str, Any]:
    equation_ok = ledger.verify_fundamental_equation()
    all_entries = entries or list(ledger.entries)
    # Stub citations (in real use pull from knowledge graph)
    facts_citations: List[str] = ["kernel:double-entry-balance", "core:exact-decimal"]
    return {
        "ok": equation_ok,
        "balanced_count": len(all_entries),
        "citations": facts_citations,
        "message": "All invariants hold" if equation_ok else "Equation violation",
    }


def verify_determinism(entries: List[JournalEntry]) -> Dict[str, Any]:
    def build() -> Ledger:
        l = empty_ledger()
        for e in entries:
            res_ledger, res = l.apply(e)
            if not res.ok:
                raise ValueError("Invalid entry during determinism verify")
            l = res_ledger
        return l

    a = build()
    b = build()
    h_a = a.audit_hash()
    h_b = b.audit_hash()
    eq = a.verify_fundamental_equation()
    ok = (h_a == h_b) and eq
    return {"ok": ok, "ledger": a, "hash": h_a}


@dataclass
class TraceCheckpoint:
    step: int
    entry_id: str
    description: str
    balances: List[Dict[str, str]]  # [{account_code, balance}]
    equation_holds: bool
    audit_hash_prefix: str


@dataclass
class TraceReplayResult:
    final_ledger: Ledger
    checkpoints: List[TraceCheckpoint]
    final_equation: bool
    final_hash: str
    ok: bool


def run_trace(entries: List[JournalEntry]) -> TraceReplayResult:
    """Python mirror of runTrace for kernel-based transaction tracing in audits.
    Applies entries one by one, capturing state after each for proofs.
    """
    ledger = empty_ledger()
    checkpoints: List[TraceCheckpoint] = []

    for idx, entry in enumerate(entries):
        res_ledger, res = ledger.apply(entry)
        if not res.ok:
            raise ValueError(f"Trace failed at step {idx} on {entry.id}")
        ledger = res_ledger

        bals = []
        for item in ledger.trial_balance():
            # Handles both tuple (acct, bal) and any future dict form
            if isinstance(item, (list, tuple)):
                acct, bal = item
            else:
                acct = item.get("account") if isinstance(item, dict) else item.account
                bal = item.get("balance") if isinstance(item, dict) else item.balance
            bals.append({"account_code": acct.code, "balance": str(bal)})

        checkpoints.append(TraceCheckpoint(
            step=idx,
            entry_id=entry.id,
            description=entry.description,
            balances=bals,
            equation_holds=ledger.verify_fundamental_equation(),
            audit_hash_prefix=ledger.audit_hash()[:16],
        ))

    return TraceReplayResult(
        final_ledger=ledger,
        checkpoints=checkpoints,
        final_equation=ledger.verify_fundamental_equation(),
        final_hash=ledger.audit_hash(),
        ok=ledger.verify_fundamental_equation(),
    )
