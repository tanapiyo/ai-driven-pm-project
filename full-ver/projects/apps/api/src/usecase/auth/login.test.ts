/**
 * @what ログインユースケースのユニットテスト
 * @why 認証フローの正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result, Email } from '@monorepo/shared';
import { LoginUseCase } from './login.js';
import {
  AuthUser,
  AuthUserId,
  PasswordHash,
  type AuthUserRepository,
  type RefreshTokenRepository,
  type PasswordService,
  type TokenHashService,
} from '@/domain/index.js';
import type { JwtService, TokenPair } from '@/infrastructure/index.js';
import { TokenHash } from '@/domain/auth/refresh-token.js';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockAuthUserRepository: AuthUserRepository;
  let mockRefreshTokenRepository: RefreshTokenRepository;
  let mockPasswordService: PasswordService;
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

  const mockTokenPair: TokenPair = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
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

    mockPasswordService = {
      hash: vi.fn(),
      verify: vi.fn(),
      validateStrength: vi.fn(),
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

    useCase = new LoginUseCase(
      mockAuthUserRepository,
      mockRefreshTokenRepository,
      mockPasswordService,
      mockJwtService,
      mockTokenHashService
    );
  });

  const validInput = {
    email: 'test@example.com',
    password: 'SecurePass123',
  };

  describe('successful login', () => {
    it('should login and return tokens', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(validInput);

      expect(result.isSuccess()).toBe(true);
      expect(result.value.accessToken).toBe('access-token-123');
      expect(result.value.refreshToken).toBe('refresh-token-456');
      expect(result.value.expiresIn).toBe(900);
      expect(result.value.user.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.value.user.email).toBe('test@example.com');
    });

    it('should save refresh token to repository', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));

      await useCase.execute(validInput);

      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
      expect(mockTokenHashService.hashToken).toHaveBeenCalledWith('refresh-token-456');
    });

    it('should pass userId, email, and role to generateTokenPair', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.ok(undefined));

      await useCase.execute(validInput);

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'test@example.com',
        'user'
      );
    });
  });

  describe('email validation', () => {
    it('should fail with invalid email format', async () => {
      const result = await useCase.execute({
        ...validInput,
        email: 'invalid-email',
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_credentials');
      expect(mockAuthUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('user lookup', () => {
    it('should fail when user not found', async () => {
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(
        Result.ok(null as unknown as AuthUser)
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_credentials');
    });

    it('should fail when repository returns error', async () => {
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('password verification', () => {
    it('should fail when password is incorrect', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(false));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_credentials');
    });

    it('should fail when verification returns error', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.fail('verify_failed'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('token generation', () => {
    it('should fail when token generation fails', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.fail('sign_failed'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('refresh token persistence', () => {
    it('should fail when refresh token save fails', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findByEmail).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockJwtService.generateTokenPair).mockReturnValue(Result.ok(mockTokenPair));
      vi.mocked(mockTokenHashService.hashToken).mockReturnValue(TokenHash.create('hashed-token'));
      vi.mocked(mockRefreshTokenRepository.save).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });
});
