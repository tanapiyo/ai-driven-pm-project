/**
 * @what 名前変更ユースケースのユニットテスト
 * @why ユーザー名前変更処理の正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result, Email } from '@monorepo/shared';
import { ChangeNameUseCase } from './change-name.js';
import { AuthUser, AuthUserId, PasswordHash, type AuthUserRepository } from '@/domain/index.js';

describe('ChangeNameUseCase', () => {
  let useCase: ChangeNameUseCase;
  let mockAuthUserRepository: AuthUserRepository;

  const createMockAuthUser = (name: string = 'Test User') => {
    return AuthUser.restore(
      new AuthUserId('550e8400-e29b-41d4-a716-446655440000'),
      Email.create('test@example.com'),
      name,
      'user',
      'active',
      PasswordHash.create('hashed-password'),
      new Date('2024-01-01'),
      new Date('2024-01-01'),
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
      delete: vi.fn(),
      emailExists: vi.fn(),
      findAllWithPagination: vi.fn(),
    };

    useCase = new ChangeNameUseCase(mockAuthUserRepository);
  });

  const validInput = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'New Name',
    causationId: 'causation-1',
    correlationId: 'correlation-1',
  };

  describe('successful name change', () => {
    it('should change name successfully', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute(validInput);

      expect(result.isSuccess()).toBe(true);
      expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.value.name).toBe('New Name');
      expect(result.value.email).toBe('test@example.com');
    });

    it('should persist the user after name change', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.ok(user));

      await useCase.execute(validInput);

      expect(mockAuthUserRepository.update).toHaveBeenCalled();
    });

    it('should update name on the user entity', async () => {
      const user = createMockAuthUser('Old Name');
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute({ ...validInput, name: 'Updated Name' });

      expect(result.isSuccess()).toBe(true);
      expect(result.value.name).toBe('Updated Name');
    });
  });

  describe('user id validation', () => {
    it('should fail with invalid UUID format', async () => {
      const result = await useCase.execute({
        ...validInput,
        userId: 'invalid-uuid',
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('user_not_found');
      expect(mockAuthUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('user lookup', () => {
    it('should fail when user not found', async () => {
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.fail('not_found'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('user_not_found');
    });

    it('should fail when repository returns db_error', async () => {
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });

  describe('name validation', () => {
    it('should fail with empty name', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute({
        ...validInput,
        name: '',
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_name');
      expect(mockAuthUserRepository.update).not.toHaveBeenCalled();
    });

    it('should fail with name exceeding 100 characters', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute({
        ...validInput,
        name: 'a'.repeat(101),
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('invalid_name');
      expect(mockAuthUserRepository.update).not.toHaveBeenCalled();
    });

    it('should accept name with exactly 100 characters', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute({
        ...validInput,
        name: 'a'.repeat(100),
      });

      expect(result.isSuccess()).toBe(true);
    });

    it('should accept single character name', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute({
        ...validInput,
        name: 'A',
      });

      expect(result.isSuccess()).toBe(true);
    });
  });

  describe('same name validation', () => {
    it('should fail when changing to same name', async () => {
      const user = createMockAuthUser('Test User');
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));

      const result = await useCase.execute({
        ...validInput,
        name: 'Test User',
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('same_name');
      expect(mockAuthUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('user persistence', () => {
    it('should fail when update fails', async () => {
      const user = createMockAuthUser();
      vi.mocked(mockAuthUserRepository.findById).mockResolvedValue(Result.ok(user));
      vi.mocked(mockAuthUserRepository.update).mockResolvedValue(Result.fail('db_error'));

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });
});
