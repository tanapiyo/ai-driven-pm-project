/**
 * @what Content リポジトリインターフェース
 * @why ドメイン層がインフラ層に依存しないよう、インターフェースを定義
 * @failure リポジトリはResult<T>を返すこと。生のPromiseやnullable型は禁止
 *
 * domain層のルール:
 * - インターフェースのみ定義（実装はinfrastructure層）
 * - Result<T>で戻り値を型安全に
 *
 * 新規ドメインを追加する際はこのファイルをテンプレートとして利用してください。
 */

import type { Repository, RepositoryError, Result } from '@monorepo/shared';
import type { Content, ContentId, ContentStatus } from './content.js';

/**
 * Content 固有のリポジトリエラー
 */
export type ContentRepositoryError = RepositoryError | 'title_conflict';

/**
 * コンテンツ一覧取得フィルター
 */
export interface ContentFilters {
  authorId?: string;
  status?: ContentStatus;
}

/**
 * ページネーションオプション
 */
export interface ContentPaginationOptions {
  page: number;
  limit: number;
}

/**
 * ページネーション結果
 */
export interface ContentPaginatedResult {
  data: Content[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Content リポジトリのインターフェース
 *
 * Repository<Content, ContentId> を継承することで CRUD の基本操作
 * (findById, exists, save, update, delete) を持つ。
 * ドメイン固有の検索メソッドはここに追加する。
 */
export interface ContentRepository extends Repository<Content, ContentId> {
  /**
   * 著者IDとステータスでコンテンツ一覧を取得
   */
  findAll(
    filters: ContentFilters,
    pagination: ContentPaginationOptions
  ): Promise<Result<ContentPaginatedResult, ContentRepositoryError>>;

  /**
   * 著者IDでコンテンツ一覧を取得（簡易版）
   */
  findByAuthorId(authorId: string): Promise<Result<Content[], ContentRepositoryError>>;
}
