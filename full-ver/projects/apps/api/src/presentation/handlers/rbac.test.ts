/**
 * @what RBAC (Role-Based Access Control) テスト
 * @why skeleton: admin/user の2ロールによるアクセス制御境界を検証
 *
 * ADR-0013: Migrated from Hono to Express/supertest
 */

import { describe, it, expect, vi } from 'vitest';
import express, { type RequestHandler } from 'express';
import request from 'supertest';
import type { RouteContext } from '@/presentation/index.js';

interface RbacSuccessResponse {
  ok: boolean;
  role?: string;
}

interface RbacErrorResponse {
  code: string;
  message: string;
}

// Mock context with authMiddleware
function createTestApp(userRole: string | null) {
  const app = express();
  app.use(express.json());

  // Inject mock DI context
  const contextMiddleware: RequestHandler = (req, _res, next) => {
    // Authenticate mock: only succeeds when Authorization header is present with Bearer token
    const authenticateFn = vi
      .fn()
      .mockImplementation((incomingReq: { headers: { authorization?: string } }) => {
        const authHeader = incomingReq.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { authenticated: false, error: 'missing_token' };
        }
        return userRole
          ? {
              authenticated: true,
              user: {
                userId: 'test-user-id',
                email: 'test@example.com',
                role: userRole,
              },
            }
          : {
              authenticated: false,
              error: 'invalid_token',
            };
      });

    const mockAuthMiddleware = {
      authenticate: authenticateFn,
      verifyToken: vi.fn().mockReturnValue(
        userRole
          ? {
              authenticated: true,
              user: {
                userId: 'test-user-id',
                email: 'test@example.com',
                role: userRole,
              },
            }
          : {
              authenticated: false,
              error: 'invalid_token',
            }
      ),
    };

    req.appContext = {
      authMiddleware: mockAuthMiddleware,
      adminUserController: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as { [key: string]: unknown };
    next();
  };
  app.use(contextMiddleware);

  // Optional auth middleware - sets req.currentUser if valid token
  const optionalAuth: RequestHandler = (req, _res, next) => {
    const context = req.appContext as RouteContext | undefined;
    const auth = context?.authMiddleware;
    if (auth) {
      const result = auth.authenticate(req as never);
      if (result.authenticated) {
        req.currentUser = result.user;
      }
    }
    next();
  };
  app.use(optionalAuth);

  return app;
}

/**
 * Create a route that requires specific roles
 */
function addRoleProtectedRoute(
  app: ReturnType<typeof express>,
  method: 'get' | 'post' | 'patch',
  path: string,
  allowedRoles: string[]
) {
  const handler: RequestHandler = (req, res) => {
    const user = req.currentUser;

    if (!user) {
      res
        .status(401)
        .json({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      return;
    }

    res.status(200).json({ ok: true, role: user.role });
  };

  app[method](path, handler);
}

describe('RBAC Role Boundaries', () => {
  describe('Admin-only endpoints', () => {
    const adminEndpoints = [
      { path: '/admin/users', method: 'GET' as const, allowedRoles: ['admin'] },
      { path: '/admin/users', method: 'POST' as const, allowedRoles: ['admin'] },
      { path: '/admin/audit-logs', method: 'GET' as const, allowedRoles: ['admin'] },
    ];

    it.each(adminEndpoints)(
      'should allow admin to access $method $path',
      async ({ path, method, allowedRoles }) => {
        const app = createTestApp('admin');
        addRoleProtectedRoute(app, method.toLowerCase() as 'get' | 'post', path, allowedRoles);

        const httpMethod = method.toLowerCase() as 'get' | 'post';
        const res = await request(app)[httpMethod](path).set('Authorization', 'Bearer valid-token');

        expect(res.status).toBe(200);
        const body = res.body as RbacSuccessResponse;
        expect(body.role).toBe('admin');
      }
    );

    it.each(adminEndpoints)(
      'should deny user from accessing admin-only $method $path',
      async ({ path, method, allowedRoles }) => {
        const app = createTestApp('user');
        addRoleProtectedRoute(app, method.toLowerCase() as 'get' | 'post', path, allowedRoles);

        const httpMethod = method.toLowerCase() as 'get' | 'post';
        const res = await request(app)[httpMethod](path).set('Authorization', 'Bearer valid-token');

        expect(res.status).toBe(403);
      }
    );
  });

  describe('User-accessible endpoints', () => {
    const userEndpoints = [
      { path: '/auth/me', method: 'GET' as const, allowedRoles: ['admin', 'user'] },
      { path: '/users/me/name', method: 'GET' as const, allowedRoles: ['admin', 'user'] },
    ];

    it.each(userEndpoints)(
      'should allow user to access $method $path',
      async ({ path, method, allowedRoles }) => {
        const app = createTestApp('user');
        addRoleProtectedRoute(app, method.toLowerCase() as 'get', path, allowedRoles);

        const res = await request(app).get(path).set('Authorization', 'Bearer valid-token');

        expect(res.status).toBe(200);
        const body = res.body as RbacSuccessResponse;
        expect(body.role).toBe('user');
      }
    );

    it.each(userEndpoints)(
      'should allow admin to access $method $path',
      async ({ path, method, allowedRoles }) => {
        const app = createTestApp('admin');
        addRoleProtectedRoute(app, method.toLowerCase() as 'get', path, allowedRoles);

        const res = await request(app).get(path).set('Authorization', 'Bearer valid-token');

        expect(res.status).toBe(200);
        const body = res.body as RbacSuccessResponse;
        expect(body.role).toBe('admin');
      }
    );
  });

  describe('Authentication errors', () => {
    it('should return 401 for missing Authorization header', async () => {
      const app = createTestApp('user');
      addRoleProtectedRoute(app, 'post', '/test', ['admin']);

      const res = await request(app).post('/test');

      expect(res.status).toBe(401);
      const body = res.body as RbacErrorResponse;
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.message).toContain('Missing');
    });

    it('should return 401 for invalid token format (not Bearer)', async () => {
      const app = createTestApp(null); // null = authentication fails
      addRoleProtectedRoute(app, 'post', '/test', ['admin']);

      const res = await request(app).post('/test').set('Authorization', 'Basic abc123');

      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const app = createTestApp(null); // null = authentication fails

      addRoleProtectedRoute(app, 'post', '/test', ['admin']);

      const res = await request(app).post('/test').set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
