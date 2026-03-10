/**
 * @what PasswordResetToken ドメインエンティティのユニットテスト
 * @why パスワードリセットトークンの有効性検証・使用済みマークロジックを保証する
 */

import { describe, it, expect } from 'vitest';
import { PasswordResetToken, PasswordResetTokenId } from './password-reset-token.js';
import { TokenHash } from './refresh-token.js';
import { AuthUserId } from './auth-user.js';

const VALID_TOKEN_UUID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_USER_UUID = '660e8400-e29b-41d4-a716-446655440001';

describe('PasswordResetTokenId', () => {
  it('should create PasswordResetTokenId with valid UUID', () => {
    const id = new PasswordResetTokenId(VALID_TOKEN_UUID);
    expect(id.value).toBe(VALID_TOKEN_UUID);
  });

  it('should throw on invalid UUID format', () => {
    expect(() => new PasswordResetTokenId('invalid-uuid')).toThrow();
  });

  it('should compare equality correctly', () => {
    const id1 = new PasswordResetTokenId(VALID_TOKEN_UUID);
    const id2 = new PasswordResetTokenId(VALID_TOKEN_UUID);
    const id3 = new PasswordResetTokenId('770e8400-e29b-41d4-a716-446655440001');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

describe('PasswordResetToken', () => {
  const buildValidParams = () => ({
    id: new PasswordResetTokenId(VALID_TOKEN_UUID),
    userId: new AuthUserId(VALID_USER_UUID),
    tokenHash: TokenHash.create('sha256:reset-token-hash'),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  });

  describe('create', () => {
    it('should create PasswordResetToken with valid params', () => {
      const params = buildValidParams();
      const result = PasswordResetToken.create(params);

      expect(result.isSuccess()).toBe(true);
      const token = result.value;
      expect(token.id.value).toBe(VALID_TOKEN_UUID);
      expect(token.userId.value).toBe(VALID_USER_UUID);
      expect(token.tokenHash.value).toBe('sha256:reset-token-hash');
      expect(token.expiresAt).toEqual(params.expiresAt);
      expect(token.usedAt).toBeNull();
      expect(token.createdAt).toBeInstanceOf(Date);
    });

    it('should set createdAt to current time', () => {
      const before = new Date();
      const result = PasswordResetToken.create(buildValidParams());
      const after = new Date();

      expect(result.isSuccess()).toBe(true);
      const token = result.value;
      expect(token.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(token.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should not be used on creation', () => {
      const result = PasswordResetToken.create(buildValidParams());
      expect(result.value.usedAt).toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore PasswordResetToken from persisted data', () => {
      const id = new PasswordResetTokenId(VALID_TOKEN_UUID);
      const userId = new AuthUserId(VALID_USER_UUID);
      const tokenHash = TokenHash.create('sha256:persisted-reset-hash');
      const expiresAt = new Date('2025-01-01T00:00:00Z');
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const usedAt = null;

      const token = PasswordResetToken.restore(id, userId, tokenHash, expiresAt, createdAt, usedAt);

      expect(token.id.value).toBe(VALID_TOKEN_UUID);
      expect(token.userId.value).toBe(VALID_USER_UUID);
      expect(token.tokenHash.value).toBe('sha256:persisted-reset-hash');
      expect(token.expiresAt).toEqual(expiresAt);
      expect(token.createdAt).toEqual(createdAt);
      expect(token.usedAt).toBeNull();
    });

    it('should restore already-used token', () => {
      const id = new PasswordResetTokenId(VALID_TOKEN_UUID);
      const userId = new AuthUserId(VALID_USER_UUID);
      const tokenHash = TokenHash.create('sha256:used-reset-hash');
      const expiresAt = new Date('2025-01-01T00:00:00Z');
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const usedAt = new Date('2024-01-01T01:00:00Z');

      const token = PasswordResetToken.restore(id, userId, tokenHash, expiresAt, createdAt, usedAt);

      expect(token.usedAt).toEqual(usedAt);
    });
  });

  describe('isValid', () => {
    it('should return true for unexpired and unused token', () => {
      const result = PasswordResetToken.create(buildValidParams());
      const token = result.value;

      expect(token.isValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      const params = {
        ...buildValidParams(),
        expiresAt: new Date('2020-01-01T00:00:00Z'), // past date
      };
      const result = PasswordResetToken.create(params);
      const token = result.value;

      expect(token.isValid()).toBe(false);
    });

    it('should return false after being used', () => {
      const result = PasswordResetToken.create(buildValidParams());
      const token = result.value;

      token.markAsUsed();
      expect(token.isValid()).toBe(false);
    });
  });

  describe('markAsUsed', () => {
    it('should mark a valid token as used', () => {
      const result = PasswordResetToken.create(buildValidParams());
      const token = result.value;

      const useResult = token.markAsUsed();

      expect(useResult.isSuccess()).toBe(true);
      expect(token.usedAt).toBeInstanceOf(Date);
    });

    it('should set usedAt to current time', () => {
      const result = PasswordResetToken.create(buildValidParams());
      const token = result.value;
      const before = new Date();

      token.markAsUsed();
      const after = new Date();

      expect(token.usedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(token.usedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should fail when marking an already-used token', () => {
      const result = PasswordResetToken.create(buildValidParams());
      const token = result.value;

      token.markAsUsed(); // First use
      const secondUse = token.markAsUsed(); // Should fail

      expect(secondUse.isFailure()).toBe(true);
      expect(secondUse.error).toBe('already_used');
    });

    it('should fail when marking an expired token', () => {
      const params = {
        ...buildValidParams(),
        expiresAt: new Date('2020-01-01T00:00:00Z'), // past date
      };
      const result = PasswordResetToken.create(params);
      const token = result.value;

      const useResult = token.markAsUsed();

      expect(useResult.isFailure()).toBe(true);
      expect(useResult.error).toBe('expired');
    });
  });
});
