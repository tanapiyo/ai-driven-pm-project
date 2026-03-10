/**
 * @what Content ドメインのエクスポート（公開API）
 * @why content ドメインの公開APIを明示し、内部実装の詳細を隠蔽する
 */

export {
  Content,
  ContentId,
  ContentStatuses,
  ContentCreatedEvent,
  ContentTitleChangedEvent,
  ContentPublishedEvent,
  type ContentStatus,
  type CreateContentParams,
} from './content.js';

export type {
  ContentRepository,
  ContentRepositoryError,
  ContentFilters,
  ContentPaginationOptions,
  ContentPaginatedResult,
} from './content-repository.js';
