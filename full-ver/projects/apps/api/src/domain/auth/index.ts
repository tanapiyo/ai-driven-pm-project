/**
 * @what 認証ドメインのエクスポート
 */

export {
  AuthUserId,
  PasswordHash,
  AuthUser,
  AuthUserRegisteredEvent,
  PasswordChangedEvent,
  UserRoles,
  UserStatuses,
  type UserRole,
  type UserStatus,
  type CreateAuthUserParams,
} from './auth-user.js';

export type {
  AuthUserRepository,
  AuthUserRepositoryError,
  ListUsersFilter,
  PaginationOptions,
  PaginatedResult,
} from './auth-user-repository.js';

export {
  RefreshTokenId,
  TokenHash,
  RefreshToken,
  type CreateRefreshTokenParams,
} from './refresh-token.js';

export type { RefreshTokenRepository } from './refresh-token-repository.js';

export {
  PasswordResetTokenId,
  PasswordResetToken,
  type CreatePasswordResetTokenParams,
} from './password-reset-token.js';

export type { PasswordResetTokenRepository } from './password-reset-token-repository.js';

// Service interfaces (implementations in infrastructure layer)
export type { PasswordService, PasswordServiceError } from './password-service.js';
export type { TokenHashService } from './token-hash-service.js';
export type { JwtService, JwtPayload, TokenPair, JwtServiceError } from './jwt-service.js';
