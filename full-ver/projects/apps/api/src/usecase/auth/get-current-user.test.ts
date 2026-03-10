/**
 * @what 現在のユーザー取得ユースケースのユニットテスト
 * @why 認証済みユーザー情報取得の正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result, Email } from '@monorepo/shared';
import { GetCurrentUserUseCase } from './get-current-user.js';
import { AuthUser, AuthUserId, PasswordHash, type AuthUserRepository } from '@/domain/index.js';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let mockAuthUserRepository: AuthUserRepository;

  const createMockUser = () => {
    const createdAt = new Date('2024-01-01');
    const updatedAt = new Date('2024-01-02');
    return AuthUser.restore(
      new AuthUserId('550e8400-e29b-41d4-a716-446655440000'),
      Email.create('test@example.com'),
      'Test User',
      'user',
      'active',
      PasswordHash.create('$2b$12$hashedpassword'),
      createdAt,
      updatedAt,
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

    useCase = new GetCurrentUserUseCase(mockAuthUserRepository);
  });

  const validInput = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
  };

  describe('successful user retrieval', () => {
    it('should return user info when user exists', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute(validInput);

      expect(result.isSuccess()).toBe(true);
      expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.value.email).toBe('test@example.com');
      expect(result.value.createdAt).toBeInstanceOf(Date);
      expect(result.value.updatedAt).toBeInstanceOf(Date);
    });

    it('should pass correct userId to repository', async () => {
      const user = createMockUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));

      await useCase.execute(validInput);

      const calledArg = vi.mocked(mockAuthUserRepository.findById).mock.calls[0][0];
      expect(calledArg.value).toBe(validInput.userId);
    });
  });

  describe('user not found', () => {
    it('should fail when user does not exist', async () => {
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(
        Result.ok(null as unknown as AuthUser)
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('user_not_found');
    });
  });

  describe('error handling', () => {
    it('should fail when repository returns error', async () => {
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });
});
