/**
 * @what Authorization denial audit middleware (FR-15, Issue #291)
 * @why Record all 403 Forbidden responses to audit_logs for security monitoring and compliance
 *
 * Design decisions:
 * - Response interceptor pattern: catches ALL 403 responses automatically
 * - Fire-and-forget: audit log recording is async, never blocks the response
 * - No sensitive data: only logs role/layer/path/reason, never auth tokens or passwords
 * - Response interception: overrides res.json() to capture denial reason without consuming the response
 * - Defensive: null checks for user and usecase (handles unauthenticated 403 edge cases)
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 */

import type { RequestHandler } from 'express';
import type { RouteContext } from '@/presentation/index.js';
import { logger } from '@/infrastructure/logger/index.js';

export const authorizationAuditMiddleware: RequestHandler = (req, res, next) => {
  // Override res.json to intercept 403 responses
  const originalJson = res.json.bind(res);

  res.json = (body?: unknown) => {
    if (res.statusCode === 403) {
      const user = req.currentUser;
      const context = req.appContext as RouteContext | undefined;
      const recordAuditLogUseCase = context?.recordAuditLogUseCase;

      if (user && recordAuditLogUseCase) {
        // Extract denial reason from response body
        let reason = 'unknown';
        try {
          const bodyObj = body as Record<string, unknown>;
          reason = String(bodyObj?.message ?? bodyObj?.error ?? 'unknown');
        } catch {
          /* ignore parse errors */
        }

        // Fire-and-forget: don't block the 403 response
        recordAuditLogUseCase
          .execute({
            actorId: user.userId,
            entityType: 'Authorization',
            entityId: req.path,
            action: 'authorization_denied',
            metadata: {
              method: req.method,
              resource: req.path,
              reason,
              role: user.role,
              ip:
                (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
                (req.headers['x-real-ip'] as string | undefined) ??
                'unknown',
              userAgent: req.headers['user-agent'] ?? 'unknown',
            },
          })
          .catch((err: unknown) => {
            logger.error('Failed to record authorization denial audit log', {
              error: err instanceof Error ? err.message : String(err),
              userId: user.userId,
              path: req.path,
            });
          });
      }
    }

    return originalJson(body);
  };

  next();
};
