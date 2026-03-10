/**
 * @what リポジトリの基底インターフェース
 * @why ドメイン層がインフラ層に依存しないよう、インターフェースを分離
 * @failure リポジトリはResult<T>を返すこと。生のPromiseやnullable型は禁止
 */

import type { AggregateRoot, Identifier } from './entity.js';
import type { Result } from './result.js';

/**
 * リポジトリ共通のエラー型
 */
export type RepositoryError = 'not_found' | 'conflict' | 'db_error' | 'validation_error';

/**
 * 読み取り専用リポジトリのインターフェース
 */
export interface ReadRepository<TAggregate extends AggregateRoot<TId>, TId extends Identifier> {
  /**
   * IDで集約を取得
   * @returns Result<TAggregate, 'not_found' | 'db_error'>
   */
  findById(id: TId): Promise<Result<TAggregate, RepositoryError>>;

  /**
   * 集約が存在するかチェック
   */
  exists(id: TId): Promise<Result<boolean, RepositoryError>>;
}

/**
 * 書き込み可能リポジトリのインターフェース
 */
export interface WriteRepository<TAggregate extends AggregateRoot<TId>, TId extends Identifier> {
  /**
   * 集約を保存（新規作成）
   * @returns Result<void, 'conflict' | 'db_error'>
   */
  save(aggregate: TAggregate): Promise<Result<void, RepositoryError>>;

  /**
   * 集約を更新
   * @returns Result<void, 'not_found' | 'conflict' | 'db_error'>
   */
  update(aggregate: TAggregate): Promise<Result<void, RepositoryError>>;

  /**
   * 集約を削除
   * @returns Result<void, 'not_found' | 'db_error'>
   */
  delete(id: TId): Promise<Result<void, RepositoryError>>;
}

/**
 * CRUD操作を持つ完全なリポジトリ
 */
export interface Repository<TAggregate extends AggregateRoot<TId>, TId extends Identifier>
  extends ReadRepository<TAggregate, TId>, WriteRepository<TAggregate, TId> {}

/**
 * Unit of Work パターンのインターフェース
 * トランザクション境界を管理
 */
export interface UnitOfWork {
  /**
   * トランザクションを開始
   */
  begin(): Promise<void>;

  /**
   * トランザクションをコミット
   */
  commit(): Promise<void>;

  /**
   * トランザクションをロールバック
   */
  rollback(): Promise<void>;

  /**
   * トランザクション内で処理を実行
   */
  execute<T>(fn: () => Promise<T>): Promise<Result<T, 'transaction_failed'>>;
}
