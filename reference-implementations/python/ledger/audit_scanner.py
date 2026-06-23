"""
Basic monetary expression scanner for Python targets (reference canonical version).

Helps audits discover places that manipulate value and should be modeled with the
ledger kernel (Money + JournalEntry + Ledger).

Usage:
  PYTHONPATH=reference-implementations/python python -m ledger.audit_scanner --path /target
  or
  python -m ledger.audit_scanner --path .

Outputs JSON inventory + summary. Classification includes decision/gate/pnl patterns.
"""

import ast
import argparse
import json
import re
from pathlib import Path
from typing import List, Dict, Any

MONEY_NAME = re.compile(
    r'(price|qty|quantity|amount|pnl|fee|capital|value|cost|usd|equity|atr|risk|gross|net|proceeds|basis|filled|realized|unrealized|exposure|margin|size|position)',
    re.I
)

RISK_WORDS = re.compile(r'float\(|parseFloat|0\.[0-9]{3,}|Decimal\([\'\"0-9.]+\)')

DECISION_PAT = re.compile(r'(if |while |assert |min\(|max\(|>|<|>=|<=|==|!=).*?(price|qty|pnl|amount|basis|risk)', re.I)


def classify(line: str) -> str:
    if RISK_WORDS.search(line):
        return "HIGH_RISK_FLOAT_OR_PREC"
    if DECISION_PAT.search(line):
        return "DECISION|GATE"
    if MONEY_NAME.search(line) and any(k in line.lower() for k in ["pnl", "profit", "gain", "loss", "realized"]):
        return "PNL|REALIZED"
    if MONEY_NAME.search(line):
        return "CALC|ACCUM|VALUE"
    return "MISC"


def find_monetary_in_file(py_file: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    try:
        src = py_file.read_text(encoding="utf-8", errors="ignore")
        lines = src.splitlines()
        tree = ast.parse(src, filename=str(py_file))
        for node in ast.walk(tree):
            if isinstance(node, (ast.Assign, ast.AugAssign, ast.BinOp, ast.Call, ast.Compare)):
                lineno = getattr(node, "lineno", 0)
                if lineno <= 0 or lineno > len(lines):
                    continue
                line = lines[lineno - 1].strip()[:160]
                if MONEY_NAME.search(line) or RISK_WORDS.search(line):
                    items.append({
                        "file": str(py_file),
                        "line": lineno,
                        "expr": line,
                        "classification": classify(line),
                        "risk": "HIGH" if RISK_WORDS.search(line) else "MED",
                    })
    except Exception:
        pass
    return items


def scan_tree(root: str, exclude_dirs: List[str] = None) -> List[Dict[str, Any]]:
    rootp = Path(root)
    exclude = set(exclude_dirs or ["__pycache__", "ledger", "test", "venv", ".git", "node_modules", "dist"])
    results: List[Dict[str, Any]] = []
    for py in rootp.rglob("*.py"):
        sp = str(py)
        if any(x in sp for x in exclude):
            continue
        results.extend(find_monetary_in_file(py))
    # dedup by file+line
    seen = set()
    unique = []
    for it in results:
        key = (it["file"], it["line"])
        if key not in seen:
            seen.add(key)
            unique.append(it)
    return unique


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", default=".")
    ap.add_argument("--out", default="monetary_inventory.json")
    ap.add_argument("--exclude", nargs="*", default=None)
    args = ap.parse_args()

    inv = scan_tree(args.path, args.exclude)
    out = {
        "count": len(inv),
        "high_risk": sum(1 for x in inv if x["risk"] == "HIGH"),
        "items": inv,
    }
    Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Scanned Python files under {args.path}. Found {len(inv)} monetary expressions.")
    print(f"High risk: {out['high_risk']}. Written to {args.out}")
    print("Use this inventory to drive kernel modeling in audits.")


if __name__ == "__main__":
    main()
