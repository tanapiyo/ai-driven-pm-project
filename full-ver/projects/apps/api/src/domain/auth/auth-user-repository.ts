/**
 * @what 認証ユーザーリポジトリのインターフェース
 * @why ドメイン層がインフラ層に依存しないよう、インターフェースを定義
 *
 * domain層のルール:
 * - インターフェースのみ定義（実装はinfrastructure層）
 * - Result<T>で戻り値を型安全に
 */

import type { RepositoryError, Result } from '@monorepo/shared';
import type { AuthUser, AuthUserId, UserRole, UserStatus } from './auth-user.js';
import type { Email } from '@monorepo/shared';

/**
 * 認証ユーザー固有のリポジトリエラー
 */
export type AuthUserRepositoryError = RepositoryError | 'email_already_exists';

/**
 * ユーザー一覧取得のフィルタ
 */
export interface ListUsersFilter {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

/**
 * ページネーション設定
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * ページネーション結果
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 認証ユーザーリポジトリのインターフェース
 * Note: Repository base を使わず独自定義（update が AuthUser を返すため）
 */
export interface AuthUserRepository {
  /**
   * IDでユーザーを取得
   */
  findById(id: AuthUserId): Promise<Result<AuthUser, RepositoryError>>;

  /**
   * ユーザーが存在するかチェック
   */
  exists(id: AuthUserId): Promise<Result<boolean, RepositoryError>>;

  /**
   * ユーザーを保存（新規作成）
   */
  save(user: AuthUser): Promise<Result<AuthUser, RepositoryError>>;

  /**
   * ユーザーを更新
   */
  update(user: AuthUser): Promise<Result<AuthUser, RepositoryError>>;

  /**
   * ユーザーを削除
   */
  delete(id: AuthUserId): Promise<Result<void, RepositoryError>>;

  /**
   * メールアドレスでユーザーを検索
   */
  findByEmail(email: Email): Promise<Result<AuthUser | null, RepositoryError>>;

  /**
   * メールアドレスが既に使用されているかチェック
   */
  emailExists(email: Email): Promise<Result<boolean, RepositoryError>>;

  /**
   * ユーザー一覧を取得（フィルタ・ページネーション対応）
   */
  findAllWithPagination(
    filter: ListUsersFilter,
    pagination: PaginationOptions
  ): Promise<Result<PaginatedResult<AuthUser>, RepositoryError>>;
}
