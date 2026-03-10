/**
 * @what Content エンティティ（新規ドメイン追加の雛形）
 * @why 新規ドメイン追加時のガイドとなるサンプル実装
 *
 * domain層のルール:
 * - 外部依存禁止（usecase, presentation, infrastructure をimportしない）
 * - 純粋なビジネスロジックのみ
 * - Result<T>を使ったエラーハンドリング
 * - AggregateRoot を継承してドメインイベントをサポート
 *
 * 新規ドメインを追加する際はこのファイルをテンプレートとして利用してください。
 */

import { AggregateRoot, UUIDIdentifier, Result, DomainEvent } from '@monorepo/shared';

/**
 * コンテンツID（Value Object）
 */
export class ContentId extends UUIDIdentifier {
  protected validate(value: string): void {
    super.validate(value);
    // ドメイン固有の追加バリデーションがあればここに記述する
  }

  static generate(): ContentId {
    return new ContentId(crypto.randomUUID());
  }
}

// ---------------------------------------------------------------------------
// ドメインイベント
// ---------------------------------------------------------------------------

/**
 * コンテンツ作成イベント
 */
export class ContentCreatedEvent extends DomainEvent<'ContentCreated'> {
  constructor(
    public readonly contentId: string,
    public readonly title: string,
    public readonly authorId: string,
    causationId: string,
    correlationId: string
  ) {
    super('ContentCreated', contentId, 1, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      contentId: this.contentId,
      title: this.title,
      authorId: this.authorId,
    };
  }
}

/**
 * コンテンツタイトル変更イベント
 */
export class ContentTitleChangedEvent extends DomainEvent<'ContentTitleChanged'> {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly oldTitle: string,
    public readonly newTitle: string,
    causationId: string,
    correlationId: string
  ) {
    super('ContentTitleChanged', aggregateId, aggregateVersion, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      oldTitle: this.oldTitle,
      newTitle: this.newTitle,
    };
  }
}

/**
 * コンテンツ公開イベント
 */
export class ContentPublishedEvent extends DomainEvent<'ContentPublished'> {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly publishedAt: Date,
    causationId: string,
    correlationId: string
  ) {
    super('ContentPublished', aggregateId, aggregateVersion, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      publishedAt: this.publishedAt.toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// ステータス
// ---------------------------------------------------------------------------

/**
 * コンテンツのステータス定数
 */
export const ContentStatuses = {
  Draft: 'draft',
  Published: 'published',
} as const;

export type ContentStatus = (typeof ContentStatuses)[keyof typeof ContentStatuses];

// ---------------------------------------------------------------------------
// コンテンツ集約
// ---------------------------------------------------------------------------

/**
 * コンテンツ作成パラメータ
 */
export interface CreateContentParams {
  id: ContentId;
  title: string;
  body: string;
  authorId: string;
  causationId: string;
  correlationId: string;
}

/** タイトルの文字数制約 */
const TITLE_MIN_LENGTH = 1;
const TITLE_MAX_LENGTH = 200;

/** 本文の文字数制約 */
const BODY_MAX_LENGTH = 50_000;

/**
 * Content 集約
 *
 * 新規ドメイン追加時のガイドとして、AggregateRoot パターンの使い方を示す。
 * - ファクトリメソッド（create / restore）でインスタンスを生成
 * - ミューテーションはメソッドを通じてのみ行い、ドメインイベントを発行する
 * - Result<T, E> で呼び出し元にエラーを型安全に返す
 */
export class Content extends AggregateRoot<ContentId> {
  private _title: string;
  private _body: string;
  private readonly _authorId: string;
  private _status: ContentStatus;
  private _publishedAt: Date | null;

  private constructor(
    id: ContentId,
    title: string,
    body: string,
    authorId: string,
    status: ContentStatus,
    publishedAt: Date | null
  ) {
    super(id);
    this._title = title;
    this._body = body;
    this._authorId = authorId;
    this._status = status;
    this._publishedAt = publishedAt;
  }

  /**
   * ファクトリメソッド - 新規コンテンツ作成
   */
  static create(params: CreateContentParams): Result<Content, 'invalid_title' | 'invalid_body'> {
    const titleValidation = Content.validateTitle(params.title);
    if (titleValidation !== null) {
      return Result.fail(titleValidation);
    }

    const bodyValidation = Content.validateBody(params.body);
    if (bodyValidation !== null) {
      return Result.fail(bodyValidation);
    }

    const content = new Content(
      params.id,
      params.title,
      params.body,
      params.authorId,
      ContentStatuses.Draft,
      null
    );

    content.addDomainEvent(
      new ContentCreatedEvent(
        params.id.value,
        params.title,
        params.authorId,
        params.causationId,
        params.correlationId
      )
    );

    return Result.ok(content);
  }

  /**
   * 永続化データからリストア
   */
  static restore(
    id: ContentId,
    title: string,
    body: string,
    authorId: string,
    status: ContentStatus,
    publishedAt: Date | null,
    version: number
  ): Content {
    const content = new Content(id, title, body, authorId, status, publishedAt);
    content.setVersion(version);
    return content;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get title(): string {
    return this._title;
  }

  get body(): string {
    return this._body;
  }

  get authorId(): string {
    return this._authorId;
  }

  get status(): ContentStatus {
    return this._status;
  }

  get publishedAt(): Date | null {
    return this._publishedAt;
  }

  // ---------------------------------------------------------------------------
  // ビジネスロジック
  // ---------------------------------------------------------------------------

  /**
   * タイトルを変更する
   */
  changeTitle(
    newTitle: string,
    causationId: string,
    correlationId: string
  ): Result<void, 'invalid_title' | 'same_title'> {
    const validationError = Content.validateTitle(newTitle);
    if (validationError !== null) {
      return Result.fail(validationError);
    }

    if (this._title === newTitle) {
      return Result.fail('same_title');
    }

    const oldTitle = this._title;
    this._title = newTitle;
    this.incrementVersion();

    this.addDomainEvent(
      new ContentTitleChangedEvent(
        this.id.value,
        this.version,
        oldTitle,
        newTitle,
        causationId,
        correlationId
      )
    );

    return Result.ok(undefined);
  }

  /**
   * コンテンツを公開する
   */
  publish(causationId: string, correlationId: string): Result<void, 'already_published'> {
    if (this._status === ContentStatuses.Published) {
      return Result.fail('already_published');
    }

    const now = new Date();
    this._status = ContentStatuses.Published;
    this._publishedAt = now;
    this.incrementVersion();

    this.addDomainEvent(
      new ContentPublishedEvent(this.id.value, this.version, now, causationId, correlationId)
    );

    return Result.ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // バリデーション（private static ヘルパー）
  // ---------------------------------------------------------------------------

  private static validateTitle(title: string): 'invalid_title' | null {
    if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
      return 'invalid_title';
    }
    return null;
  }

  private static validateBody(body: string): 'invalid_body' | null {
    if (body.length > BODY_MAX_LENGTH) {
      return 'invalid_body';
    }
    return null;
  }
}
