/**
 * @what RefreshToken ドメインエンティティのユニットテスト
 * @why JWTリフレッシュトークンの有効性検証・失効ロジックを保証する
 */

import { describe, it, expect } from 'vitest';
import { RefreshToken, RefreshTokenId, TokenHash } from './refresh-token.js';
import { AuthUserId } from './auth-user.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_USER_UUID = '660e8400-e29b-41d4-a716-446655440000';

describe('RefreshTokenId', () => {
  it('should create RefreshTokenId with valid UUID', () => {
    const id = new RefreshTokenId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });

  it('should throw on invalid UUID format', () => {
    expect(() => new RefreshTokenId('invalid-uuid')).toThrow();
  });

  it('should compare equality correctly', () => {
    const id1 = new RefreshTokenId(VALID_UUID);
    const id2 = new RefreshTokenId(VALID_UUID);
    const id3 = new RefreshTokenId('660e8400-e29b-41d4-a716-446655440000');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});

describe('TokenHash', () => {
  it('should create TokenHash value object', () => {
    const hash = TokenHash.create('sha256:abcdef1234567890');
    expect(hash.value).toBe('sha256:abcdef1234567890');
  });

  it('should preserve hash value exactly', () => {
    const rawHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const hash = TokenHash.create(rawHash);
    expect(hash.value).toBe(rawHash);
  });

  it('should compare equality correctly', () => {
    const hash1 = TokenHash.create('hash-value-123');
    const hash2 = TokenHash.create('hash-value-123');
    const hash3 = TokenHash.create('different-hash');

    expect(hash1.equals(hash2)).toBe(true);
    expect(hash1.equals(hash3)).toBe(false);
  });
});

describe('RefreshToken', () => {
  const buildValidParams = () => ({
    id: new RefreshTokenId(VALID_UUID),
    userId: new AuthUserId(VALID_USER_UUID),
    tokenHash: TokenHash.create('sha256:valid-hash-value'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });

  describe('create', () => {
    it('should create RefreshToken with valid params', () => {
      const params = buildValidParams();
      const result = RefreshToken.create(params);

      expect(result.isSuccess()).toBe(true);
      const token = result.value;
      expect(token.id.value).toBe(VALID_UUID);
      expect(token.userId.value).toBe(VALID_USER_UUID);
      expect(token.tokenHash.value).toBe('sha256:valid-hash-value');
      expect(token.expiresAt).toEqual(params.expiresAt);
      expect(token.revokedAt).toBeNull();
      expect(token.createdAt).toBeInstanceOf(Date);
    });

    it('should set createdAt to current time', () => {
      const before = new Date();
      const result = RefreshToken.create(buildValidParams());
      const after = new Date();

      expect(result.isSuccess()).toBe(true);
      const token = result.value;
      expect(token.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(token.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should not be revoked on creation', () => {
      const result = RefreshToken.create(buildValidParams());
      expect(result.value.revokedAt).toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore RefreshToken from persisted data', () => {
      const id = new RefreshTokenId(VALID_UUID);
      const userId = new AuthUserId(VALID_USER_UUID);
      const tokenHash = TokenHash.create('sha256:persisted-hash');
      const expiresAt = new Date('2025-01-01T00:00:00Z');
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const revokedAt = null;

      const token = RefreshToken.restore(id, userId, tokenHash, expiresAt, createdAt, revokedAt);

      expect(token.id.value).toBe(VALID_UUID);
      expect(token.userId.value).toBe(VALID_USER_UUID);
      expect(token.tokenHash.value).toBe('sha256:persisted-hash');
      expect(token.expiresAt).toEqual(expiresAt);
      expect(token.createdAt).toEqual(createdAt);
      expect(token.revokedAt).toBeNull();
    });

    it('should restore already-revoked token', () => {
      const id = new RefreshTokenId(VALID_UUID);
      const userId = new AuthUserId(VALID_USER_UUID);
      const tokenHash = TokenHash.create('sha256:revoked-hash');
      const expiresAt = new Date('2025-01-01T00:00:00Z');
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const revokedAt = new Date('2024-06-01T00:00:00Z');

      const token = RefreshToken.restore(id, userId, tokenHash, expiresAt, createdAt, revokedAt);

      expect(token.revokedAt).toEqual(revokedAt);
    });
  });

  describe('isValid', () => {
    it('should return true for unexpired and not-revoked token', () => {
      const result = RefreshToken.create(buildValidParams());
      const token = result.value;

      expect(token.isValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      const params = {
        ...buildValidParams(),
        expiresAt: new Date('2020-01-01T00:00:00Z'), // past date
      };
      const result = RefreshToken.create(params);
      const token = result.value;

      expect(token.isValid()).toBe(false);
    });

    it('should return false after revocation', () => {
      const result = RefreshToken.create(buildValidParams());
      const token = result.value;

      token.revoke();
      expect(token.isValid()).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should revoke a valid token', () => {
      const result = RefreshToken.create(buildValidParams());
      const token = result.value;

      const revokeResult = token.revoke();

      expect(revokeResult.isSuccess()).toBe(true);
      expect(token.revokedAt).toBeInstanceOf(Date);
    });

    it('should set revokedAt to current time', () => {
      const result = RefreshToken.create(buildValidParams());
      const token = result.value;
      const before = new Date();

      token.revoke();
      const after = new Date();

      expect(token.revokedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(token.revokedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should fail when revoking an already-revoked token', () => {
      const result = RefreshToken.create(buildValidParams());
      const token = result.value;

      token.revoke(); // First revocation
      const secondRevoke = token.revoke(); // Should fail

      expect(secondRevoke.isFailure()).toBe(true);
      expect(secondRevoke.error).toBe('already_revoked');
    });
  });
});
