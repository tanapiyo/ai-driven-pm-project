/**
 * @what All handler implementations (Express RequestHandler)
 * @why operationId → handler の接着層
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 *
 * ルール:
 * - 各handlerは req.appContext から DI container を取得
 * - controller method を呼び出してレスポンスを返す
 * - 認証が必要なエンドポイントは req.currentUser を確認する
 */

import type { RequestHandler } from 'express';
import type { RouteContext } from '@/presentation/index.js';
import type { AuditAction } from '@/domain/index.js';

// ============================================
// Health Handlers
// ============================================

export const getRoot: RequestHandler = (_req, res) => {
  res.status(200).json({ name: 'Base App API', version: '0.0.1' });
};

export const getHealth: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' as const, timestamp: new Date().toISOString() });
};

export const deepPing: RequestHandler = async (req, res) => {
  const context = req.appContext as unknown as RouteContext;
  await context.deepPingController.deepPing(req, res);
};

export const getCsrfToken: RequestHandler = (_req, res) => {
  const csrfToken = crypto.randomUUID();
  res.status(200).json({ csrfToken });
};

// ============================================
// Auth Handlers
// ============================================

export const login: RequestHandler = async (req, res) => {
  const context = req.appContext as unknown as RouteContext;
  await context.authController.login(req, res);
};

export const logout: RequestHandler = async (req, res) => {
  const user = req.currentUser;
  if (!user) {
    res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }
  const context = req.appContext as unknown as RouteContext;
  await context.authController.logout(req, res, user.userId);
};

export const refreshToken: RequestHandler = async (req, res) => {
  const context = req.appContext as unknown as RouteContext;
  await context.authController.refresh(req, res);
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  const user = req.currentUser;
  if (!user) {
    res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }
  const context = req.appContext as unknown as RouteContext;
  await context.authController.getCurrentUser(req, res, user.userId);
};

// ============================================
// Profile Handlers
// ============================================

export const updateMyName: RequestHandler = async (req, res) => {
  const user = req.currentUser;
  if (!user) {
    res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }
  const context = req.appContext as unknown as RouteContext;
  await context.profileController.updateName(req, res, user.userId);
};

export const updateMyPassword: RequestHandler = async (req, res) => {
  const user = req.currentUser;
  if (!user) {
    res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }
  const context = req.appContext as unknown as RouteContext;
  await context.profileController.updatePassword(req, res, user.userId);
};

// ============================================
// Admin Handlers - Users
// ============================================

function requireAdmin(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1]
): boolean {
  const user = req.currentUser;
  if (!user) {
    res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return false;
  }
  if (!['admin'].includes(user.role)) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    return false;
  }
  return true;
}

export const adminListUsers: RequestHandler = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const context = req.appContext as unknown as RouteContext;
  await context.adminUserController.list(req, res);
};

export const adminCreateUser: RequestHandler = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const context = req.appContext as unknown as RouteContext;
  await context.adminUserController.create(req, res);
};

export const adminGetUser: RequestHandler = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const context = req.appContext as unknown as RouteContext;
  await context.adminUserController.getById(req, res);
};

export const adminUpdateUser: RequestHandler = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const context = req.appContext as unknown as RouteContext;
  await context.adminUserController.update(req, res);
};

export const adminDeactivateUser: RequestHandler = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const context = req.appContext as unknown as RouteContext;
  await context.adminUserController.deactivate(req, res);
};

// ============================================
// Admin Handlers - Audit Logs
// ============================================

export const adminListAuditLogs: RequestHandler = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const context = req.appContext as unknown as RouteContext;

  if (!context.listAuditLogsUseCase) {
    res
      .status(503)
      .json({ code: 'SERVICE_UNAVAILABLE', message: 'Audit log service not available' });
    return;
  }

  const query = req.query as {
    page?: string;
    limit?: string;
    actorId?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  };

  const result = await context.listAuditLogsUseCase.execute({
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    entityType: query.entityType,
    action: query.action as AuditAction | undefined,
    actorId: query.actorId,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  });

  if (result.isFailure()) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' });
    return;
  }

  res.status(200).json(result.value);
};
