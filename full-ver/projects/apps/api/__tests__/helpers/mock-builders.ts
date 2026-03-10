/**
 * @what Mock builders for repositories and services
 * @why Provide type-safe mocks for UseCase layer testing
 */

import { vi } from 'vitest';
import type { UserRepository } from '../../src/domain/user/user-repository.js';
import type { AuthUserRepository } from '../../src/domain/auth/auth-user-repository.js';
import type { RefreshTokenRepository } from '../../src/domain/auth/refresh-token-repository.js';
import type { PasswordResetTokenRepository } from '../../src/domain/auth/password-reset-token-repository.js';

/**
 * Type helper to extract function types from an interface
 */
export type MockType<T> = {
  [P in keyof T]: T[P] extends (...args: infer Args) => infer Return
    ? ReturnType<typeof vi.fn<Args, Return>>
    : T[P];
};

/**
 * Create a mock UserRepository for testing
 * @example
 * const mockRepo = createMockUserRepository();
 * mockRepo.findById.mockResolvedValue(Result.ok(user));
 */
export const createMockUserRepository = (): MockType<UserRepository> => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  emailExists: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
});

/**
 * Create a mock AuthUserRepository for testing
 * @example
 * const mockRepo = createMockAuthUserRepository();
 * mockRepo.findByEmail.mockResolvedValue(Result.ok(authUser));
 */
export const createMockAuthUserRepository = (): MockType<AuthUserRepository> => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  emailExists: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
});

/**
 * Create a mock RefreshTokenRepository for testing
 * @example
 * const mockRepo = createMockRefreshTokenRepository();
 * mockRepo.findByToken.mockResolvedValue(Result.ok(token));
 */
export const createMockRefreshTokenRepository = (): MockType<RefreshTokenRepository> => ({
  findById: vi.fn(),
  findByToken: vi.fn(),
  findByUserId: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  deleteByUserId: vi.fn(),
});

/**
 * Create a mock PasswordResetTokenRepository for testing
 * @example
 * const mockRepo = createMockPasswordResetTokenRepository();
 * mockRepo.findByToken.mockResolvedValue(Result.ok(token));
 */
export const createMockPasswordResetTokenRepository =
  (): MockType<PasswordResetTokenRepository> => ({
    findById: vi.fn(),
    findByToken: vi.fn(),
    findByUserId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByUserId: vi.fn(),
  });

/**
 * Create a mock password service for testing
 * @example
 * const mockService = createMockPasswordService();
 * mockService.hash.mockResolvedValue('hashed-password');
 */
export const createMockPasswordService = () => ({
  hash: vi.fn<[string], Promise<string>>(),
  verify: vi.fn<[string, string], Promise<boolean>>(),
});

/**
 * Create a mock token service for testing
 * @example
 * const mockService = createMockTokenService();
 * mockService.generate.mockReturnValue({ accessToken: 'token', refreshToken: 'refresh' });
 */
export const createMockTokenService = () => ({
  generate: vi.fn<
    [{ userId: string; email: string }],
    { accessToken: string; refreshToken: string }
  >(),
  verify: vi.fn<[string], { userId: string; email: string } | null>(),
  decode: vi.fn<[string], { userId: string; email: string } | null>(),
});

/**
 * Create a mock email service for testing
 * @example
 * const mockService = createMockEmailService();
 * mockService.send.mockResolvedValue(undefined);
 */
export const createMockEmailService = () => ({
  send: vi.fn<[{ to: string; subject: string; body: string }], Promise<void>>(),
  sendPasswordReset: vi.fn<[{ to: string; resetToken: string }], Promise<void>>(),
});
