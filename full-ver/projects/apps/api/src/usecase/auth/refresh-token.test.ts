/**
 * @what トークンリフレッシュユースケースのユニットテスト
 * @why アクセストークン更新フローの正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result, Email } from '@monorepo/shared';
import { RefreshTokenUseCase } from './refresh-token.js';
import {
  AuthUser,
  AuthUserId,
  PasswordHash,
  RefreshToken,
  RefreshTokenId,
  TokenHash,
  type AuthUserRepository,
  type RefreshTokenRepository,
  type TokenHashService,
} from '@/domain/index.js';
import type { JwtService, TokenPair } from '@/infrastructure/index.js';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockAuthUserRepository: AuthUserRepository;
  let mockRefreshTokenRepository: RefreshTokenRepository;
  let mockJwtService: JwtService;
  let mockTokenHashService: TokenHashService;

  const createMockUser = () => {
    return AuthUser.restore(
      new AuthUserId('550e8400-e29b-41d4-a716-446655440000'),
      Email.create('test@example.com'),
      'Test User',
      'user',
      'active',
      PasswordHash.create('$2b$12$hashedpassword'),
      new Date(),
      new Date(),
      null,
      1
    );
  };

  const createMockRefreshToken = (options?: { revoked?: boolean; expired?: boolean }) => {
    const expiresAt = options?.expired
      ? new Date(Date.now() - 1000)
      : new Date(Date.now() + 604800000);
    const token = RefreshToken.restore(
      new RefreshTokenId('660e8400-e29b-41d4-a716-446655440000'),
      new AuthUserId('550e8400-e29b-41d4-a716-446655440000'),
      TokenHash.create('hashed-token'),
      expiresAt,
      new Date(),
      options?.revoked ? new Date() : null
    );
    return token;
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 604800,
  };

  beforeEach(() => {
    mockAuthUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      exists: vi.fn(),
      emailExists: vi.fn(),
      delete: vi.fn(),
      findAllWithPagination: vi.fn(),
    };

    mockRefreshTokenRepository = {
      findById: vi.fn(),
      findByTokenHash: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      revokeAllByUserId: vi.fn(),
    };

    mockJwtService = {
      generateTokenPair: vi.fn(),
      generateAccessToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };

    mockTokenHashService = {
      generateToken: vi.fn(),
      hashToken: vi.fn(),
    };

    useCase = new RefreshTokenUseCase(
      mockAuthUserRepository,
      mockRefreshTokenRepository,
      mockJwtService,
      mockTokenHashService
    );
  });

  const validInput = {
    refreshToken: 'valid-refresh-token',
  };

  describe('successful token refresh', () => {
    it('should return new token pair', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(createMockUser()));
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));

      const result = await useCase.execute(validInput);

      expect(result.isSuccess()).toBe(true);
      expect(result.value.accessToken).toBe('new-access-token');
      expect(result.value.refreshToken).toBe('new-refresh-token');
      expect(result.value.expiresIn).toBe(900);
    });

    it('should revoke old refresh token', async () => {
      const storedToken = createMockRefreshToken();
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(storedToken)
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(createMockUser()));
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));

      await useCase.execute(validInput);

      // update is called for revoking old token, save is called for new token
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should pass userId, email, and role to generateTokenPair', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(createMockUser()));
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));

      await useCase.execute(validInput);

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'test@example.com',
        'user'
      );
    });

    it('should save new refresh token', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(createMockUser()));
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));

      await useCase.execute(validInput);

      expect(mockTokenHashService.hashToken).toHaveBeenCalledWith('new-refresh-token');
    });
  });

  describe('token verification', () => {
    it('should fail when JWT verification fails', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(Result.fail('invalid_token'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_token');
    });

    it('should fail with token_expired when JWT is expired', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(Result.fail('token_expired'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('token_expired');
    });
  });

  describe('stored token validation', () => {
    it('should fail when token not found in database', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(null as unknown as RefreshToken)
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_token');
    });

    it('should fail when stored token is revoked', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken({ revoked: true }))
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_token');
    });

    it('should fail when findByTokenHash returns error', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.fail('db_error')
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('user validation', () => {
    it('should fail when user not found', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(
        Result.ok(null as unknown as AuthUser)
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('user_not_found');
    });

    it('should fail when findById returns error', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('token generation', () => {
    it('should fail when token generation fails', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(createMockUser()));
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.fail('sign_failed'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('new token persistence', () => {
    it('should fail when save fails for new token', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockReturnValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: 'user' as const,
          iat: 1000,
          exp: 2000,
        })
      );
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(
        Result.ok(createMockRefreshToken())
      );
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(createMockUser()));
      // update succeeds (for revoking old token), save fails (for new token)
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(Result.ok(undefined));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.fail('db_error'));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });
});
