/**
 * @what DIコンテナ / 依存関係の構成
 * @why 各レイヤーの依存関係を組み立て、アプリケーションコンテキストを構築
 *
 * composition層のルール:
 * - すべてのレイヤーをimport可能
 * - 依存関係の注入とファクトリを担当
 * - アプリケーション全体の構成を1箇所に集約
 */

import {
  // In-memory repositories
  InMemoryAuthUserRepository,
  InMemoryRefreshTokenRepository,
  // Prisma repositories
  PrismaAuthUserRepository,
  PrismaRefreshTokenRepository,
  PrismaAuditLogRepository,
  // Database
  prisma,
  // Services
  BcryptPasswordService,
  JwtServiceImpl,
  CryptoTokenHashService,
  // Health checkers
  PrismaDatabaseHealthChecker,
  // Logger
  logger,
} from '@/infrastructure/index.js';

import {
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  GetCurrentUserUseCase,
  DeepPingUseCase,
  ChangeNameUseCase,
  ChangePasswordUseCase,
  // Admin - User management
  ListUsersUseCase,
  GetUserByIdUseCase,
  AdminCreateUserUseCase,
  AdminUpdateUserUseCase,
  DeactivateUserUseCase,
  // Audit
  ListAuditLogsUseCase,
  RecordAuditLogUseCase,
} from '@/usecase/index.js';

import {
  AuthController,
  ProfileController,
  DeepPingController,
  AdminUserController,
  AuthMiddleware,
  SecurityMiddleware,
  CorsMiddleware,
  type RouteContext,
} from '@/presentation/index.js';

const DEV_JWT_SECRET = 'dev-secret-key-do-not-use-in-production';
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * 環境変数から設定を読み込む
 */
function getConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET;

  // 本番環境でのJWT_SECRET検証
  if (isProduction) {
    if (!jwtSecret) {
      logger.error('JWT_SECRET is required in production environment');
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      logger.error('JWT_SECRET is too short', {
        minLength: MIN_JWT_SECRET_LENGTH,
        actualLength: jwtSecret.length,
      });
      throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
    }
  } else if (!jwtSecret) {
    logger.warn('Using default JWT_SECRET for development - do not use in production');
  }

  return {
    jwt: {
      secret: jwtSecret ?? DEV_JWT_SECRET,
      accessTokenExpiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ?? '900', 10),
      refreshTokenExpiresIn: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ?? '604800', 10),
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    },
    usePrisma: !!process.env.DATABASE_URL,
  };
}

/**
 * アプリケーションコンテキストを作成
 * DATABASE_URL が設定されている場合は Prisma、なければ In-memory を使用
 */
export function createAppContext(): RouteContext {
  const config = getConfig();

  // ============================================
  // Infrastructure - Repositories
  // ============================================
  const authUserRepository = config.usePrisma
    ? new PrismaAuthUserRepository(prisma, logger)
    : new InMemoryAuthUserRepository();

  const refreshTokenRepository = config.usePrisma
    ? new PrismaRefreshTokenRepository(prisma)
    : new InMemoryRefreshTokenRepository();

  // Audit repository (Prisma only)
  const auditLogRepository = config.usePrisma ? new PrismaAuditLogRepository(prisma, logger) : null;

  // ============================================
  // Infrastructure - Services
  // ============================================
  const passwordService = new BcryptPasswordService(config.bcrypt.rounds);
  const jwtService = new JwtServiceImpl(config.jwt);
  const tokenHashService = new CryptoTokenHashService();

  // ============================================
  // UseCases - Auth
  // ============================================
  const loginUseCase = new LoginUseCase(
    authUserRepository,
    refreshTokenRepository,
    passwordService,
    jwtService,
    tokenHashService
  );
  const logoutUseCase = new LogoutUseCase(refreshTokenRepository);
  const refreshTokenUseCase = new RefreshTokenUseCase(
    authUserRepository,
    refreshTokenRepository,
    jwtService,
    tokenHashService
  );
  const getCurrentUserUseCase = new GetCurrentUserUseCase(authUserRepository);

  // ============================================
  // UseCases - Profile
  // ============================================
  const changeNameUseCase = new ChangeNameUseCase(authUserRepository);
  const changePasswordUseCase = new ChangePasswordUseCase(
    authUserRepository,
    refreshTokenRepository,
    passwordService
  );

  // ============================================
  // UseCases - Health
  // ============================================
  const databaseHealthChecker = config.usePrisma
    ? new PrismaDatabaseHealthChecker(prisma, logger)
    : null;
  const deepPingUseCase = new DeepPingUseCase(databaseHealthChecker);

  // ============================================
  // UseCases - Admin - User management
  // ============================================
  const listUsersUseCase = config.usePrisma ? new ListUsersUseCase(authUserRepository) : null;
  const getUserByIdUseCase = config.usePrisma ? new GetUserByIdUseCase(authUserRepository) : null;
  const adminCreateUserUseCase =
    config.usePrisma && passwordService
      ? new AdminCreateUserUseCase(authUserRepository, passwordService)
      : null;
  const adminUpdateUserUseCase = config.usePrisma
    ? new AdminUpdateUserUseCase(authUserRepository)
    : null;
  const deactivateUserUseCase = config.usePrisma
    ? new DeactivateUserUseCase(authUserRepository)
    : null;

  // ============================================
  // UseCases - Audit
  // ============================================
  const listAuditLogsUseCase = auditLogRepository
    ? new ListAuditLogsUseCase(auditLogRepository)
    : null;
  const recordAuditLogUseCase = auditLogRepository
    ? new RecordAuditLogUseCase(auditLogRepository)
    : null;

  // ============================================
  // Controllers
  // ============================================
  const deepPingController = new DeepPingController(deepPingUseCase, logger);
  const authController = new AuthController(
    loginUseCase,
    logoutUseCase,
    refreshTokenUseCase,
    getCurrentUserUseCase,
    logger
  );
  const profileController = new ProfileController(changeNameUseCase, changePasswordUseCase, logger);

  const adminUserController =
    listUsersUseCase &&
    getUserByIdUseCase &&
    adminCreateUserUseCase &&
    adminUpdateUserUseCase &&
    deactivateUserUseCase
      ? new AdminUserController(
          listUsersUseCase,
          getUserByIdUseCase,
          adminCreateUserUseCase,
          adminUpdateUserUseCase,
          deactivateUserUseCase
        )
      : createPlaceholderAdminUserController();

  // ============================================
  // Middleware
  // ============================================
  const authMiddleware = new AuthMiddleware(jwtService);
  const securityMiddleware = new SecurityMiddleware();
  const corsMiddleware = new CorsMiddleware();

  return {
    authController,
    profileController,
    deepPingController,
    adminUserController,
    // Audit usecases (directly exposed for routes)
    listAuditLogsUseCase,
    recordAuditLogUseCase,
    authMiddleware,
    securityMiddleware,
    corsMiddleware,
  };
}

/**
 * Placeholder controllers for when Prisma is not available
 */
function createPlaceholderAdminUserController(): AdminUserController {
  const notAvailable = () => {
    throw new Error('Admin user features require DATABASE_URL');
  };
  return {
    list: notAvailable,
    getById: notAvailable,
    create: notAvailable,
    update: notAvailable,
    deactivate: notAvailable,
  } as unknown as AdminUserController;
}
