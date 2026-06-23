"""
Basic monetary expression scanner for Python targets. Helps identify flows that should be modeled with the ledger kernel during audits.

Usage (from python/ dir or with PYTHONPATH):
  python -m ledger.audit_scanner --path /path/to/target/repo

Outputs inventory like the TS version.
"""
import ast
import argparse
import json
import os
import re
from pathlib import Path
from typing import List, Dict

MONEY_NAME = re.compile(r'(price|qty|quantity|amount|pnl|fee|capital|value|cost|usd|equity|atr|risk|gross|net|proceeds|basis|filled|realized|unrealized)', re.I)

def find_monetary_in_file(py_file: Path) -> List[Dict]:
    items = []
    try:
        src = py_file.read_text(encoding='utf-8', errors='ignore')
        tree = ast.parse(src, filename=str(py_file))
        lines = src.splitlines()
        for node in ast.walk(tree):
            if isinstance(node, (ast.Assign, ast.AugAssign, ast.BinOp, ast.Call)):
                lineno = getattr(node, 'lineno', 0)
                line = lines[lineno-1] if 0 < lineno <= len(lines) else ''
                if MONEY_NAME.search(line) or 'float(' in line or re.search(r'\b0\.[0-9]', line):
                    items.append({
                        "file": str(py_file),
                        "line": lineno,
                        "expr": line.strip()[:120],
                        "classification": "CALC|ACCUM|DECISION|BOUNDARY",
                        "risk": "HIGH" if 'float(' in line or '0.99' in line else "MED"
                    })
    except Exception:
        pass
    return items

def scan_tree(root: str) -> List[Dict]:
    rootp = Path(root)
    results = []
    for py in rootp.rglob("*.py"):
        if any(x in str(py) for x in ['__pycache__', 'ledger', 'test', 'venv', '.git']):
            continue
        results.extend(find_monetary_in_file(py))
    # dedup rough
    seen = set()
    unique = []
    for it in results:
        key = (it['file'], it['line'])
        if key not in seen:
            seen.add(key)
            unique.append(it)
    return unique

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", default=".")
    ap.add_argument("--out", default="monetary_inventory.json")
    args = ap.parse_args()

    inv = scan_tree(args.path)
    out = {"count": len(inv), "items": inv}
    Path(args.out).write_text(json.dumps(out, indent=2))
    print(f"Scanned Python files under {args.path}. Found {len(inv)} candidates -> {args.out}")
    print("Run this to help discover flows that need kernel modeling during audits.")

if __name__ == "__main__":
    main()
