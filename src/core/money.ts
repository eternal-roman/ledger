// decimal.js interop (ESM default or namespace)
import * as DecimalModule from 'decimal.js';
const Decimal: any = (DecimalModule as any).default || DecimalModule;

const DEFAULT_SCALE = 2;
const CURRENCY_SCALES: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, JPY: 0, CNY: 2, KRW: 0,
};

/**
 * FXRate(from, to, rate, asOf?, source?). Rate is conversion factor (not monetary amount).
 * Used only for explicit multi-currency legs.
 */
export class FXRate {
  public readonly from: string;
  public readonly to: string;
  public readonly rate: number;
  public readonly asOf?: string;
  public readonly source?: string;

  constructor(from: string, to: string, rate: number | string, asOf?: string, source?: string) {
    this.from = from.toUpperCase();
    this.to = to.toUpperCase();
    this.rate = typeof rate === 'string' ? parseFloat(rate) : rate;
    this.asOf = asOf;
    this.source = source;
  }

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
    this.scale = scale ?? CURRENCY_SCALES[this.currency] ?? DEFAULT_SCALE;
    this.asOf = asOf;
    this.provenance = provenance;
  }

  /**
   * Money.from(value, currency). String coercion prevents float traps. Optional scale override.
   */
  static from(value: string | number, currency: string, asOf?: string, provenance?: string, scale?: number): Money {
    const dec = new Decimal(String(value));
    return new Money(dec, currency, scale, asOf, provenance);
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
    let r = this._amount.mul(new Decimal(String(scalar)));
    if (roundingMode !== undefined) r = r.toDecimalPlaces(this.scale, roundingMode);
    return new Money(r, this.currency, this.scale, this.asOf, this.provenance);
  }

  /** div(scalar) — optional roundingMode. */
  div(scalar: string | number, roundingMode?: number): Money {
    let r = this._amount.div(new Decimal(String(scalar)));
    if (roundingMode !== undefined) r = r.toDecimalPlaces(this.scale, roundingMode);
    return new Money(r, this.currency, this.scale, this.asOf, this.provenance);
  }

  /** Convert via explicit FXRate (target currency + provenance). */
  convert(rate: FXRate): Money {
    if (this.currency !== rate.from) throw new Error(`FX mismatch: ${this.currency} vs ${rate.from}`);
    const amt = this._amount.times(rate.rate);
    return new Money(amt, rate.to, undefined, rate.asOf, rate.source || this.provenance);
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
    const ps = ratios.map(r => new Decimal(String(r)));
    const tot = ps.reduce((a, b) => a.add(b), new Decimal(0));
    if (tot.isZero()) return ratios.map(() => Money.zero(this.currency, this.asOf, this.provenance));

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

  /** Negated copy (sign flip). */
  negate(): Money {
    return new Money(this._amount.neg(), this.currency, this.scale, this.asOf, this.provenance);
  }

  /** Absolute value copy. */
  abs(): Money {
    return new Money(this._amount.abs(), this.currency, this.scale, this.asOf, this.provenance);
  }

  /** Simple serializable form for roundtrips. */
  toJSON() {
    return {
      v: '1',
      a: this._amount.toString(),
      c: this.currency,
      s: this.scale,
      asOf: this.asOf,
      p: this.provenance,
    };
  }

  /** Rehydrate from toJSON. */
  static fromJSON(j: any): Money {
    return Money.from(j.a, j.c, j.asOf, j.p, j.s);
  }

  /** Combine provenance strings for add/sub (internal, exact, no mutation). */
  private static combineProvenance(a?: string, b?: string): string | undefined {
    if (a && b && a !== b) return `${a}|${b}`;
    return a ?? b;
  }
}

