/**
 * @what Admin Audit Logs Express router
 * @why Admin audit log listing endpoint
 *
 * ADR-0013: Wave 4 - Admin audit log routes migrated from Hono to Express
 *
 * Routes:
 *   GET /admin/audit-logs
 */

import { Router, type RequestHandler } from 'express';
import type { RouteContext } from '@/presentation/index.js';
import type { AuditAction } from '@/domain/index.js';

/**
 * Admin-only role check middleware
 */
const requireAdmin: RequestHandler = (req, res, next) => {
  const user = req.currentUser;
  if (!user) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    return;
  }
  next();
};

/**
 * Creates the admin audit logs router.
 * Mount at /admin/audit-logs: app.use('/admin/audit-logs', createAdminAuditLogsRouter())
 */
export function createAdminAuditLogsRouter(): Router {
  const router = Router();

  /**
   * GET /admin/audit-logs
   * Admin only
   */
  const listAuditLogsHandler: RequestHandler = async (req, res) => {
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
  router.get('/', requireAdmin, listAuditLogsHandler);

  return router;
}
