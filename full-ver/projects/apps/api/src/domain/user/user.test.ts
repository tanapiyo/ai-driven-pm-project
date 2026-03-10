/**
 * @what ユーザーエンティティのユニットテスト
 * @why ドメインロジックの正確性を保証
 */

import { describe, it, expect } from 'vitest';
import { Email } from '@monorepo/shared';
import {
  User,
  UserId,
  UserCreatedEvent,
  UserEmailChangedEvent,
  UserNameChangedEvent,
} from './user.js';

describe('User', () => {
  const createValidParams = () => ({
    id: new UserId('550e8400-e29b-41d4-a716-446655440000'),
    email: Email.create('test@example.com'),
    name: 'Test User',
    causationId: 'causation-1',
    correlationId: 'correlation-1',
  });

  describe('create', () => {
    it('should create a user with valid parameters', () => {
      const params = createValidParams();
      const result = User.create(params);

      expect(result.isSuccess()).toBe(true);
      const user = result.value;
      expect(user.id.value).toBe(params.id.value);
      expect(user.email.value).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.version).toBe(0);
    });

    it('should emit UserCreatedEvent on creation', () => {
      const params = createValidParams();
      const result = User.create(params);

      expect(result.isSuccess()).toBe(true);
      const user = result.value;
      const events = user.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserCreatedEvent);

      const event = events[0] as UserCreatedEvent;
      expect(event.userId).toBe(params.id.value);
      expect(event.email).toBe('test@example.com');
      expect(event.name).toBe('Test User');
      expect(event.causationId).toBe('causation-1');
      expect(event.correlationId).toBe('correlation-1');
    });

    it('should fail when name is empty', () => {
      const params = { ...createValidParams(), name: '' };
      const result = User.create(params);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_name');
    });

    it('should fail when name exceeds 100 characters', () => {
      const params = { ...createValidParams(), name: 'a'.repeat(101) };
      const result = User.create(params);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_name');
    });

    it('should succeed with name exactly 100 characters', () => {
      const params = { ...createValidParams(), name: 'a'.repeat(100) };
      const result = User.create(params);

      expect(result.isSuccess()).toBe(true);
    });

    it('should succeed with name exactly 1 character', () => {
      const params = { ...createValidParams(), name: 'A' };
      const result = User.create(params);

      expect(result.isSuccess()).toBe(true);
    });
  });

  describe('restore', () => {
    it('should restore user from persisted data', () => {
      const id = new UserId('550e8400-e29b-41d4-a716-446655440000');
      const email = Email.create('test@example.com');
      const user = User.restore(id, email, 'Restored User', 5);

      expect(user.id.value).toBe(id.value);
      expect(user.email.value).toBe('test@example.com');
      expect(user.name).toBe('Restored User');
      expect(user.version).toBe(5);
      expect(user.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('changeEmail', () => {
    it('should change email and emit event', () => {
      const params = createValidParams();
      const user = User.create(params).value;
      user.clearDomainEvents();

      const newEmail = Email.create('new@example.com');
      const result = user.changeEmail(newEmail, 'cause-2', 'corr-2');

      expect(result.isSuccess()).toBe(true);
      expect(user.email.value).toBe('new@example.com');
      expect(user.version).toBe(1);

      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserEmailChangedEvent);

      const event = events[0] as UserEmailChangedEvent;
      expect(event.oldEmail).toBe('test@example.com');
      expect(event.newEmail).toBe('new@example.com');
      expect(event.causationId).toBe('cause-2');
      expect(event.correlationId).toBe('corr-2');
    });

    it('should fail when changing to same email', () => {
      const params = createValidParams();
      const user = User.create(params).value;
      user.clearDomainEvents();

      const sameEmail = Email.create('test@example.com');
      const result = user.changeEmail(sameEmail, 'cause-2', 'corr-2');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('same_email');
      expect(user.version).toBe(0);
      expect(user.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('changeName', () => {
    it('should change name and emit event', () => {
      const params = createValidParams();
      const user = User.create(params).value;
      user.clearDomainEvents();

      const result = user.changeName('New Name', 'cause-3', 'corr-3');

      expect(result.isSuccess()).toBe(true);
      expect(user.name).toBe('New Name');
      expect(user.version).toBe(1);

      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserNameChangedEvent);

      const event = events[0] as UserNameChangedEvent;
      expect(event.oldName).toBe('Test User');
      expect(event.newName).toBe('New Name');
      expect(event.causationId).toBe('cause-3');
      expect(event.correlationId).toBe('corr-3');
    });

    it('should fail when name is empty', () => {
      const params = createValidParams();
      const user = User.create(params).value;
      user.clearDomainEvents();
      const initialVersion = user.version;

      const result = user.changeName('', 'cause-3', 'corr-3');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_name');
      expect(user.name).toBe('Test User');
      expect(user.version).toBe(initialVersion);
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('should fail when name exceeds 100 characters', () => {
      const params = createValidParams();
      const user = User.create(params).value;
      user.clearDomainEvents();

      const result = user.changeName('a'.repeat(101), 'cause-3', 'corr-3');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_name');
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('should fail when changing to same name', () => {
      const params = createValidParams();
      const user = User.create(params).value;
      user.clearDomainEvents();

      const result = user.changeName('Test User', 'cause-3', 'corr-3');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('same_name');
      expect(user.version).toBe(0);
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('should succeed with boundary values', () => {
      const params = createValidParams();
      const user = User.create(params).value;

      expect(user.changeName('A', 'cause-3', 'corr-3').isSuccess()).toBe(true);
      expect(user.changeName('a'.repeat(100), 'cause-3', 'corr-3').isSuccess()).toBe(true);
    });
  });
});

describe('UserId', () => {
  it('should create valid UserId', () => {
    const id = new UserId('550e8400-e29b-41d4-a716-446655440000');
    expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should throw on invalid UUID format', () => {
    expect(() => new UserId('invalid-uuid')).toThrow();
  });

  it('should compare equality correctly', () => {
    const id1 = new UserId('550e8400-e29b-41d4-a716-446655440000');
    const id2 = new UserId('550e8400-e29b-41d4-a716-446655440000');
    const id3 = new UserId('660e8400-e29b-41d4-a716-446655440000');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});
