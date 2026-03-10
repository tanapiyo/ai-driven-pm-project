/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @what JWTサービスのユニットテスト
 * @why セキュリティクリティカルなトークン生成・検証の正確性を保証
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtServiceImpl, type JwtServiceConfig } from './jwt-service.js';
import type { UserRole } from '@/domain/index.js';

describe('JwtServiceImpl', () => {
  let service: JwtServiceImpl;
  let config: JwtServiceConfig;

  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testEmail = 'test@example.com';
  const testRole: UserRole = 'user';

  beforeEach(() => {
    config = {
      secret: 'test-secret-key-for-testing-purposes-only',
      accessTokenExpiresIn: 900, // 15 minutes
      refreshTokenExpiresIn: 604800, // 7 days
    };
    service = new JwtServiceImpl(config);

    // Mock Date.now for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', () => {
      const result = service.generateTokenPair(testUserId, testEmail, testRole);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.accessToken).toBeTruthy();
      expect(result.value?.refreshToken).toBeTruthy();
      expect(result.value?.accessTokenExpiresIn).toBe(900);
      expect(result.value?.refreshTokenExpiresIn).toBe(604800);
    });

    it('should generate different tokens for access and refresh', () => {
      const result = service.generateTokenPair(testUserId, testEmail, testRole);

      expect(result.isSuccess()).toBe(true);
      expect(result.value?.accessToken).not.toBe(result.value?.refreshToken);
    });

    it('should include correct payload in access token', () => {
      const result = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(result.isSuccess()).toBe(true);

      const decoded = jwt.decode(result.value!.accessToken) as any;
      expect(decoded.sub).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.role).toBe(testRole);
      expect(decoded.type).toBe('access');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it('should include correct payload in refresh token', () => {
      const result = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(result.isSuccess()).toBe(true);

      const decoded = jwt.decode(result.value!.refreshToken) as any;
      expect(decoded.sub).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.role).toBe(testRole);
      expect(decoded.type).toBe('refresh');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(604800);
    });

    it('should generate different tokens for different users', () => {
      const result1 = service.generateTokenPair(testUserId, testEmail, testRole);
      const result2 = service.generateTokenPair('different-user-id', testEmail, testRole);

      expect(result1.isSuccess()).toBe(true);
      expect(result2.isSuccess()).toBe(true);
      expect(result1.value?.accessToken).not.toBe(result2.value?.accessToken);
    });

    it('should generate different tokens for different roles', () => {
      const result1 = service.generateTokenPair(testUserId, testEmail, 'user');
      const result2 = service.generateTokenPair(testUserId, testEmail, 'admin');

      expect(result1.isSuccess()).toBe(true);
      expect(result2.isSuccess()).toBe(true);
      expect(result1.value?.accessToken).not.toBe(result2.value?.accessToken);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const result = service.generateAccessToken(testUserId, testEmail, testRole);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBeTruthy();
      expect(typeof result.value).toBe('string');
    });

    it('should include correct payload in access token', () => {
      const result = service.generateAccessToken(testUserId, testEmail, testRole);
      expect(result.isSuccess()).toBe(true);

      const decoded = jwt.decode(result.value!) as any;
      expect(decoded.sub).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.role).toBe(testRole);
      expect(decoded.type).toBe('access');
      expect(decoded.exp - decoded.iat).toBe(900);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyAccessToken(generateResult.value!.accessToken);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value?.sub).toBe(testUserId);
      expect(verifyResult.value?.email).toBe(testEmail);
      expect(verifyResult.value?.role).toBe(testRole);
    });

    it('should reject refresh token when verifying as access token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyAccessToken(generateResult.value!.refreshToken);

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('invalid_token');
    });

    it('should reject token with invalid signature', () => {
      const differentSecretService = new JwtServiceImpl({
        ...config,
        secret: 'different-secret',
      });
      const generateResult = differentSecretService.generateTokenPair(
        testUserId,
        testEmail,
        testRole
      );
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyAccessToken(generateResult.value!.accessToken);

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('invalid_token');
    });

    it('should reject malformed token', () => {
      const verifyResult = service.verifyAccessToken('not.a.valid.token');

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('invalid_token');
    });

    it('should reject expired token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      // Advance time by 16 minutes (past 15 minute expiry)
      vi.advanceTimersByTime(16 * 60 * 1000);

      const verifyResult = service.verifyAccessToken(generateResult.value!.accessToken);

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('token_expired');
    });

    it('should accept token just before expiry', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      // Advance time by 14 minutes (before 15 minute expiry)
      vi.advanceTimersByTime(14 * 60 * 1000);

      const verifyResult = service.verifyAccessToken(generateResult.value!.accessToken);

      expect(verifyResult.isSuccess()).toBe(true);
    });

    it('should reject empty token', () => {
      const verifyResult = service.verifyAccessToken('');

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('invalid_token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyRefreshToken(generateResult.value!.refreshToken);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value?.sub).toBe(testUserId);
      expect(verifyResult.value?.email).toBe(testEmail);
      expect(verifyResult.value?.role).toBe(testRole);
    });

    it('should reject access token when verifying as refresh token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyRefreshToken(generateResult.value!.accessToken);

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('invalid_token');
    });

    it('should reject expired refresh token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      // Advance time by 8 days (past 7 day expiry)
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      const verifyResult = service.verifyRefreshToken(generateResult.value!.refreshToken);

      expect(verifyResult.isFailure()).toBe(true);
      expect(verifyResult.error).toBe('token_expired');
    });

    it('should accept refresh token after 6 days', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      // Advance time by 6 days (before 7 day expiry)
      vi.advanceTimersByTime(6 * 24 * 60 * 60 * 1000);

      const verifyResult = service.verifyRefreshToken(generateResult.value!.refreshToken);

      expect(verifyResult.isSuccess()).toBe(true);
    });
  });

  describe('token lifetime configuration', () => {
    it('should respect custom access token expiry', () => {
      const customService = new JwtServiceImpl({
        ...config,
        accessTokenExpiresIn: 300, // 5 minutes
      });

      const result = customService.generateTokenPair(testUserId, testEmail, testRole);
      expect(result.isSuccess()).toBe(true);

      const decoded = jwt.decode(result.value!.accessToken) as any;
      expect(decoded.exp - decoded.iat).toBe(300);
    });

    it('should respect custom refresh token expiry', () => {
      const customService = new JwtServiceImpl({
        ...config,
        refreshTokenExpiresIn: 86400, // 1 day
      });

      const result = customService.generateTokenPair(testUserId, testEmail, testRole);
      expect(result.isSuccess()).toBe(true);

      const decoded = jwt.decode(result.value!.refreshToken) as any;
      expect(decoded.exp - decoded.iat).toBe(86400);
    });
  });

  describe('role-based token generation', () => {
    const roles: UserRole[] = ['admin', 'user'];

    roles.forEach((role) => {
      it(`should generate valid token for ${role} role`, () => {
        const result = service.generateTokenPair(testUserId, testEmail, role);

        expect(result.isSuccess()).toBe(true);

        const decoded = jwt.decode(result.value!.accessToken) as any;
        expect(decoded.role).toBe(role);
      });

      it(`should verify token with ${role} role correctly`, () => {
        const generateResult = service.generateTokenPair(testUserId, testEmail, role);
        expect(generateResult.isSuccess()).toBe(true);

        const verifyResult = service.verifyAccessToken(generateResult.value!.accessToken);

        expect(verifyResult.isSuccess()).toBe(true);
        expect(verifyResult.value?.role).toBe(role);
      });
    });
  });

  describe('integration: generate and verify flow', () => {
    it('should complete full token lifecycle for access token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyAccessToken(generateResult.value!.accessToken);
      expect(verifyResult.isSuccess()).toBe(true);

      expect(verifyResult.value?.sub).toBe(testUserId);
      expect(verifyResult.value?.email).toBe(testEmail);
      expect(verifyResult.value?.role).toBe(testRole);
    });

    it('should complete full token lifecycle for refresh token', () => {
      const generateResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(generateResult.isSuccess()).toBe(true);

      const verifyResult = service.verifyRefreshToken(generateResult.value!.refreshToken);
      expect(verifyResult.isSuccess()).toBe(true);

      expect(verifyResult.value?.sub).toBe(testUserId);
      expect(verifyResult.value?.email).toBe(testEmail);
      expect(verifyResult.value?.role).toBe(testRole);
    });

    it('should handle token rotation correctly', () => {
      const initialResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(initialResult.isSuccess()).toBe(true);

      // Advance time by 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000);

      const newResult = service.generateTokenPair(testUserId, testEmail, testRole);
      expect(newResult.isSuccess()).toBe(true);

      // Old and new tokens should be different
      expect(initialResult.value?.accessToken).not.toBe(newResult.value?.accessToken);

      // Both tokens should be valid
      const verifyOld = service.verifyAccessToken(initialResult.value!.accessToken);
      const verifyNew = service.verifyAccessToken(newResult.value!.accessToken);
      expect(verifyOld.isSuccess()).toBe(true);
      expect(verifyNew.isSuccess()).toBe(true);
    });
  });
});
