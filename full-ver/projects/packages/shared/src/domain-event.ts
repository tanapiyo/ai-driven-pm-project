/**
 * @what ドメインイベントの基底クラスと因果メタデータ
 * @why イベント系列の追跡・再現のため、因果メタ（causationId/correlationId/emittedAt）を必須化
 *
 * Usage:
 * ```typescript
 * class UserCreatedEvent extends DomainEvent<'UserCreated'> {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly email: string,
 *     causationId: string,
 *     correlationId: string
 *   ) {
 *     super('UserCreated', causationId, correlationId);
 *   }
 * }
 * ```
 */

/**
 * 因果メタデータ - すべてのドメインイベントに必須
 */
export interface CausationMeta {
  /** このイベントを引き起こした操作のID（コマンドID等） */
  readonly causationId: string;
  /** 一連の操作を紐づけるID（リクエストID等） */
  readonly correlationId: string;
  /** イベント発生時刻 */
  readonly emittedAt: Date;
}

/**
 * ドメインイベントの識別情報
 */
export interface EventIdentity {
  /** イベントの一意識別子 */
  readonly eventId: string;
  /** イベントの種類 */
  readonly eventType: string;
  /** 集約のID */
  readonly aggregateId: string;
  /** イベント発行時の集約バージョン */
  readonly aggregateVersion: number;
}

/**
 * ドメインイベントの基底クラス
 * すべてのドメインイベントはこれを継承すること
 */
export abstract class DomainEvent<TEventType extends string = string>
  implements CausationMeta, EventIdentity
{
  public readonly eventId: string;
  public readonly emittedAt: Date;

  protected constructor(
    public readonly eventType: TEventType,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly causationId: string,
    public readonly correlationId: string,
    eventId?: string
  ) {
    this.eventId = eventId ?? crypto.randomUUID();
    this.emittedAt = new Date();
  }

  /**
   * イベントをシリアライズ可能なオブジェクトに変換
   */
  abstract toPayload(): Record<string, unknown>;

  /**
   * イベントのメタデータを取得
   */
  getMeta(): CausationMeta & EventIdentity {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateVersion: this.aggregateVersion,
      causationId: this.causationId,
      correlationId: this.correlationId,
      emittedAt: this.emittedAt,
    };
  }
}

/**
 * イベントディスパッチャーのインターフェース
 */
export interface EventDispatcher {
  dispatch(event: DomainEvent): Promise<void>;
  dispatchAll(events: DomainEvent[]): Promise<void>;
}

/**
 * イベントハンドラーのインターフェース
 */
export interface EventHandler<TEvent extends DomainEvent = DomainEvent> {
  readonly eventType: string;
  handle(event: TEvent): Promise<void>;
}

/**
 * イベントストアのインターフェース
 */
export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
}
