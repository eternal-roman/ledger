"""
Minimal lots / cost basis relief for the Python reference canonical.

Faithful subset of src/portfolio/lots.ts for FIFO (expandable to LIFO/HIFO).

Reconstructs open lots and realized P&L purely from ledger entries that carry
LOT_TAGS on CUST: custody lines (as produced by trading.py reconcile helpers).

All arithmetic uses Money only. Deterministic. Fails closed on oversell.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional, Dict, Any

from .money import Money
from .ledger import Ledger
from .trading import LOT_TAGS


@dataclass(frozen=True)
class Lot:
    id: str
    asset: str
    acquired_date: str
    origin_entry_id: str
    quantity: Money
    cost_basis: Money


@dataclass(frozen=True)
class RealizedDisposal:
    trade_id: str
    date: str
    asset: str
    quantity: Money
    proceeds: Money
    basis: Money
    gain: Money


@dataclass(frozen=True)
class ReliefResult:
    asset: str
    quote: str
    open_lots: List[Lot]
    realized: List[RealizedDisposal]
    total_realized: Money


def _events_for(ledger: Ledger, asset: str) -> Dict[str, Any]:
    A = asset.upper()
    events: List[Dict[str, Any]] = []
    quote: Optional[str] = None
    for entry in ledger.entries:
        for line in entry.lines:
            t = line.tags or {}
            if not t.get(LOT_TAGS["tradeId"]):
                continue
            if line.amount.currency != A:
                continue
            if not line.account.code.startswith("CUST:"):
                continue
            q = t.get(LOT_TAGS["quote"])
            if q:
                if quote and quote != q:
                    raise ValueError(f"Asset {A} mixed quotes {quote} vs {q}")
                quote = q
            role = t.get(LOT_TAGS["role"])
            if role == "acquire":
                basis_str = t.get(LOT_TAGS["costBasis"], "0")
                events.append({
                    "kind": "acquire",
                    "date": entry.effective_date,
                    "entry_id": entry.id,
                    "qty": line.amount,
                    "basis": Money.from_(basis_str, q or "USD"),
                })
            elif role == "dispose":
                proceeds_str = t.get(LOT_TAGS["proceeds"], "0")
                events.append({
                    "kind": "dispose",
                    "date": entry.effective_date,
                    "trade_id": t.get(LOT_TAGS["tradeId"]),
                    "qty": line.amount,
                    "proceeds": Money.from_(proceeds_str, q or "USD"),
                })
    return {"events": events, "quote": quote or "USD"}


def _pick_lot(lots: List[Lot], method: str = "FIFO") -> int:
    if not lots:
        return -1
    if method.upper() == "FIFO":
        return 0
    if method.upper() == "LIFO":
        return len(lots) - 1
    # HIFO minimal
    best = 0
    best_per = lots[0].cost_basis.to_decimal() / lots[0].quantity.to_decimal()
    for i in range(1, len(lots)):
        per = lots[i].cost_basis.to_decimal() / lots[i].quantity.to_decimal()
        if per > best_per or (per == best_per and lots[i].id < lots[best].id):
            best = i
            best_per = per
    return best


def relief_for(ledger: Ledger, asset: str, method: str = "FIFO") -> ReliefResult:
    A = asset.upper()
    data = _events_for(ledger, A)
    q = data["quote"]
    lots: List[Lot] = []
    realized: List[RealizedDisposal] = []
    total_realized = Money.zero(q)
    acquire_seq = 0

    for ev in data["events"]:
        if ev["kind"] == "acquire":
            lots.append(Lot(
                id=f"{ev['entry_id']}#{acquire_seq}",
                asset=A,
                acquired_date=ev["date"],
                origin_entry_id=ev["entry_id"],
                quantity=ev["qty"],
                cost_basis=ev["basis"],
            ))
            acquire_seq += 1
            continue

        # dispose
        remaining = ev["qty"].to_decimal()
        proceeds_total = ev["proceeds"]
        basis_sum = Money.zero(q)

        while remaining > 0:
            idx = _pick_lot(lots, method)
            if idx < 0:
                raise ValueError(f"Oversell of {A}: {ev['trade_id']}")
            lot = lots[idx]
            lot_qty = lot.quantity.to_decimal()
            take = min(remaining, lot_qty)
            full = take >= lot_qty

            if full:
                basis_take = lot.cost_basis
                lots.pop(idx)
            else:
                ratio = take / lot_qty
                basis_take = lot.cost_basis.mul(str(ratio))
                new_qty = lot.quantity.mul(str( (lot_qty - take) / lot_qty ))
                new_basis = lot.cost_basis.sub(basis_take)
                lots[idx] = Lot(lot.id, lot.asset, lot.acquired_date, lot.origin_entry_id, new_qty, new_basis)

            basis_sum = basis_sum.add(basis_take)
            remaining -= take

        gain = proceeds_total.sub(basis_sum)
        total_realized = total_realized.add(gain)
        realized.append(RealizedDisposal(
            trade_id=ev["trade_id"],
            date=ev["date"],
            asset=A,
            quantity=ev["qty"],
            proceeds=proceeds_total,
            basis=basis_sum,
            gain=gain,
        ))

    return ReliefResult(
        asset=A,
        quote=q,
        open_lots=lots,
        realized=realized,
        total_realized=total_realized,
    )


def build_lots(ledger: Ledger, asset: str, method: str = "FIFO") -> List[Lot]:
    return relief_for(ledger, asset, method).open_lots


def realized_pnl(ledger: Ledger, asset: str, method: str = "FIFO") -> ReliefResult:
    return relief_for(ledger, asset, method)
