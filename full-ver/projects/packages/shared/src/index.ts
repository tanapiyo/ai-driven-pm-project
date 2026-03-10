/**
 * @what 共有パッケージのエクスポート
 * @why ドメイン層・アプリケーション層で使用する共通型・ユーティリティを提供
 */

// Result型
export { Result, combineResults, type AsyncResult } from './result.js';

// ドメインイベント
export {
  DomainEvent,
  type CausationMeta,
  type EventIdentity,
  type EventDispatcher,
  type EventHandler,
  type EventStore,
} from './domain-event.js';

// エンティティ・集約
export { Identifier, UUIDIdentifier, Entity, AggregateRoot } from './entity.js';

// Value Object
export { ValueObject, Email, DateRange, Money } from './value-object.js';

// リポジトリ
export type {
  RepositoryError,
  ReadRepository,
  WriteRepository,
  Repository,
  UnitOfWork,
} from './repository.js';
