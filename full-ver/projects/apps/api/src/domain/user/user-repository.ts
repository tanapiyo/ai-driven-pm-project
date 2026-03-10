/**
 * @what ユーザーリポジトリのインターフェース
 * @why ドメイン層がインフラ層に依存しないよう、インターフェースを定義
 * @failure リポジトリはResult<T>を返すこと。生のPromiseやnullable型は禁止
 *
 * domain層のルール:
 * - インターフェースのみ定義（実装はinfrastructure層）
 * - Result<T>で戻り値を型安全に
 */

import type { Repository, RepositoryError, Result } from '@monorepo/shared';
import type { User, UserId } from './user.js';
import type { Email } from '@monorepo/shared';

/**
 * ユーザー固有のリポジトリエラー
 */
export type UserRepositoryError = RepositoryError | 'email_already_exists';

/**
 * ユーザーリポジトリのインターフェース
 */
export interface UserRepository extends Repository<User, UserId> {
  /**
   * メールアドレスでユーザーを検索
   */
  findByEmail(email: Email): Promise<Result<User, UserRepositoryError>>;

  /**
   * メールアドレスが既に使用されているかチェック
   */
  emailExists(email: Email): Promise<Result<boolean, RepositoryError>>;
}
