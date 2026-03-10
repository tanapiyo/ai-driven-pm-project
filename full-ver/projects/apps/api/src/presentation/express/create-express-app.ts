/**
 * @what Express application factory
 * @why Creates and configures the Express 5.x application with all middleware
 *
 * ADR-0013: Express migration - replaces Hono's createApp / buildApp
 *
 * Middleware stack (in order):
 *  1. Security headers
 *  2. CORS
 *  3. Request ID
 *  4. Body parsing (JSON)
 *  5. OpenAPI validation (express-openapi-validator)
 *  6. DI context injection
 *  7. Auth middleware (optional - sets req.currentUser if valid token)
 *  8. Request logger
 *  9. Routes
 * 10. Error handler
 */

import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { logger } from '@/infrastructure/logger/index.js';
import type { RouteContext } from '@/presentation/index.js';
import { createHealthRouter } from './routes/health.js';
import { createVersionRouter } from './routes/version.js';
import { createRootRouter } from './routes/root.js';
import { createAuthRouter } from './routes/auth.js';
import { createProfileRouter } from './routes/profile.js';
import { createPingRouter } from './routes/ping.js';
import { createAdminUsersRouter } from './routes/admin-users.js';
import { createAdminAuditLogsRouter } from './routes/admin-audit-logs.js';
import { authMiddleware } from '../middleware/express-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Path to the shared OpenAPI specification */
const OPENAPI_SPEC_PATH = resolve(__dirname, '../../../../../packages/api-contract/openapi.yaml');

/**
 * Build and configure the Express application.
 * Does NOT call app.listen() — that is the responsibility of the server entry point.
 */
export function createExpressApp(context: RouteContext): Application {
  const app = express();

  // ============================================
  // Security headers
  // ============================================
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    if (process.env['NODE_ENV'] === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // ============================================
  // CORS
  // ============================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = (process.env['CORS_ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(
      ','
    );
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Request-ID'
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  // ============================================
  // Request ID
  // ============================================
  const REQUEST_ID_HEADER = 'X-Request-ID';
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId =
      (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined) ?? crypto.randomUUID();
    req.headers[REQUEST_ID_HEADER.toLowerCase()] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  });

  // ============================================
  // Body parsing
  // ============================================
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============================================
  // OpenAPI validation (express-openapi-validator)
  // ADR-0013: section 1
  // ============================================
  app.use(
    OpenApiValidator.middleware({
      apiSpec: OPENAPI_SPEC_PATH,
      validateRequests: true,
      validateResponses: false, // Responses validated at runtime only in production
    }) as unknown as (req: Request, res: Response, next: NextFunction) => void
  );

  // ============================================
  // DI context injection
  // ADR-0013: section 4
  // ============================================
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Cast is required: RouteContext's specific interface is structurally compatible
    // with the index-signature type declared in express.d.ts
    req.appContext = context as unknown as { [key: string]: unknown };
    next();
  });

  // ============================================
  // Auth middleware (optional - populates req.currentUser if valid Bearer token)
  // Routes themselves enforce authentication requirements
  // ============================================
  app.use(authMiddleware);

  // ============================================
  // Request logger
  // ============================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      });
    });
    next();
  });

  // ============================================
  // Routes
  // ============================================
  app.use('/health', createHealthRouter());
  app.use('/version', createVersionRouter());
  app.use('/ping', createPingRouter());
  app.use('/auth', createAuthRouter());
  app.use('/users/me', createProfileRouter());
  app.use('/admin/users', createAdminUsersRouter());
  app.use('/admin/audit-logs', createAdminAuditLogsRouter());
  app.use('/', createRootRouter());

  // ============================================
  // Global error handler (must be last)
  // ============================================
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Handle express-openapi-validator errors
    if (isOpenApiError(err)) {
      res.status(err.status).json({
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors,
      });
      return;
    }

    const error = err instanceof Error ? err : new Error(String(err));
    logger.errorWithException('Unhandled error in request handler', error, {
      method: req.method,
      path: req.path,
      requestId: req.headers['x-request-id'] as string | undefined,
    });

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : error.message,
    });
  });

  return app;
}

/**
 * Type guard for express-openapi-validator errors
 */
interface OpenApiError {
  status: number;
  message: string;
  errors: unknown[];
}

function isOpenApiError(err: unknown): err is OpenApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as Record<string, unknown>)['status'] === 'number' &&
    'errors' in err
  );
}
