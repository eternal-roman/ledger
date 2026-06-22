// decimal.js ESM interop shim (ensures constructable at TS compile + runtime)
import * as DecimalModule from 'decimal.js';
const Decimal: any = (DecimalModule as any).default || DecimalModule;

// Common currency decimal scales (minor units)
const DEFAULT_SCALE = 2;
const CURRENCY_SCALES: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CNY: 2,
  KRW: 0,
  // add more as needed; falls back to 2
};

/**
 * FXRate for explicit currency conversion with citation/provenance.
 * Used for multi-currency legs in journal entries.
 */
export class FXRate {
  public readonly from: string;
  public readonly to: string;
  public readonly rate: number; // exact factor e.g. 1.1 for 1 USD = 1.1 EUR
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
   * Create Money. Always goes through string to avoid float precision traps.
   * value can be string or number (number is coerced safely via toString but prefer string literals).
   * scale can be provided to override (e.g. 3 for some exotic currencies).
   */
  static from(value: string | number, currency: string, asOf?: string, provenance?: string, scale?: number): Money {
    // Force string coercion to protect from caller passing raw floats
    const dec = new Decimal(String(value));
    return new Money(dec, currency, scale, asOf, provenance);
  }

  /** Zero value for a currency. Preferred over Money.from(0, ...) for clarity and consistency. */
  static zero(currency: string, asOf?: string, provenance?: string): Money {
    return Money.from(0, currency, asOf, provenance);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this._amount.eq(other._amount);
  }

  /** True if amount is exactly zero for the currency. */
  isZero(): boolean {
    return this._amount.isZero();
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    const asOf = this.asOf ?? other.asOf;
    const prov = this.provenance && other.provenance && this.provenance !== other.provenance ? `${this.provenance}|${other.provenance}` : (this.provenance ?? other.provenance);
    return new Money(this._amount.add(other._amount), this.currency, this.scale, asOf, prov);
  }

  sub(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    const asOf = this.asOf ?? other.asOf;
    const prov = this.provenance && other.provenance && this.provenance !== other.provenance ? `${this.provenance}|${other.provenance}` : (this.provenance ?? other.provenance);
    return new Money(this._amount.sub(other._amount), this.currency, this.scale, asOf, prov);
  }

  /** Multiply by a scalar (rounding mode is passed through to decimal.js). */
  mul(scalar: string | number, roundingMode?: number): Money {
    let result = this._amount.mul(new Decimal(String(scalar)));
    if (roundingMode !== undefined) {
      result = result.toDecimalPlaces(this.scale, roundingMode);
    }
    return new Money(result, this.currency, this.scale, this.asOf, this.provenance);
  }

  /** Divide by a scalar (rounding mode optional). */
  div(scalar: string | number, roundingMode?: number): Money {
    let result = this._amount.div(new Decimal(String(scalar)));
    if (roundingMode !== undefined) {
      result = result.toDecimalPlaces(this.scale, roundingMode);
    }
    return new Money(result, this.currency, this.scale, this.asOf, this.provenance);
  }

  /**
   * Convert using explicit FXRate. Returns Money in target currency with provenance from rate.
   */
  convert(rate: FXRate): Money {
    if (this.currency !== rate.from) {
      throw new Error(`FX from-currency mismatch: ${this.currency} vs ${rate.from}`);
    }
    const newAmount = this._amount.times(rate.rate);
    const prov = rate.source || this.provenance;
    return new Money(newAmount, rate.to, undefined, rate.asOf, prov);
  }

  /**
   * Format with optional decimals and symbol.
   */
  toFormat(opts: { decimals?: number; symbol?: string } = {}): string {
    const decs = opts.decimals ?? this.scale;
    const formatted = this._amount.toFixed(decs);
    const sym = opts.symbol ? opts.symbol + ' ' : '';
    return `${sym}${formatted} ${this.currency}`;
  }

  /**
   * Allocate this amount into parts by ratios (e.g. [1, 2, 1] for 25/50/25 split).
   * Returns array of Money that sum exactly to this (remainder to last part).
   * Ratios may be numbers or strings; handled exactly via Decimal.
   * Guarantees exact sum to original.
   */
  allocate(ratios: (string | number)[]): Money[] {
    if (ratios.length === 0) return [];
    const parts = ratios.map(r => new Decimal(String(r)));
    const totalParts = parts.reduce((a, b) => a.add(b), new Decimal(0));
    if (totalParts.isZero()) {
      return ratios.map(() => Money.zero(this.currency, this.asOf, this.provenance));
    }
    const results: Money[] = [];
    let allocated = new Decimal(0);
    for (let i = 0; i < parts.length; i++) {
      let share: any;
      if (i === parts.length - 1) {
        share = this._amount.sub(allocated); // ensure exact sum
      } else {
        share = this._amount.mul(parts[i]).div(totalParts);
        share = share.toDecimalPlaces(this.scale, 1); // 1 = ROUND_DOWN for exact floor, deterministic
      }
      const m = new Money(share, this.currency, this.scale, this.asOf, this.provenance);
      results.push(m);
      allocated = allocated.add(share);
    }
    return results;
  }

  toString(): string {
    // Use the currency's scale for accurate, deterministic display
    const formatted = this._amount.toFixed(this.scale);
    return `${formatted} ${this.currency}`;
  }

  /** Return the raw Decimal for internal controlled use only (exact) */
  toDecimal(): any {
    return this._amount;
  }

  /** For hashing / determinism checks */
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
}

