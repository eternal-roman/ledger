"""
Python canonical reference implementation of ledger Money + FXRate.

Faithful port of TS src/core/money.ts semantics:
- Exact arithmetic via decimal.Decimal (no float for monetary amounts).
- Money.from: non-integer float is rejected with explicit error.
- Scales per currency for minor-unit validation (not for internal storage).
- Provenance tracking, asOf.
- Immutable.
- Full roundtrip JSON.
- Supports mul/div scalar, allocate (exact + remainder rule), convert via FXRate.
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation, getcontext
from typing import Optional, Any, Union, List
import json

def _quantize(d: Decimal, scale: int, rounding: Any = None) -> Decimal:
    """Helper to quantize to currency scale, mirroring decimal.js toDecimalPlaces behavior."""
    if rounding is None:
        rounding = ROUND_HALF_UP
    q = Decimal('1.' + '0' * scale) if scale > 0 else Decimal('1')
    return d.quantize(q, rounding=rounding)

# Mirror TS: keep high precision for internal; scale is for formatting + sub-scale guard in journal.
getcontext().prec = 50  # ample for financial

DEFAULT_SCALE = 2
CURRENCY_SCALES: dict[str, int] = {
    "USD": 2, "EUR": 2, "GBP": 2, "JPY": 0, "CNY": 2, "KRW": 0,
    "USDC": 2, "USDT": 2, "BTC": 8, "ETH": 8,
}

_extra_resolver = None  # type: Optional[callable]


def register_scale_resolver(resolver: Optional[callable]) -> None:
    global _extra_resolver
    _extra_resolver = resolver


def scale_for(currency: str) -> int:
    c = currency.upper()
    if c in CURRENCY_SCALES:
        return CURRENCY_SCALES[c]
    if _extra_resolver is not None:
        v = _extra_resolver(c)
        if v is not None:
            return v
    return DEFAULT_SCALE


ROUNDING = ROUND_HALF_UP


class FXRate:
    """Exact rate (not monetary). Stored as decimal string. Mirror of TS FXRate."""

    def __init__(self, from_: str, to: str, rate: Union[str, int, float, Decimal], as_of: Optional[str] = None, source: Optional[str] = None):
        self.from_ = from_.upper()
        self.to = to.upper()
        if isinstance(rate, float) and not rate.is_integer():
            # Still accept for rates (they are factors), but document; TS uses String(rate) always.
            pass
        try:
            self._rate = Decimal(str(rate))
        except (InvalidOperation, ValueError) as e:
            raise ValueError(f"Invalid FX rate {rate}") from e
        self.rate = str(self._rate)
        self.as_of = as_of
        self.source = source

    def rate_decimal(self) -> Decimal:
        return self._rate

    def __str__(self) -> str:
        s = f"1 {self.from_} = {self.rate} {self.to}"
        if self.as_of:
            s += f" @ {self.as_of}"
        return s


class Money:
    def __init__(self, amount: Decimal, currency: str, scale: Optional[int] = None,
                 as_of: Optional[str] = None, provenance: Optional[str] = None):
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        self._amount: Decimal = amount
        self.currency: str = currency.upper()
        self.scale: int = scale if scale is not None else scale_for(self.currency)
        self.as_of = as_of
        self.provenance = provenance

    @classmethod
    def from_(cls, value: Any, currency: str, as_of: Optional[str] = None,
              provenance: Optional[str] = None, scale: Optional[int] = None) -> "Money":
        """
        Strict construction. Mirrors TS:
        - Reject raw non-integer float (IEEE754 trap).
        - Coerce via str() to Decimal (captures full digits).
        """
        if isinstance(value, float) and not value.is_integer():
            raise ValueError(
                f"Money.from_ forbids raw float {value} — IEEE754 error. "
                f"Pass str or int or Decimal, e.g. '{value}'"
            )
        try:
            if isinstance(value, Decimal):
                dec = value
            else:
                dec = Decimal(str(value))
            # Do not auto-quantize here (preserve precision like TS); journal validate guards sub-scale.
            return cls(dec, currency, scale, as_of, provenance)
        except (InvalidOperation, ValueError) as e:
            raise ValueError(f"Invalid monetary value {value}") from e

    @classmethod
    def zero(cls, currency: str, as_of: Optional[str] = None, provenance: Optional[str] = None) -> "Money":
        return cls.from_(0, currency, as_of, provenance)

    def to_decimal(self) -> Decimal:
        return self._amount

    def equals(self, other: "Money") -> bool:
        return self.currency == other.currency and self._amount == other._amount

    def is_zero(self) -> bool:
        return self._amount.is_zero()

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Currency mismatch: {self.currency} vs {other.currency}")
        new_prov = self._combine_provenance(self.provenance, other.provenance)
        return Money(self._amount + other._amount, self.currency, self.scale, self.as_of or other.as_of, new_prov)

    def sub(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Currency mismatch: {self.currency} vs {other.currency}")
        new_prov = self._combine_provenance(self.provenance, other.provenance)
        return Money(self._amount - other._amount, self.currency, self.scale, self.as_of or other.as_of, new_prov)

    def mul(self, scalar: Union[str, int, float, Decimal], rounding_mode: Any = None) -> "Money":
        r = self._amount * Decimal(str(scalar))
        if rounding_mode is not None:
            r = _quantize(r, self.scale, rounding_mode)
        return Money(r, self.currency, self.scale, self.as_of, self.provenance)

    def div(self, scalar: Union[str, int, float, Decimal], rounding_mode: Any = None) -> "Money":
        r = self._amount / Decimal(str(scalar))
        if rounding_mode is not None:
            r = _quantize(r, self.scale, rounding_mode)
        return Money(r, self.currency, self.scale, self.as_of, self.provenance)

    def convert(self, rate: FXRate, rounding_mode: Any = ROUND_HALF_UP) -> "Money":
        if self.currency != rate.from_:
            raise ValueError(f"FX mismatch: {self.currency} vs {rate.from_}")
        target_scale = scale_for(rate.to)
        amt = _quantize(self._amount * rate.rate_decimal(), target_scale, rounding_mode)
        return Money(amt, rate.to, target_scale, rate.as_of, rate.source or self.provenance)

    def allocate(self, ratios: List[Union[str, int, float, Decimal]]) -> List["Money"]:
        if not ratios:
            return []
        ps = [Decimal(str(r)) for r in ratios]
        total = sum(ps, Decimal(0))
        if total.is_zero():
            return [Money.zero(self.currency, self.as_of, self.provenance) for _ in ratios]
        res: List[Money] = []
        alloc = Decimal(0)
        for i, p in enumerate(ps):
            if i == len(ps) - 1:
                share = self._amount - alloc
            else:
                share = _quantize((self._amount * p / total), self.scale)
            m = Money(share, self.currency, self.scale, self.as_of, self.provenance)
            res.append(m)
            alloc += share
        return res

    def negate(self) -> "Money":
        return Money(self._amount.copy_negate(), self.currency, self.scale, self.as_of, self.provenance)

    def abs(self) -> "Money":
        return Money(self._amount.copy_abs(), self.currency, self.scale, self.as_of, self.provenance)

    def compare(self, other: "Money") -> int:
        if self.currency != other.currency:
            raise ValueError(f"Currency mismatch: {self.currency} vs {other.currency}")
        return (self._amount > other._amount) - (self._amount < other._amount)

    def to_format(self, decimals: Optional[int] = None, symbol: Optional[str] = None) -> str:
        d = decimals if decimals is not None else self.scale
        s = f"{symbol} " if symbol else ""
        q = _quantize(self._amount, d)
        return f"{s}{q} {self.currency}"

    def __str__(self) -> str:
        # Mirror primary toString using scale
        try:
            q = _quantize(self._amount, self.scale)
            return f"{q} {self.currency}"
        except Exception:
            return f"{self._amount} {self.currency}"

    def to_hashable(self) -> str:
        return f"{str(self._amount)}:{self.currency}:{self.scale}:{self.as_of or ''}"

    def to_json(self) -> dict:
        return {
            "v": "1",
            "a": str(self._amount),
            "c": self.currency,
            "s": self.scale,  # persist scale so asset Money rehydrates correctly without the global resolver
            "asOf": self.as_of,
            "provenance": self.provenance,
        }

    @classmethod
    def from_json(cls, j: dict) -> "Money":
        if not isinstance(j, dict):
            raise ValueError("Money.from_json expects dict")
        amt = j.get("a") or j.get("amount")
        cur = j.get("c") or j.get("currency")
        prov = j.get("provenance") or j.get("p")
        if amt is None or not cur:
            raise ValueError("Money.from_json missing amount or currency")
        s = j.get("s")
        scale = s if isinstance(s, int) and not isinstance(s, bool) else None  # backward compatible: legacy JSON without `s`
        return cls.from_(amt, cur, j.get("asOf"), prov, scale)

    @staticmethod
    def _combine_provenance(a: Optional[str], b: Optional[str]) -> Optional[str]:
        if a and b and a != b:
            return f"{a}|{b}"
        return a or b

    def __repr__(self) -> str:
        return f"Money({self})"


def money_from(value: Any, currency: str, **kw) -> Money:
    return Money.from_(value, currency, **kw)
