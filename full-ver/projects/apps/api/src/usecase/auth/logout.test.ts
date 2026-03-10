/**
 * @what ログアウトユースケースのユニットテスト
 * @why リフレッシュトークン無効化の正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@monorepo/shared';
import { LogoutUseCase } from './logout.js';
import { AuthUserId, type RefreshTokenRepository } from '@/domain/index.js';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockRefreshTokenRepository: RefreshTokenRepository;

  beforeEach(() => {
    mockRefreshTokenRepository = {
      findById: vi.fn(),
      findByTokenHash: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      revokeAllByUserId: vi.fn(),
    };

    useCase = new LogoutUseCase(mockRefreshTokenRepository);
  });

  const validInput = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
  };

  describe('successful logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      vi.mocked(mockRefreshTokenRepository.revokeAllByUserId).mockResolvedValue(
        Result.ok(undefined)
      );

      const result = await useCase.execute(validInput);

      expect(result.isSuccess()).toBe(true);
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(
        expect.any(AuthUserId)
      );
    });

    it('should pass correct userId to repository', async () => {
      vi.mocked(mockRefreshTokenRepository.revokeAllByUserId).mockResolvedValue(
        Result.ok(undefined)
      );

      await useCase.execute(validInput);

      const calledArg = vi.mocked(mockRefreshTokenRepository.revokeAllByUserId).mock.calls[0][0];
      expect(calledArg.value).toBe(validInput.userId);
    });
  });

  describe('error handling', () => {
    it('should fail when revokeAllByUserId fails', async () => {
      vi.mocked(mockRefreshTokenRepository.revokeAllByUserId).mockResolvedValue(
        Result.fail('db_error')
      );

      const result = await useCase.execute(validInput);

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('internal_error');
    });
  });
});
