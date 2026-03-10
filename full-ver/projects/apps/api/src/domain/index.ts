/**
 * @what ドメイン層のエクスポート
 * @why domain層の公開APIを明示
 */

export {
  User,
  UserId,
  UserCreatedEvent,
  UserEmailChangedEvent,
  UserNameChangedEvent,
} from './user/user.js';
export type { CreateUserParams } from './user/user.js';
export type { UserRepository, UserRepositoryError } from './user/user-repository.js';

// Auth domain
export {
  AuthUserId,
  PasswordHash,
  AuthUser,
  AuthUserRegisteredEvent,
  PasswordChangedEvent,
  RefreshTokenId,
  TokenHash,
  RefreshToken,
  PasswordResetTokenId,
  PasswordResetToken,
  UserRoles,
  UserStatuses,
} from './auth/index.js';

export type { UserRole, UserStatus } from './auth/index.js';

export type {
  CreateAuthUserParams,
  AuthUserRepository,
  AuthUserRepositoryError,
  CreateRefreshTokenParams,
  RefreshTokenRepository,
  CreatePasswordResetTokenParams,
  PasswordResetTokenRepository,
  // Service interfaces
  PasswordService,
  PasswordServiceError,
  TokenHashService,
  JwtService,
  JwtPayload,
  TokenPair,
  JwtServiceError,
} from './auth/index.js';

// Audit domain
export { AuditLog, AuditLogId, AuditActions, AuditEntityTypes } from './audit/index.js';

export type {
  AuditAction,
  AuditEntityType,
  AuditChanges,
  AuditMetadata,
  CreateAuditLogParams,
  AuditLogRepository,
  AuditLogFilters,
  PaginationOptions,
  PaginatedResult,
  AuditLogWithActor,
} from './audit/index.js';

// Content domain (scaffold / reference implementation for new domains)
export {
  Content,
  ContentId,
  ContentStatuses,
  ContentCreatedEvent,
  ContentTitleChangedEvent,
  ContentPublishedEvent,
} from './content/index.js';

export type {
  ContentStatus,
  CreateContentParams,
  ContentRepository,
  ContentRepositoryError,
  ContentFilters,
  ContentPaginationOptions,
  ContentPaginatedResult,
} from './content/index.js';
