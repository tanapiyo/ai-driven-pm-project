/**
 * @what パスワードリセットトークンリポジトリのインターフェース
 */

import type { RepositoryError, Result } from '@monorepo/shared';
import type { PasswordResetToken, PasswordResetTokenId } from './password-reset-token.js';
import type { TokenHash } from './refresh-token.js';
import type { AuthUserId } from './auth-user.js';

/**
 * パスワードリセットトークンリポジトリのインターフェース
 */
export interface PasswordResetTokenRepository {
  /**
   * トークンを保存（新規作成）
   */
  save(token: PasswordResetToken): Promise<Result<void, RepositoryError>>;

  /**
   * トークンを更新（既存トークンの更新）
   */
  update(token: PasswordResetToken): Promise<Result<void, RepositoryError>>;

  /**
   * IDでトークンを取得
   */
  findById(id: PasswordResetTokenId): Promise<Result<PasswordResetToken | null, RepositoryError>>;

  /**
   * トークンハッシュでトークンを取得
   */
  findByTokenHash(
    tokenHash: TokenHash
  ): Promise<Result<PasswordResetToken | null, RepositoryError>>;

  /**
   * ユーザーのすべての未使用トークンを無効化
   */
  invalidateAllByUserId(userId: AuthUserId): Promise<Result<void, RepositoryError>>;

  /**
   * トークンを削除
   */
  delete(id: PasswordResetTokenId): Promise<Result<void, RepositoryError>>;
}
