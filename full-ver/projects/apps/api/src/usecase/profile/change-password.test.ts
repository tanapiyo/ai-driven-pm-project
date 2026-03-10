/**
 * @what パスワード変更ユースケースのユニットテスト
 * @why ユースケースロジックの正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result, Email } from '@monorepo/shared';
import { ChangePasswordUseCase } from './change-password.js';
import {
  AuthUser,
  AuthUserId,
  PasswordHash,
  type AuthUserRepository,
  type RefreshTokenRepository,
  type PasswordService,
} from '@/domain/index.js';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let mockAuthUserRepository: AuthUserRepository;
  let mockRefreshTokenRepository: RefreshTokenRepository;
  let mockPasswordService: PasswordService;

  const createMockUser = () => {
    return AuthUser.restore(
      new AuthUserId('550e8400-e29b-41d4-a716-446655440000'),
      Email.create('test@example.com'),
      'Test User',
      'user',
      'active',
      PasswordHash.create('$2b$12$oldhash'),
      new Date(),
      new Date(),
      null,
      1
    );
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

    useCase = new ChangePasswordUseCase(
      mockAuthUserRepository,
      mockRefreshTokenRepository,
      mockPasswordService
    );
  });

  const validInput = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    currentPassword: 'OldPassword123',
    newPassword: 'NewPassword456',
    causationId: 'cause-1',
    correlationId: 'corr-1',
  };

  describe('successful password change', () => {
    it('should change password and revoke all refresh tokens', async () => {
      const user = createMockUser();
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockPasswordService.hash).mockResolvedValue(
        Result.ok(PasswordHash.create('$2b$12$newhash'))
      );
      vi.mocked(mockAuthUserRepository.update).mockImplementation(async (user) => Result.ok(user));
      vi.mocked(mockRefreshTokenRepository.revokeAllByUserId).mockResolvedValue(
        Result.ok(undefined)
      );

      const result = await useCase.execute(validInput);

      expect(result.isSuccess()).toBe(true);
      expect(result.value.message).toBe('Password has been changed successfully.');
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(user.id);
      expect(mockAuthUserRepository.update).toHaveBeenCalled();
    });
  });

  describe('password strength validation', () => {
    it('should fail when new password is weak', async () => {
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.fail('weak_password'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('weak_password');
      expect(mockAuthUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('user validation', () => {
    it('should fail when user ID is invalid UUID', async () => {
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));

      const result = await useCase.execute({
        ...validInput,
        userId: 'invalid-uuid',
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('user_not_found');
    });

    it('should fail when user is not found', async () => {
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(
        Result.ok(null as unknown as AuthUser)
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('user_not_found');
    });

    it('should fail when repository returns error', async () => {
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('current password verification', () => {
    it('should fail when current password is incorrect', async () => {
      const user = createMockUser();
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(false));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('incorrect_password');
    });

    it('should fail when password verification returns error', async () => {
      const user = createMockUser();
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.fail('verify_failed'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('password hashing', () => {
    it('should fail when hashing fails', async () => {
      const user = createMockUser();
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockPasswordService.hash).mockResolvedValue(Result.fail('hash_failed'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('updating user', () => {
    it('should fail when update fails', async () => {
      const user = createMockUser();
      vi.mocked(mockPasswordService.validateStrength).mockReturnValue(Result.ok(undefined));
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockPasswordService.verify).mockResolvedValue(Result.ok(true));
      vi.mocked(mockPasswordService.hash).mockResolvedValue(
        Result.ok(PasswordHash.create('$2b$12$newhash'))
      );
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });
});
