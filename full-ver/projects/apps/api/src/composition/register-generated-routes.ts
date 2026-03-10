/**
 * @what コアルートの登録（Express Router ベース）
 * @why skeleton 基盤として auth/profile/admin-user/audit の最小ルートセットを定義
 *
 * ADR-0013: Migrated from Hono (OpenAPIHono) to Express Router
 *
 * ルール:
 * - Express Router でルートを登録
 * - 認証・認可ロジックは all-handlers.ts のハンドラーが担当
 *
 * NOTE: This module is kept for backward compatibility during the Hono → Express
 * migration. New code should use the Express Router files under
 * presentation/express/routes/ and mount them in create-express-app.ts.
 */

import { Router } from 'express';
import {
  // Health
  getRoot,
  getHealth,
  deepPing,
  getCsrfToken,
  // Auth
  login,
  logout,
  refreshToken,
  getCurrentUser,
  // Profile
  updateMyName,
  updateMyPassword,
  // Admin - Users
  adminListUsers,
  adminCreateUser,
  adminGetUser,
  adminUpdateUser,
  adminDeactivateUser,
  // Admin - Audit Logs
  adminListAuditLogs,
} from '@/presentation/handlers/all-handlers.js';
import { logger } from '@/infrastructure/logger/index.js';

/**
 * Register all routes to the Express Router
 *
 * @returns Configured Express Router
 */
export function registerGeneratedRoutes(): Router {
  const router = Router();

  // Health (4)
  router.get('/', getRoot);
  router.get('/health', getHealth);
  router.get('/ping/deep', deepPing);
  router.get('/csrf-token', getCsrfToken);

  // Auth (4)
  router.post('/auth/login', login);
  router.post('/auth/logout', logout);
  router.post('/auth/refresh', refreshToken);
  router.get('/auth/me', getCurrentUser);

  // Profile (2)
  router.patch('/users/me/name', updateMyName);
  router.patch('/users/me/password', updateMyPassword);

  // Admin - Users (5)
  router.get('/admin/users', adminListUsers);
  router.post('/admin/users', adminCreateUser);
  router.get('/admin/users/:userId', adminGetUser);
  router.patch('/admin/users/:userId', adminUpdateUser);
  router.delete('/admin/users/:userId', adminDeactivateUser);

  // Admin - Audit Logs (1)
  router.get('/admin/audit-logs', adminListAuditLogs);

  logger.info('[RegisterRoutes] routes registered', {
    count: 16,
    routes: [
      'GET /',
      'GET /health',
      'GET /ping/deep',
      'GET /csrf-token',
      'POST /auth/login',
      'POST /auth/logout',
      'POST /auth/refresh',
      'GET /auth/me',
      'PATCH /users/me/name',
      'PATCH /users/me/password',
      'GET /admin/users',
      'POST /admin/users',
      'GET /admin/users/:userId',
      'PATCH /admin/users/:userId',
      'DELETE /admin/users/:userId',
      'GET /admin/audit-logs',
    ],
  });

  return router;
}

/**
 * Get list of all registered routes
 *
 * Useful for logging/debugging
 */
export function getRegisteredRoutes(): Array<{ method: string; path: string }> {
  return [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/ping/deep' },
    { method: 'GET', path: '/csrf-token' },
    { method: 'POST', path: '/auth/login' },
    { method: 'POST', path: '/auth/logout' },
    { method: 'POST', path: '/auth/refresh' },
    { method: 'GET', path: '/auth/me' },
    { method: 'PATCH', path: '/users/me/name' },
    { method: 'PATCH', path: '/users/me/password' },
    { method: 'GET', path: '/admin/users' },
    { method: 'POST', path: '/admin/users' },
    { method: 'GET', path: '/admin/users/:userId' },
    { method: 'PATCH', path: '/admin/users/:userId' },
    { method: 'DELETE', path: '/admin/users/:userId' },
    { method: 'GET', path: '/admin/audit-logs' },
  ];
}
