/**
 * @what ユースケース層のエクスポート
 * @why usecase層の公開APIを明示
 */

// Auth usecases
export {
  LoginUseCase,
  type LoginInput,
  type LoginOutput,
  type LoginError,
  LogoutUseCase,
  type LogoutInput,
  type LogoutError,
  RefreshTokenUseCase,
  type RefreshTokenInput,
  type RefreshTokenOutput,
  type RefreshTokenError,
  GetCurrentUserUseCase,
  type GetCurrentUserInput,
  type GetCurrentUserOutput,
  type GetCurrentUserError,
} from './auth/index.js';

// Health usecases
export {
  DeepPingUseCase,
  type DeepPingOutput,
  type HealthCheck,
  type DatabaseHealthChecker,
} from './health/index.js';

// Profile usecases
export {
  ChangeNameUseCase,
  type ChangeNameInput,
  type ChangeNameOutput,
  type ChangeNameError,
  ChangePasswordUseCase,
  type ChangePasswordInput,
  type ChangePasswordOutput,
  type ChangePasswordError,
} from './profile/index.js';

// Admin usecases
export {
  // User management
  ListUsersUseCase,
  GetUserByIdUseCase,
  AdminCreateUserUseCase,
  AdminUpdateUserUseCase,
  DeactivateUserUseCase,
  type ListUsersInput,
  type ListUsersOutput,
  type AdminCreateUserInput,
  type AdminUpdateUserInput,
  type AdminUserOutput,
} from './admin/index.js';

// Audit usecases
export {
  RecordAuditLogUseCase,
  type RecordAuditLogInput,
  type RecordAuditLogOutput,
  type RecordAuditLogError,
  ListAuditLogsUseCase,
  type ListAuditLogsInput,
  type ListAuditLogsOutput,
  type AuditLogOutput,
  type ListAuditLogsError,
} from './audit/index.js';
