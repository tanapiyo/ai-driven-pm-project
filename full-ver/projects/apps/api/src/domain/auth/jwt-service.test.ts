/**
 * @what JwtService ドメインインターフェースの型契約テスト
 * @why トークン生成・検証の抽象インターフェースがドメイン層の規約を満たすことを保証する
 */

import { describe, it, expect, vi } from 'vitest';
import type { JwtService, JwtPayload, TokenPair, JwtServiceError } from './jwt-service.js';
import type { UserRole } from './auth-user.js';
import { Result } from '@monorepo/shared';

describe('JwtPayload interface contract', () => {
  it('should satisfy JwtPayload shape with all fields', () => {
    const payload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'admin' as UserRole,
      iat: 1700000000,
      exp: 1700086400,
    };

    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('admin');
    expect(payload.iat).toBe(1700000000);
    expect(payload.exp).toBe(1700086400);
  });

  it('should accept all valid UserRole values', () => {
    const roles: UserRole[] = ['admin', 'user'];

    for (const role of roles) {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role,
        iat: 1700000000,
        exp: 1700086400,
      };
      expect(payload.role).toBe(role);
    }
  });
});

describe('TokenPair interface contract', () => {
  it('should satisfy TokenPair shape', () => {
    const tokenPair: TokenPair = {
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.access-token',
      refreshToken: 'eyJhbGciOiJIUzI1NiJ9.refresh-token',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 604800,
    };

    expect(tokenPair.accessToken).toBe('eyJhbGciOiJIUzI1NiJ9.access-token');
    expect(tokenPair.refreshToken).toBe('eyJhbGciOiJIUzI1NiJ9.refresh-token');
    expect(tokenPair.accessTokenExpiresIn).toBe(3600);
    expect(tokenPair.refreshTokenExpiresIn).toBe(604800);
  });
});

describe('JwtService interface contract (mock implementation)', () => {
  const mockPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'user',
    iat: 1700000000,
    exp: 1700086400,
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpiresIn: 3600,
    refreshTokenExpiresIn: 604800,
  };

  const createMockJwtService = (): JwtService => ({
    generateTokenPair: vi.fn().mockReturnValue(Result.ok(mockTokenPair)),
    generateAccessToken: vi.fn().mockReturnValue(Result.ok('mock-access-token')),
    verifyAccessToken: vi.fn().mockReturnValue(Result.ok(mockPayload)),
    verifyRefreshToken: vi.fn().mockReturnValue(Result.ok(mockPayload)),
  });

  it('should call generateTokenPair and return TokenPair on success', () => {
    const service = createMockJwtService();

    const result = service.generateTokenPair('user-123', 'test@example.com', 'user');

    expect(result.isSuccess()).toBe(true);
    expect(result.value).toEqual(mockTokenPair);
  });

  it('should call generateAccessToken and return access token string on success', () => {
    const service = createMockJwtService();

    const result = service.generateAccessToken('user-123', 'test@example.com', 'admin');

    expect(result.isSuccess()).toBe(true);
    expect(result.value).toBe('mock-access-token');
  });

  it('should call verifyAccessToken and return JwtPayload on success', () => {
    const service = createMockJwtService();

    const result = service.verifyAccessToken('valid-access-token');

    expect(result.isSuccess()).toBe(true);
    expect(result.value.sub).toBe('user-123');
    expect(result.value.email).toBe('test@example.com');
  });

  it('should call verifyRefreshToken and return JwtPayload on success', () => {
    const service = createMockJwtService();

    const result = service.verifyRefreshToken('valid-refresh-token');

    expect(result.isSuccess()).toBe(true);
    expect(result.value.sub).toBe('user-123');
  });

  it('should return error result when token verification fails', () => {
    const failService: JwtService = {
      generateTokenPair: vi.fn().mockReturnValue(Result.fail<JwtServiceError>('sign_failed')),
      generateAccessToken: vi.fn().mockReturnValue(Result.fail<JwtServiceError>('sign_failed')),
      verifyAccessToken: vi.fn().mockReturnValue(Result.fail<JwtServiceError>('invalid_token')),
      verifyRefreshToken: vi.fn().mockReturnValue(Result.fail<JwtServiceError>('token_expired')),
    };

    const accessResult = failService.verifyAccessToken('invalid-token');
    expect(accessResult.isFailure()).toBe(true);
    expect(accessResult.error).toBe('invalid_token');

    const refreshResult = failService.verifyRefreshToken('expired-token');
    expect(refreshResult.isFailure()).toBe(true);
    expect(refreshResult.error).toBe('token_expired');
  });

  it('should handle all JwtServiceError values', () => {
    const errors: JwtServiceError[] = [
      'sign_failed',
      'verify_failed',
      'token_expired',
      'invalid_token',
    ];

    for (const error of errors) {
      const result = Result.fail<JwtServiceError>(error);
      expect(result.error).toBe(error);
    }
  });
});
