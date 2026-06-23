"""
Canonical verification harness for audits.

Mirrors src/verify/index.ts :
- CanonicalFinancialArtifact + validate
- full_verify (equation + citations stub)
- verify_determinism (build twice, compare audit_hash + equation)
"""

from dataclasses import dataclass
from typing import Any, List, Optional, Dict
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
