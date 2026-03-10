/**
 * @what Value Object の基底クラス
 * @why DDDにおける値オブジェクトの不変性・値による同一性を型で保証
 */

/**
 * Value Objectの基底クラス
 * 値による同一性を持ち、不変
 */
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: Readonly<T>;

  protected constructor(props: T) {
    this.validate(props);
    this.props = Object.freeze(props);
  }

  /**
   * バリデーション（サブクラスで実装）
   */
  protected abstract validate(props: T): void;

  /**
   * 値による等価性判定
   */
  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

/**
 * メールアドレスのValue Object
 */
export class Email extends ValueObject<{ value: string }> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(props: { value: string }) {
    super(props);
  }

  protected validate(props: { value: string }): void {
    if (!Email.EMAIL_REGEX.test(props.value)) {
      throw new Error(`Invalid email format: ${props.value}`);
    }
  }

  static create(value: string): Email {
    return new Email({ value: value.toLowerCase().trim() });
  }

  get value(): string {
    return this.props.value;
  }
}

/**
 * 日付範囲のValue Object
 */
export class DateRange extends ValueObject<{ start: Date; end: Date }> {
  private constructor(props: { start: Date; end: Date }) {
    super(props);
  }

  protected validate(props: { start: Date; end: Date }): void {
    if (props.start > props.end) {
      throw new Error('Start date must be before or equal to end date');
    }
  }

  static create(start: Date, end: Date): DateRange {
    return new DateRange({ start, end });
  }

  get start(): Date {
    return this.props.start;
  }

  get end(): Date {
    return this.props.end;
  }

  contains(date: Date): boolean {
    return date >= this.props.start && date <= this.props.end;
  }

  overlaps(other: DateRange): boolean {
    return this.props.start <= other.end && this.props.end >= other.start;
  }
}

/**
 * 金額のValue Object
 */
export class Money extends ValueObject<{ amount: number; currency: string }> {
  private constructor(props: { amount: number; currency: string }) {
    super(props);
  }

  protected validate(props: { amount: number; currency: string }): void {
    if (!Number.isFinite(props.amount)) {
      throw new Error('Amount must be a finite number');
    }
    if (props.currency.length !== 3) {
      throw new Error('Currency must be a 3-letter ISO code');
    }
  }

  static create(amount: number, currency: string): Money {
    return new Money({ amount, currency: currency.toUpperCase() });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return Money.create(this.amount * factor, this.currency);
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
