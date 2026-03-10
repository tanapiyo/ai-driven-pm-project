/**
 * @what リフレッシュトークンリポジトリのインターフェース
 * @why ドメイン層がインフラ層に依存しないよう、インターフェースを定義
 */

import type { RepositoryError, Result } from '@monorepo/shared';
import type { RefreshToken, RefreshTokenId, TokenHash } from './refresh-token.js';
import type { AuthUserId } from './auth-user.js';

/**
 * リフレッシュトークンリポジトリのインターフェース
 */
export interface RefreshTokenRepository {
  /**
   * トークンを保存（新規作成）
   */
  save(token: RefreshToken): Promise<Result<void, RepositoryError>>;

  /**
   * トークンを更新（既存トークンの更新）
   */
  update(token: RefreshToken): Promise<Result<void, RepositoryError>>;

  /**
   * IDでトークンを取得
   */
  findById(id: RefreshTokenId): Promise<Result<RefreshToken | null, RepositoryError>>;

  /**
   * トークンハッシュでトークンを取得
   */
  findByTokenHash(tokenHash: TokenHash): Promise<Result<RefreshToken | null, RepositoryError>>;

  /**
   * ユーザーのすべてのトークンを無効化
   */
  revokeAllByUserId(userId: AuthUserId): Promise<Result<void, RepositoryError>>;

  /**
   * トークンを削除
   */
  delete(id: RefreshTokenId): Promise<Result<void, RepositoryError>>;
}
