/**
 * @what AuditLog ドメインエンティティのユニットテスト
 * @why 監査ログの生成・復元ロジックと不変性ルールを保証する
 */

import { describe, it, expect } from 'vitest';
import { AuditLog, AuditLogId, AuditActions } from './audit-log.js';
import type { AuditAction } from './audit-log.js';

describe('AuditLogId', () => {
  it('should create AuditLogId with valid UUID', () => {
    const id = new AuditLogId('550e8400-e29b-41d4-a716-446655440000');
    expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should throw on invalid UUID format', () => {
    expect(() => new AuditLogId('not-a-uuid')).toThrow();
  });

  it('should generate a valid UUID', () => {
    const id = AuditLogId.generate();
    expect(id.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const id1 = AuditLogId.generate();
    const id2 = AuditLogId.generate();
    expect(id1.value).not.toBe(id2.value);
  });

  it('should compare equality correctly', () => {
    const id1 = new AuditLogId('550e8400-e29b-41d4-a716-446655440000');
    const id2 = new AuditLogId('550e8400-e29b-41d4-a716-446655440000');
    const id3 = new AuditLogId('660e8400-e29b-41d4-a716-446655440000');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

describe('AuditActions constant', () => {
  it('should contain all expected action types', () => {
    expect(AuditActions.Create).toBe('create');
    expect(AuditActions.Update).toBe('update');
    expect(AuditActions.Delete).toBe('delete');
  });

  it('should be used as discriminated type', () => {
    const action: AuditAction = AuditActions.Create;
    expect(action).toBe('create');
  });
});

describe('AuditLog', () => {
  const buildValidParams = () => ({
    id: new AuditLogId('550e8400-e29b-41d4-a716-446655440000'),
    actorId: 'actor-user-123',
    entityType: 'User',
    entityId: 'user-456',
    action: AuditActions.Update as AuditAction,
  });

  describe('create', () => {
    it('should create AuditLog with required params', () => {
      const params = buildValidParams();
      const log = AuditLog.create(params);

      expect(log.id.value).toBe(params.id.value);
      expect(log.actorId).toBe('actor-user-123');
      expect(log.entityType).toBe('User');
      expect(log.entityId).toBe('user-456');
      expect(log.action).toBe('update');
      expect(log.changes).toBeNull();
      expect(log.metadata).toBeNull();
      expect(log.ipAddress).toBeNull();
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('should set timestamp to current time when not provided', () => {
      const before = new Date();
      const params = buildValidParams();
      const log = AuditLog.create(params);
      const after = new Date();

      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided timestamp', () => {
      const fixedTime = new Date('2024-01-15T10:00:00Z');
      const params = { ...buildValidParams(), timestamp: fixedTime };
      const log = AuditLog.create(params);

      expect(log.timestamp).toEqual(fixedTime);
    });

    it('should create AuditLog with changes', () => {
      const changes = {
        before: { name: 'Old Name' },
        after: { name: 'New Name' },
      };
      const params = { ...buildValidParams(), changes };
      const log = AuditLog.create(params);

      expect(log.changes).toEqual(changes);
      expect(log.changes?.before).toEqual({ name: 'Old Name' });
      expect(log.changes?.after).toEqual({ name: 'New Name' });
    });

    it('should create AuditLog with metadata', () => {
      const metadata = { requestId: 'req-123', userAgent: 'Mozilla/5.0' };
      const params = { ...buildValidParams(), metadata };
      const log = AuditLog.create(params);

      expect(log.metadata).toEqual(metadata);
    });

    it('should create AuditLog with ipAddress', () => {
      const params = { ...buildValidParams(), ipAddress: '192.168.1.1' };
      const log = AuditLog.create(params);

      expect(log.ipAddress).toBe('192.168.1.1');
    });

    it('should create AuditLog with null changes explicitly', () => {
      const params = { ...buildValidParams(), changes: null };
      const log = AuditLog.create(params);

      expect(log.changes).toBeNull();
    });

    it('should create AuditLog with generic entity types', () => {
      const entityTypes = ['User', 'AuthUser', 'CustomEntity'];

      for (const entityType of entityTypes) {
        const params = { ...buildValidParams(), entityType };
        const log = AuditLog.create(params);
        expect(log.entityType).toBe(entityType);
      }
    });

    it('should create AuditLog with all action types', () => {
      const actions: AuditAction[] = ['create', 'update', 'delete'];

      for (const action of actions) {
        const params = { ...buildValidParams(), action };
        const log = AuditLog.create(params);
        expect(log.action).toBe(action);
      }
    });
  });

  describe('restore', () => {
    it('should restore AuditLog from persisted data', () => {
      const id = new AuditLogId('550e8400-e29b-41d4-a716-446655440000');
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const changes = { before: { name: 'Old' }, after: { name: 'New' } };
      const metadata = { source: 'api' };

      const log = AuditLog.restore(
        id,
        'actor-123',
        'User',
        'entity-456',
        'create',
        changes,
        metadata,
        '10.0.0.1',
        timestamp
      );

      expect(log.id.value).toBe(id.value);
      expect(log.actorId).toBe('actor-123');
      expect(log.entityType).toBe('User');
      expect(log.entityId).toBe('entity-456');
      expect(log.action).toBe('create');
      expect(log.changes).toEqual(changes);
      expect(log.metadata).toEqual(metadata);
      expect(log.ipAddress).toBe('10.0.0.1');
      expect(log.timestamp).toEqual(timestamp);
    });

    it('should restore with null changes and metadata', () => {
      const id = new AuditLogId('550e8400-e29b-41d4-a716-446655440000');
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const log = AuditLog.restore(
        id,
        'actor-123',
        'User',
        'entity-789',
        'delete',
        null,
        null,
        null,
        timestamp
      );

      expect(log.changes).toBeNull();
      expect(log.metadata).toBeNull();
      expect(log.ipAddress).toBeNull();
    });
  });
});
