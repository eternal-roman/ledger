// decimal.js interop (ESM default or namespace)
import * as DecimalModule from 'decimal.js';
const Decimal: any = (DecimalModule as any).default || DecimalModule;

const DEFAULT_SCALE = 2;
const CURRENCY_SCALES: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, JPY: 0, CNY: 2, KRW: 0,
};
export const ROUND_HALF_UP = 4; // decimal.js ROUND_HALF_UP

/**
 * Optional scale resolver for non-fiat assets (crypto coins, equity shares, …).
 * Consulted ONLY after the built-in fiat map misses, so the fiat path stays
 * byte-identical. Installed additively via `installAssetScales` in src/instruments.
 *
 * Determinism note (per audit + compaction): this is process-global mutable state.
 * For AI, reproducible, cross-process or "Blueprint First" use: prefer the explicit
 * bypass Money.from(..., scale) or Money.fromWithExplicitScale(value, cur, scale).
 * Never rely on pre-install for determinism; pass + persist the scale with any ledger.
 */
type ScaleResolver = (symbol: string) => number | undefined;
let extraResolver: ScaleResolver | undefined;

/** Register a resolver that supplies decimal scales for non-fiat asset symbols.
 * Prefer explicit scale in Money.from / fromWithExplicitScale for determinism instead of this global. */
export function registerScaleResolver(resolver: ScaleResolver | undefined): void {
  extraResolver = resolver;
}

function scaleFor(currency: string): number {
  const c = currency.toUpperCase();
  if (CURRENCY_SCALES[c] !== undefined) return CURRENCY_SCALES[c]; // fiat wins, unchanged
  const fromResolver = extraResolver?.(c);
  return fromResolver ?? DEFAULT_SCALE;
}

/**
 * Central guard for every external numeric entry point. decimal.js accepts the
 * strings "Infinity"/"-Infinity"/"NaN" (and the number forms), which silently poison
 * all downstream arithmetic and comparisons (NaN comparisons are always false, so
 * positive/scale/balance guards pass). Reject them at the door so a non-finite value
 * can never enter a Money amount, an FX rate, a scalar, or an allocation ratio.
 */
function toFiniteDecimal(value: string | number, context: string): any {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${context}: non-finite number ${value}`);
  }
  const dec = new Decimal(String(value));
  if (!dec.isFinite()) {
    throw new Error(`${context}: must be a finite number; got "${value}"`);
  }
  return dec;
}

/**
 * Guard the RESULT of an operation. decimal.js division by zero yields Infinity
 * (it does not throw), and an Infinity/NaN result would silently poison every
 * downstream comparison (all false for non-finite). Reject it so a Money can
 * never hold a non-finite amount, even though its inputs were finite.
 */
function assertFiniteResult(dec: any, context: string): any {
  if (!dec.isFinite()) throw new Error(`${context}: non-finite result`);
  return dec;
}

/**
 * FXRate(from, to, rate, asOf?, source?). Rate is an exact conversion factor (not a monetary amount).
 * Stored exactly as a decimal string — never a float, never parseFloat — so high-precision rates
 * survive intact. Used only for explicit multi-currency legs.
 */
export class FXRate {
  public readonly from: string;
  public readonly to: string;
  public readonly rate: string; // exact canonical decimal string (no float)
  private readonly _rate: any;  // Decimal instance
  public readonly asOf?: string;
  public readonly source?: string;

  constructor(from: string, to: string, rate: number | string, asOf?: string, source?: string) {
    this.from = from.toUpperCase();
    this.to = to.toUpperCase();
    // Reject Infinity/NaN from BOTH number and string forms (string "Infinity" otherwise
    // slips past a number-only check and yields an infinite rate that poisons convert()).
    this._rate = toFiniteDecimal(rate, 'FXRate'); // exact; String() captures full digits, no parseFloat
    this.rate = this._rate.toString();
    this.asOf = asOf;
    this.source = source;
  }

  /** Exact Decimal form of the rate, for exact multiplication. */
  rateDecimal(): any { return this._rate; }

  toString(): string {
    return `1 ${this.from} = ${this.rate} ${this.to}${this.asOf ? ' @ ' + this.asOf : ''}`;
  }
}

export class Money {
  private readonly _amount: any; // Decimal instance - exact arbitrary precision
  public readonly currency: string;
  public readonly scale: number;
  public readonly asOf?: string;
  public readonly provenance?: string;

  private constructor(amount: any, currency: string, scale?: number, asOf?: string, provenance?: string) {
    this._amount = amount;
    this.currency = currency.toUpperCase();
    this.scale = scale ?? scaleFor(this.currency);
    this.asOf = asOf;
    this.provenance = provenance;
  }

  /**
   * Money.from(value, currency). String coercion prevents float traps. Optional scale override
   * (5th param) bypasses the global resolver entirely for determinism (see fromWithExplicitScale).
   * For AI/financial reproducibility, always supply explicit scale for non-fiat when possible.
   */
  static from(value: string | number, currency: string, asOf?: string, provenance?: string, scale?: number): Money {
    // VULN-02: isSafeInteger rejects both non-integers (0.1) and values above MAX_SAFE_INTEGER
    // where String() already returns the wrong number.
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new Error(`Money.from: number ${value} is non-integer or outside safe-integer range — pass a string to preserve precision`);
    }
    // VULN-01: Decimal supports "Infinity" / "NaN" as strings; reject non-finite input before
    // any guard that relies on arithmetic comparisons (all false for NaN/Infinity).
    const dec = toFiniteDecimal(value, 'Money.from');
    const resolvedScale = scale ?? scaleFor(currency.toUpperCase());
    if (dec.decimalPlaces() > resolvedScale) {
      throw new Error(
        `Money.from: ${value} ${currency.toUpperCase()} has ${dec.decimalPlaces()} decimal places but the currency scale is ${resolvedScale} — use a string with at most ${resolvedScale} decimal places`
      );
    }
    return new Money(dec, currency, scale, asOf, provenance);
  }

  /**
   * Explicit-scale factory that *never* consults the global/process resolver.
   * Use for determinism in AI agents, cross-process, or when you want to avoid installAssetScales side-effects.
   * The scale is mandatory and used verbatim for validation + storage.
   */
  static fromWithExplicitScale(value: string | number, currency: string, scale: number, asOf?: string, provenance?: string): Money {
    if (typeof scale !== 'number' || !Number.isFinite(scale) || scale < 0) {
      throw new Error('fromWithExplicitScale: scale must be a finite non-negative number');
    }
    return Money.from(value, currency, asOf, provenance, scale);
  }

  /** Zero for currency (preferred over from(0)). */
  static zero(currency: string, asOf?: string, provenance?: string): Money {
    return Money.from(0, currency, asOf, provenance);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this._amount.eq(other._amount);
  }

  isZero(): boolean { return this._amount.isZero(); }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(
      this._amount.add(other._amount),
      this.currency,
      this.scale,
      this.asOf ?? other.asOf,
      Money.combineProvenance(this.provenance, other.provenance)
    );
  }

  sub(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(
      this._amount.sub(other._amount),
      this.currency,
      this.scale,
      this.asOf ?? other.asOf,
      Money.combineProvenance(this.provenance, other.provenance)
    );
  }

  /** mul(scalar) — roundingMode passed to toDecimalPlaces if provided. */
  mul(scalar: string | number, roundingMode?: number): Money {
    let r = assertFiniteResult(this._amount.mul(toFiniteDecimal(scalar, 'Money.mul')), 'Money.mul');
    if (roundingMode !== undefined) r = r.toDecimalPlaces(this.scale, roundingMode);
    return new Money(r, this.currency, this.scale, this.asOf, this.provenance);
  }

  /** div(scalar) — optional roundingMode. Division by zero is rejected (no Infinity). */
  div(scalar: string | number, roundingMode?: number): Money {
    const d = toFiniteDecimal(scalar, 'Money.div');
    if (d.isZero()) throw new Error('Money.div: division by zero');
    let r = assertFiniteResult(this._amount.div(d), 'Money.div');
    if (roundingMode !== undefined) r = r.toDecimalPlaces(this.scale, roundingMode);
    return new Money(r, this.currency, this.scale, this.asOf, this.provenance);
  }

  /** Convert via explicit FXRate. Exact multiply, then round to the target currency scale. */
  convert(rate: FXRate, roundingMode: number = ROUND_HALF_UP): Money {
    if (this.currency !== rate.from) throw new Error(`FX mismatch: ${this.currency} vs ${rate.from}`);
    const targetScale = scaleFor(rate.to);
    const amt = assertFiniteResult(
      this._amount.times(rate.rateDecimal()).toDecimalPlaces(targetScale, roundingMode),
      'Money.convert',
    );
    return new Money(amt, rate.to, targetScale, rate.asOf, rate.source || this.provenance);
  }

  /** toFormat({decimals?, symbol?}). */
  toFormat(opts: { decimals?: number; symbol?: string } = {}): string {
    const d = opts.decimals ?? this.scale;
    const s = opts.symbol ? opts.symbol + ' ' : '';
    return `${s}${this._amount.toFixed(d)} ${this.currency}`;
  }

  /**
   * allocate(ratios) — exact split, remainder to last. Supports string|number ratios.
   * Always sums to original (kernel invariant).
   */
  allocate(ratios: (string | number)[]): Money[] {
    if (ratios.length === 0) return [];
    const ps = ratios.map(r => toFiniteDecimal(r, 'Money.allocate'));
    if (ps.some(p => p.isNegative())) {
      throw new Error('Money.allocate: ratios must be non-negative');
    }
    const tot = ps.reduce((a, b) => a.add(b), new Decimal(0));
    if (tot.isZero()) {
      throw new Error('Money.allocate: ratios sum to zero');
    }

    const res: Money[] = [];
    let alloc = new Decimal(0);
    for (let i = 0; i < ps.length; i++) {
      const share = (i === ps.length - 1)
        ? this._amount.sub(alloc)
        : this._amount.mul(ps[i]).div(tot).toDecimalPlaces(this.scale, 1);
      const m = new Money(share, this.currency, this.scale, this.asOf, this.provenance);
      res.push(m);
      alloc = alloc.add(share);
    }
    return res;
  }

  toString(): string {
    return `${this._amount.toFixed(this.scale)} ${this.currency}`;
  }

  toDecimal(): any { return this._amount; }

  /** Hash for determinism verification. */
  toHashable(): string {
    return `${this._amount.toString()}:${this.currency}:${this.scale}:${this.asOf ?? ''}`;
  }

  /** Compare to other (same currency required). Returns -1, 0, or 1. */
  compare(other: Money): -1 | 0 | 1 {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return this._amount.cmp(other._amount);
  }

  /** Negate the amount (sign flip), preserve currency, scale, asOf, provenance. */
  negate(): Money {
    return new Money(this._amount.negated(), this.currency, this.scale, this.asOf, this.provenance);
  }

  /** Absolute value, preserve currency, scale, asOf, provenance. */
  abs(): Money {
    return new Money(this._amount.abs(), this.currency, this.scale, this.asOf, this.provenance);
  }

  /**
   * Serialize to plain object for roundtrips, persistence, hashing.
   * v: version for forward compat.
   */
  toJSON(): { v: string; a: string; c: string; s: number; asOf?: string; provenance?: string } {
    return {
      v: '1',
      a: this._amount.toString(),
      c: this.currency,
      s: this.scale, // persist scale so asset Money rehydrates correctly without the global resolver
      asOf: this.asOf,
      provenance: this.provenance,
    };
  }

  /**
   * Reconstruct Money from the toJSON shape.
   * Accepts loose keys for flexibility (a/amount, c/currency, provenance/p).
   */
  static fromJSON(j: any): Money {
    if (!j || typeof j !== 'object') throw new Error('Money.fromJSON expects object');
    const amt = j.a ?? j.amount;
    const cur = j.c ?? j.currency;
    const prov = j.provenance ?? j.p;
    if (amt == null || !cur) {
      throw new Error('Money.fromJSON missing amount or currency');
    }
    const scale = typeof j.s === 'number' ? j.s : undefined; // backward compatible: v1 JSON without `s`
    return Money.from(amt, cur, j.asOf, prov, scale);
  }

  /** Combine provenance strings for add/sub (internal, exact, no mutation). */
  private static combineProvenance(a?: string, b?: string): string | undefined {
    if (a && b && a !== b) return `${a}|${b}`;
    return a ?? b;
  }
}

