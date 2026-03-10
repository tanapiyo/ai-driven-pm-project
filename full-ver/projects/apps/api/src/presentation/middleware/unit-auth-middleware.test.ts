/**
 * @what ロールベース認可ミドルウェアのユニットテスト
 * @why admin/user ロールによるアクセス制御の正確性を保証
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 * Tests migrated from Hono app.request() to supertest
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { unitAccessMiddleware, createUnitAccessGuard } from './unit-auth-middleware.js';
import type { UserRole } from '@/domain/index.js';

const USER_1 = '33333333-3333-3333-3333-333333333333';

describe('unitAccessMiddleware', () => {
  it('should set userContext from authenticated user', async () => {
    const app = express();
    const user = {
      userId: USER_1,
      email: 'test@example.com',
      role: 'user' as const,
    };

    // Inject authenticated user (simulating authMiddleware)
    app.use((req, _res, next) => {
      req.currentUser = user;
      next();
    });
    app.use(unitAccessMiddleware);
    app.get('/test', (req, res) => {
      res.json(req.userContext);
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: USER_1,
      role: 'user',
    });
  });

  it('should return 401 when no user is set', async () => {
    const app = express();

    app.use(unitAccessMiddleware);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect((res.body as { code: string }).code).toBe('UNAUTHORIZED');
  });

  it('should set userContext for admin user', async () => {
    const app = express();
    const user = {
      userId: USER_1,
      email: 'admin@example.com',
      role: 'admin' as const,
    };

    app.use((req, _res, next) => {
      req.currentUser = user;
      next();
    });
    app.use(unitAccessMiddleware);
    app.get('/test', (req, res) => {
      res.json(req.userContext);
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect((res.body as { role: string }).role).toBe('admin');
  });
});

describe('createUnitAccessGuard', () => {
  function createTestApp(
    user: {
      userId: string;
      email: string;
      role: UserRole;
    },
    guardOptions: Parameters<typeof createUnitAccessGuard>[0]
  ) {
    const app = express();
    const guard = createUnitAccessGuard(guardOptions);

    // Inject authenticated user (simulating authMiddleware)
    app.use((req, _res, next) => {
      req.currentUser = user;
      next();
    });
    app.use(unitAccessMiddleware);
    app.get('/test', guard, (_req, res) => res.json({ ok: true }));
    app.post('/test', guard, (_req, res) => res.json({ ok: true }));
    return app;
  }

  describe('admin bypass', () => {
    it('should allow admin to bypass all role checks', async () => {
      const app = createTestApp(
        {
          userId: USER_1,
          email: 'admin@example.com',
          role: 'admin',
        },
        { allowedRoles: ['user'] }
      );

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    });
  });

  describe('role restriction', () => {
    it('should allow user with matching role', async () => {
      const app = createTestApp(
        {
          userId: USER_1,
          email: 'user@example.com',
          role: 'user',
        },
        { allowedRoles: ['user'] }
      );

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should return 403 for user with non-matching role', async () => {
      const app = createTestApp(
        {
          userId: USER_1,
          email: 'user@example.com',
          role: 'user',
        },
        { allowedRoles: ['admin'] }
      );

      const res = await request(app).get('/test');
      expect(res.status).toBe(403);
      expect((res.body as { code: string }).code).toBe('FORBIDDEN');
    });

    it('should allow access when allowedRoles is not specified', async () => {
      const app = createTestApp(
        {
          userId: USER_1,
          email: 'user@example.com',
          role: 'user',
        },
        {}
      );

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    });
  });

  describe('unauthenticated access', () => {
    it('should return 401 when userContext is not set', async () => {
      const app = express();
      // Skip unitAccessMiddleware to simulate missing userContext
      app.use(createUnitAccessGuard({ allowedRoles: ['user'] }));
      app.get('/test', (_req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
    });
  });
});
