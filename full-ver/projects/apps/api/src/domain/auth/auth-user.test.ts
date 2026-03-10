/**
 * @what 認証ユーザーエンティティのユニットテスト
 * @why 認証ドメインロジックの正確性を保証
 */

import { describe, it, expect } from 'vitest';
import { Email } from '@monorepo/shared';
import {
  AuthUser,
  AuthUserId,
  PasswordHash,
  AuthUserRegisteredEvent,
  PasswordChangedEvent,
} from './auth-user.js';

describe('AuthUser', () => {
  const createValidParams = () => ({
    id: new AuthUserId('550e8400-e29b-41d4-a716-446655440000'),
    email: Email.create('test@example.com'),
    passwordHash: PasswordHash.create('$2b$12$hashedpassword'),
    causationId: 'causation-1',
    correlationId: 'correlation-1',
  });

  describe('create', () => {
    it('should create an auth user with valid parameters', () => {
      const params = createValidParams();
      const result = AuthUser.create(params);

      expect(result.isSuccess()).toBe(true);
      const user = result.value;
      expect(user.id.value).toBe(params.id.value);
      expect(user.email.value).toBe('test@example.com');
      expect(user.passwordHash.value).toBe('$2b$12$hashedpassword');
      expect(user.version).toBe(0);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.deletedAt).toBeNull();
    });

    it('should default role to user', () => {
      const params = createValidParams();
      const result = AuthUser.create(params);

      expect(result.isSuccess()).toBe(true);
      expect(result.value.role).toBe('user');
    });

    it('should emit AuthUserRegisteredEvent on creation', () => {
      const params = createValidParams();
      const result = AuthUser.create(params);

      expect(result.isSuccess()).toBe(true);
      const user = result.value;
      const events = user.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AuthUserRegisteredEvent);

      const event = events[0] as AuthUserRegisteredEvent;
      expect(event.userId).toBe(params.id.value);
      expect(event.email).toBe('test@example.com');
      expect(event.causationId).toBe('causation-1');
      expect(event.correlationId).toBe('correlation-1');
    });

    it('should set createdAt and updatedAt to current time', () => {
      const before = new Date();
      const params = createValidParams();
      const user = AuthUser.create(params).value;
      const after = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('restore', () => {
    it('should restore auth user from persisted data', () => {
      const id = new AuthUserId('550e8400-e29b-41d4-a716-446655440000');
      const email = Email.create('test@example.com');
      const name = 'Test User';
      const role = 'user' as const;
      const status = 'active' as const;
      const passwordHash = PasswordHash.create('$2b$12$hashedpassword');
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const user = AuthUser.restore(
        id,
        email,
        name,
        role,
        status,
        passwordHash,
        createdAt,
        updatedAt,
        null,
        5
      );

      expect(user.id.value).toBe(id.value);
      expect(user.email.value).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');
      expect(user.deletedAt).toBeNull();
      expect(user.passwordHash.value).toBe('$2b$12$hashedpassword');
      expect(user.createdAt).toEqual(createdAt);
      expect(user.updatedAt).toEqual(updatedAt);
      expect(user.version).toBe(5);
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('should restore admin role', () => {
      const id = new AuthUserId('550e8400-e29b-41d4-a716-446655440000');
      const email = Email.create('admin@example.com');
      const passwordHash = PasswordHash.create('$2b$12$hashedpassword');
      const now = new Date();

      const user = AuthUser.restore(
        id,
        email,
        'Admin',
        'admin',
        'active',
        passwordHash,
        now,
        now,
        null,
        1
      );

      expect(user.role).toBe('admin');
    });
  });

  describe('changePassword', () => {
    it('should change password and emit event', () => {
      const params = createValidParams();
      const user = AuthUser.create(params).value;
      user.clearDomainEvents();
      const initialVersion = user.version;
      const initialUpdatedAt = user.updatedAt;

      const newHash = PasswordHash.create('$2b$12$newhashedpassword');
      const result = user.changePassword(newHash, 'cause-2', 'corr-2');

      expect(result.isSuccess()).toBe(true);
      expect(user.passwordHash.value).toBe('$2b$12$newhashedpassword');
      expect(user.version).toBe(initialVersion + 1);
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());

      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PasswordChangedEvent);

      const event = events[0] as PasswordChangedEvent;
      expect(event.causationId).toBe('cause-2');
      expect(event.correlationId).toBe('corr-2');
      expect(event.aggregateVersion).toBe(initialVersion + 1);
    });

    it('should update updatedAt timestamp', () => {
      const params = createValidParams();
      const user = AuthUser.create(params).value;
      const originalUpdatedAt = user.updatedAt;

      const newHash = PasswordHash.create('$2b$12$newhashedpassword');
      user.changePassword(newHash, 'cause', 'corr');

      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('isActive', () => {
    it('should return true for active user', () => {
      const params = createValidParams();
      const user = AuthUser.create(params).value;
      expect(user.isActive()).toBe(true);
    });

    it('should return false after deactivation', () => {
      const params = createValidParams();
      const user = AuthUser.create(params).value;
      user.deactivate();
      expect(user.isActive()).toBe(false);
    });
  });
});

describe('AuthUserId', () => {
  it('should create valid AuthUserId', () => {
    const id = new AuthUserId('550e8400-e29b-41d4-a716-446655440000');
    expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should throw on invalid UUID format', () => {
    expect(() => new AuthUserId('invalid-uuid')).toThrow();
  });

  it('should compare equality correctly', () => {
    const id1 = new AuthUserId('550e8400-e29b-41d4-a716-446655440000');
    const id2 = new AuthUserId('550e8400-e29b-41d4-a716-446655440000');
    const id3 = new AuthUserId('660e8400-e29b-41d4-a716-446655440000');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

describe('PasswordHash', () => {
  it('should create PasswordHash value object', () => {
    const hash = PasswordHash.create('$2b$12$hashedvalue');
    expect(hash.value).toBe('$2b$12$hashedvalue');
  });

  it('should preserve hash value exactly', () => {
    const originalHash = '$2b$12$somecomplexhashvalue123456789';
    const hash = PasswordHash.create(originalHash);
    expect(hash.value).toBe(originalHash);
  });
});

describe('AuthUserRegisteredEvent', () => {
  it('should create event with correct payload', () => {
    const event = new AuthUserRegisteredEvent('user-123', 'test@example.com', 'cause-1', 'corr-1');

    expect(event.eventType).toBe('AuthUserRegistered');
    expect(event.userId).toBe('user-123');
    expect(event.email).toBe('test@example.com');
    expect(event.causationId).toBe('cause-1');
    expect(event.correlationId).toBe('corr-1');

    const payload = event.toPayload();
    expect(payload.userId).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
  });
});

describe('PasswordChangedEvent', () => {
  it('should create event with correct metadata', () => {
    const event = new PasswordChangedEvent('user-123', 2, 'cause-1', 'corr-1');

    expect(event.eventType).toBe('PasswordChanged');
    expect(event.aggregateId).toBe('user-123');
    expect(event.aggregateVersion).toBe(2);
    expect(event.causationId).toBe('cause-1');
    expect(event.correlationId).toBe('corr-1');

    const payload = event.toPayload();
    expect(payload).toEqual({});
  });
});
