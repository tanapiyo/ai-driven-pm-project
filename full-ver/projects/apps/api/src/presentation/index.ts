/**
 * @what プレゼンテーション層のエクスポート
 * @why presentation層の公開APIを明示
 */

import type { AuthController } from './controllers/auth-controller.js';
import type { ProfileController } from './controllers/profile-controller.js';
import type { DeepPingController } from './controllers/deep-ping-controller.js';
import type { AdminUserController } from './controllers/admin-user-controller.js';
import type { AuthMiddleware } from './middleware/auth-middleware.js';
import type { SecurityMiddleware } from './middleware/security-middleware.js';
import type { CorsMiddleware } from './middleware/cors-middleware.js';
import type { ListAuditLogsUseCase, RecordAuditLogUseCase } from '@/usecase/index.js';

/**
 * DI Context for Hono routes
 */
export interface RouteContext {
  authController: AuthController;
  profileController: ProfileController;
  deepPingController: DeepPingController;
  adminUserController: AdminUserController;
  // Audit usecases (directly exposed for routes)
  listAuditLogsUseCase: ListAuditLogsUseCase | null;
  recordAuditLogUseCase: RecordAuditLogUseCase | null;
  authMiddleware: AuthMiddleware;
  securityMiddleware: SecurityMiddleware;
  corsMiddleware: CorsMiddleware;
}

export { AuthController, type ControllerLogger } from './controllers/auth-controller.js';
export { ProfileController } from './controllers/profile-controller.js';
export { DeepPingController } from './controllers/deep-ping-controller.js';
export { AdminUserController } from './controllers/admin-user-controller.js';
export {
  AuthMiddleware,
  type AuthenticatedRequest,
  type AuthResult,
} from './middleware/auth-middleware.js';
export { SecurityMiddleware, type SecurityConfig } from './middleware/security-middleware.js';
export { CorsMiddleware, type CorsConfig } from './middleware/cors-middleware.js';
export { ValidationMiddleware } from './middleware/validation-middleware.js';
export {
  requestIdMiddleware,
  getRequestId,
  REQUEST_ID_HEADER,
} from './middleware/request-id-middleware.js';
export {
  unitAccessMiddleware,
  createUnitAccessGuard,
  type AuthorizedContext,
  type UnitAccessGuardOptions,
} from './middleware/unit-auth-middleware.js';
