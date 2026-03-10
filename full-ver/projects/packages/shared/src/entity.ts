/**
 * @what Entity と Aggregate Root の基底クラス
 * @why DDDにおけるエンティティの同一性・不変条件を型で保証
 */

import { DomainEvent } from './domain-event.js';

/**
 * 識別子の基底クラス
 * Value Objectとして扱い、同一性は値で判定
 */
export abstract class Identifier<T extends string | number = string> {
  constructor(public readonly value: T) {
    this.validate(value);
  }

  protected abstract validate(value: T): void;

  equals(other: Identifier<T>): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}

/**
 * UUID形式の識別子
 */
export class UUIDIdentifier extends Identifier<string> {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  protected validate(value: string): void {
    if (!UUIDIdentifier.UUID_REGEX.test(value)) {
      throw new Error(`Invalid UUID format: ${value}`);
    }
  }

  static generate(): UUIDIdentifier {
    return new UUIDIdentifier(crypto.randomUUID());
  }
}

/**
 * エンティティの基底クラス
 * 識別子による同一性を持つ
 */
export abstract class Entity<TId extends Identifier> {
  constructor(protected readonly _id: TId) {}

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    return this._id.equals(other._id);
  }
}

/**
 * 集約ルートの基底クラス
 * ドメインイベントを蓄積し、永続化時にディスパッチする
 */
export abstract class AggregateRoot<TId extends Identifier> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  protected constructor(id: TId) {
    super(id);
  }

  get version(): number {
    return this._version;
  }

  protected setVersion(version: number): void {
    this._version = version;
  }

  protected incrementVersion(): void {
    this._version += 1;
  }

  /**
   * ドメインイベントを追加（永続化時にディスパッチされる）
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * 蓄積されたドメインイベントを取得
   */
  getDomainEvents(): readonly DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * ドメインイベントをクリア（永続化後に呼び出す）
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
