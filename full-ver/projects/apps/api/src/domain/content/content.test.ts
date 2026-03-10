/**
 * @what Content エンティティのユニットテスト
 * @why ドメインロジックの正確性を保証する
 */

import { describe, it, expect } from 'vitest';
import {
  Content,
  ContentId,
  ContentStatuses,
  ContentCreatedEvent,
  ContentTitleChangedEvent,
  ContentPublishedEvent,
} from './content.js';

// ---------------------------------------------------------------------------
// テストヘルパー
// ---------------------------------------------------------------------------

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const AUTHOR_UUID = '660e8400-e29b-41d4-a716-446655440001';

const createValidParams = () => ({
  id: new ContentId(VALID_UUID),
  title: 'Test Content Title',
  body: 'This is the content body.',
  authorId: AUTHOR_UUID,
  causationId: 'causation-1',
  correlationId: 'correlation-1',
});

// ---------------------------------------------------------------------------
// ContentId のテスト
// ---------------------------------------------------------------------------

describe('ContentId', () => {
  it('should create a valid ContentId', () => {
    const id = new ContentId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });

  it('should throw on invalid UUID format', () => {
    expect(() => new ContentId('invalid-uuid')).toThrow();
  });

  it('should compare equality correctly', () => {
    const id1 = new ContentId(VALID_UUID);
    const id2 = new ContentId(VALID_UUID);
    const id3 = new ContentId('660e8400-e29b-41d4-a716-446655440000');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });

  it('should generate a valid UUID', () => {
    const id = ContentId.generate();
    expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const id1 = ContentId.generate();
    const id2 = ContentId.generate();
    expect(id1.value).not.toBe(id2.value);
  });
});

// ---------------------------------------------------------------------------
// Content.create() のテスト
// ---------------------------------------------------------------------------

describe('Content.create', () => {
  it('should create content with valid parameters', () => {
    const params = createValidParams();
    const result = Content.create(params);

    expect(result.isSuccess()).toBe(true);
    const content = result.value;
    expect(content.id.value).toBe(VALID_UUID);
    expect(content.title).toBe('Test Content Title');
    expect(content.body).toBe('This is the content body.');
    expect(content.authorId).toBe(AUTHOR_UUID);
    expect(content.status).toBe(ContentStatuses.Draft);
    expect(content.publishedAt).toBeNull();
    expect(content.version).toBe(0);
  });

  it('should emit ContentCreatedEvent on creation', () => {
    const params = createValidParams();
    const result = Content.create(params);

    expect(result.isSuccess()).toBe(true);
    const content = result.value;
    const events = content.getDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ContentCreatedEvent);

    const event = events[0] as ContentCreatedEvent;
    expect(event.contentId).toBe(VALID_UUID);
    expect(event.title).toBe('Test Content Title');
    expect(event.authorId).toBe(AUTHOR_UUID);
    expect(event.causationId).toBe('causation-1');
    expect(event.correlationId).toBe('correlation-1');
  });

  it('should fail when title is empty', () => {
    const params = { ...createValidParams(), title: '' };
    const result = Content.create(params);

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('invalid_title');
  });

  it('should fail when title exceeds 200 characters', () => {
    const params = { ...createValidParams(), title: 'a'.repeat(201) };
    const result = Content.create(params);

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('invalid_title');
  });

  it('should succeed with title exactly 1 character', () => {
    const params = { ...createValidParams(), title: 'A' };
    const result = Content.create(params);

    expect(result.isSuccess()).toBe(true);
  });

  it('should succeed with title exactly 200 characters', () => {
    const params = { ...createValidParams(), title: 'a'.repeat(200) };
    const result = Content.create(params);

    expect(result.isSuccess()).toBe(true);
  });

  it('should fail when body exceeds 50000 characters', () => {
    const params = { ...createValidParams(), body: 'a'.repeat(50_001) };
    const result = Content.create(params);

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('invalid_body');
  });

  it('should succeed with empty body', () => {
    const params = { ...createValidParams(), body: '' };
    const result = Content.create(params);

    expect(result.isSuccess()).toBe(true);
  });

  it('should succeed with body exactly 50000 characters', () => {
    const params = { ...createValidParams(), body: 'a'.repeat(50_000) };
    const result = Content.create(params);

    expect(result.isSuccess()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Content.restore() のテスト
// ---------------------------------------------------------------------------

describe('Content.restore', () => {
  it('should restore content from persisted data', () => {
    const id = new ContentId(VALID_UUID);
    const content = Content.restore(
      id,
      'Restored Title',
      'Restored body',
      AUTHOR_UUID,
      ContentStatuses.Published,
      new Date('2024-01-01T00:00:00Z'),
      3
    );

    expect(content.id.value).toBe(VALID_UUID);
    expect(content.title).toBe('Restored Title');
    expect(content.body).toBe('Restored body');
    expect(content.authorId).toBe(AUTHOR_UUID);
    expect(content.status).toBe(ContentStatuses.Published);
    expect(content.publishedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
    expect(content.version).toBe(3);
    expect(content.getDomainEvents()).toHaveLength(0);
  });

  it('should restore draft content with null publishedAt', () => {
    const id = new ContentId(VALID_UUID);
    const content = Content.restore(
      id,
      'Draft Title',
      'Draft body',
      AUTHOR_UUID,
      ContentStatuses.Draft,
      null,
      0
    );

    expect(content.status).toBe(ContentStatuses.Draft);
    expect(content.publishedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Content.changeTitle() のテスト
// ---------------------------------------------------------------------------

describe('Content.changeTitle', () => {
  it('should change title and emit event', () => {
    const params = createValidParams();
    const content = Content.create(params).value;
    content.clearDomainEvents();

    const result = content.changeTitle('New Title', 'cause-2', 'corr-2');

    expect(result.isSuccess()).toBe(true);
    expect(content.title).toBe('New Title');
    expect(content.version).toBe(1);

    const events = content.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ContentTitleChangedEvent);

    const event = events[0] as ContentTitleChangedEvent;
    expect(event.oldTitle).toBe('Test Content Title');
    expect(event.newTitle).toBe('New Title');
    expect(event.causationId).toBe('cause-2');
    expect(event.correlationId).toBe('corr-2');
  });

  it('should fail when new title is empty', () => {
    const content = Content.create(createValidParams()).value;
    content.clearDomainEvents();

    const result = content.changeTitle('', 'cause-2', 'corr-2');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('invalid_title');
    expect(content.title).toBe('Test Content Title');
    expect(content.version).toBe(0);
    expect(content.getDomainEvents()).toHaveLength(0);
  });

  it('should fail when title exceeds 200 characters', () => {
    const content = Content.create(createValidParams()).value;
    content.clearDomainEvents();

    const result = content.changeTitle('a'.repeat(201), 'cause-2', 'corr-2');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('invalid_title');
    expect(content.getDomainEvents()).toHaveLength(0);
  });

  it('should fail when changing to same title', () => {
    const content = Content.create(createValidParams()).value;
    content.clearDomainEvents();

    const result = content.changeTitle('Test Content Title', 'cause-2', 'corr-2');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('same_title');
    expect(content.version).toBe(0);
    expect(content.getDomainEvents()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Content.publish() のテスト
// ---------------------------------------------------------------------------

describe('Content.publish', () => {
  it('should publish a draft content and emit event', () => {
    const content = Content.create(createValidParams()).value;
    content.clearDomainEvents();

    const before = new Date();
    const result = content.publish('cause-3', 'corr-3');
    const after = new Date();

    expect(result.isSuccess()).toBe(true);
    expect(content.status).toBe(ContentStatuses.Published);
    expect(content.publishedAt).not.toBeNull();
    expect((content.publishedAt as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect((content.publishedAt as Date).getTime()).toBeLessThanOrEqual(after.getTime());
    expect(content.version).toBe(1);

    const events = content.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ContentPublishedEvent);

    const event = events[0] as ContentPublishedEvent;
    expect(event.causationId).toBe('cause-3');
    expect(event.correlationId).toBe('corr-3');
  });

  it('should fail when content is already published', () => {
    const content = Content.create(createValidParams()).value;
    content.publish('cause-3', 'corr-3');
    content.clearDomainEvents();

    const result = content.publish('cause-4', 'corr-4');

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('already_published');
    expect(content.getDomainEvents()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ContentStatuses 定数のテスト
// ---------------------------------------------------------------------------

describe('ContentStatuses', () => {
  it('should contain expected status values', () => {
    expect(ContentStatuses.Draft).toBe('draft');
    expect(ContentStatuses.Published).toBe('published');
  });
});
