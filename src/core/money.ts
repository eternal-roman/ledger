// decimal.js ESM interop shim (ensures constructable at TS compile + runtime)
import * as DecimalModule from 'decimal.js';
const Decimal: any = (DecimalModule as any).default || DecimalModule;

export class Money {
  private readonly _amount: any; // Decimal instance - exact arbitrary precision
  public readonly currency: string;
  public readonly asOf?: string;
  public readonly provenance?: string;

  private constructor(amount: any, currency: string, asOf?: string, provenance?: string) {
    this._amount = amount;
    this.currency = currency.toUpperCase();
    this.asOf = asOf;
    this.provenance = provenance;
  }

  /**
   * Create Money. Always goes through string to avoid float precision traps.
   * value can be string or number (number is coerced safely via toString but prefer string literals).
   */
  static from(value: string | number, currency: string, asOf?: string, provenance?: string): Money {
    // Force string coercion to protect from caller passing raw floats
    const dec = new Decimal(String(value));
    return new Money(dec, currency, asOf, provenance);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(
      this._amount.add(other._amount),
      this.currency,
      this.asOf ?? other.asOf,
      this.provenance ?? other.provenance
    );
  }

  sub(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(this._amount.sub(other._amount), this.currency, this.asOf, this.provenance);
  }

  /** Multiply by a scalar (rounding mode is passed through to decimal.js). */
  mul(scalar: string | number, roundingMode?: number): Money {
    const result = this._amount.mul(new Decimal(String(scalar)));
    if (roundingMode !== undefined) {
      // decimal.js toDecimalPlaces mutates in some versions; we assign back
      result.toDecimalPlaces(10, roundingMode);
    }
    return new Money(result, this.currency, this.asOf, this.provenance);
  }

  toString(): string {
    // Human + deterministic form
    const formatted = this._amount.toFixed(2);
    return `${formatted} ${this.currency}`;
  }

  /** Return the raw Decimal for internal controlled use only (exact) */
  toDecimal(): any {
    return this._amount;
  }

  /** For hashing / determinism checks */
  toHashable(): string {
    return `${this._amount.toString()}:${this.currency}:${this.asOf ?? ''}`;
  }
}

