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
}

