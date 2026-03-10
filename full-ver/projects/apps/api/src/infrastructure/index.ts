/**
 * @what インフラストラクチャ層のエクスポート
 * @why infrastructure層の公開APIを明示
 */

// In-memory repositories (dev/test)
export { InMemoryAuthUserRepository } from './repositories/in-memory-auth-user-repository.js';
export { InMemoryRefreshTokenRepository } from './repositories/in-memory-refresh-token-repository.js';

// Prisma repositories (production)
export { PrismaAuthUserRepository } from './repositories/prisma-auth-user-repository.js';
export { PrismaRefreshTokenRepository } from './repositories/prisma-refresh-token-repository.js';
export { PrismaAuditLogRepository } from './repositories/prisma-audit-log-repository.js';

// Database
export { prisma } from './database/index.js';

// Services (implementations only - interfaces are in domain layer)
export { BcryptPasswordService } from './services/password-service.js';
export { CryptoTokenHashService } from './services/token-hash-service.js';

export {
  JwtServiceImpl,
  type JwtService,
  type JwtServiceConfig,
  type JwtPayload,
  type TokenPair,
  type JwtServiceError,
} from './services/jwt-service.js';

// Health checkers
export { PrismaDatabaseHealthChecker } from './health/index.js';

// Logger
export { logger, type LogLevel, type Logger, type LogContext } from './logger/index.js';
