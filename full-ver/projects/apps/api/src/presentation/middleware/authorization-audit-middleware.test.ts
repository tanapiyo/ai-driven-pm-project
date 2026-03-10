/**
 * @what Authorization denial audit middleware tests
 * @why Verify that all 403 Forbidden responses are recorded to audit_logs
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 * Tests migrated from Hono app.request() to supertest
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Result } from '@monorepo/shared';
import { authorizationAuditMiddleware } from './authorization-audit-middleware.js';
import type { RecordAuditLogInput } from '@/usecase/audit/record-audit-log.js';

function createMockRecordAuditLogUseCase() {
  return {
    execute: vi.fn().mockResolvedValue(Result.ok({ id: 'audit-id', timestamp: new Date() })),
  };
}

const TEST_USER = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'user@example.com',
  role: 'user' as const,
};

describe('authorizationAuditMiddleware', () => {
  let mockUseCase: ReturnType<typeof createMockRecordAuditLogUseCase>;

  beforeEach(() => {
    mockUseCase = createMockRecordAuditLogUseCase();
  });

  function createApp(options?: { user?: typeof TEST_USER | null; useCase?: unknown | null }) {
    const app = express();
    app.use(express.json());
    const user = options?.user !== undefined ? options.user : TEST_USER;
    const useCase = options?.useCase !== undefined ? options.useCase : mockUseCase;

    // Inject DI context and user
    app.use((req, _res, next) => {
      req.appContext = { recordAuditLogUseCase: useCase } as unknown as { [key: string]: unknown };
      if (user) {
        req.currentUser = user;
      }
      next();
    });

    // Register the middleware under test
    app.use(authorizationAuditMiddleware);

    return app;
  }

  it('should record audit log when 403 response is returned', async () => {
    const app = createApp();
    app.get('/admin/users', (_req, res) =>
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    );

    await request(app).get('/admin/users');

    // Wait for fire-and-forget to complete
    await vi.waitFor(() => {
      expect(mockUseCase.execute).toHaveBeenCalledOnce();
    });

    const input = mockUseCase.execute.mock.calls[0][0] as RecordAuditLogInput;
    expect(input.actorId).toBe(TEST_USER.userId);
    expect(input.entityType).toBe('Authorization');
    expect(input.entityId).toBe('/admin/users');
    expect(input.action).toBe('authorization_denied');
  });

  it('should NOT record audit log for 200 response', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/test');

    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('should NOT record audit log for 401 response', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => res.status(401).json({ code: 'UNAUTHORIZED' }));

    await request(app).get('/test');

    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('should NOT record audit log for 404 response', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => res.status(404).json({ code: 'NOT_FOUND' }));

    await request(app).get('/test');

    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('should NOT record audit log when user is not set', async () => {
    const app = createApp({ user: null });
    app.get('/test', (_req, res) => res.status(403).json({ code: 'FORBIDDEN' }));

    await request(app).get('/test');

    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('should NOT record audit log when usecase is null', async () => {
    const app = createApp({ useCase: null });
    app.get('/test', (_req, res) => res.status(403).json({ code: 'FORBIDDEN' }));

    await request(app).get('/test');

    // No usecase means nothing to call
    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('should include method, resource, reason, role in metadata', async () => {
    const app = createApp();
    app.post('/admin/users', (_req, res) =>
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    );

    await request(app).post('/admin/users');

    await vi.waitFor(() => {
      expect(mockUseCase.execute).toHaveBeenCalledOnce();
    });

    const input = mockUseCase.execute.mock.calls[0][0] as RecordAuditLogInput;
    const metadata = input.metadata as Record<string, unknown>;
    expect(metadata.method).toBe('POST');
    expect(metadata.resource).toBe('/admin/users');
    expect(metadata.reason).toBe('Insufficient permissions');
    expect(metadata.role).toBe('user');
  });

  it('should include IP address from X-Forwarded-For header', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => res.status(403).json({ code: 'FORBIDDEN', message: 'Denied' }));

    await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100, 10.0.0.1');

    await vi.waitFor(() => {
      expect(mockUseCase.execute).toHaveBeenCalledOnce();
    });

    const input = mockUseCase.execute.mock.calls[0][0] as RecordAuditLogInput;
    const metadata = input.metadata as Record<string, unknown>;
    expect(metadata.ip).toBe('192.168.1.100');
  });

  it('should include User-Agent header', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => res.status(403).json({ code: 'FORBIDDEN', message: 'Denied' }));

    await request(app).get('/test').set('User-Agent', 'Mozilla/5.0 TestBrowser');

    await vi.waitFor(() => {
      expect(mockUseCase.execute).toHaveBeenCalledOnce();
    });

    const input = mockUseCase.execute.mock.calls[0][0] as RecordAuditLogInput;
    const metadata = input.metadata as Record<string, unknown>;
    expect(metadata.userAgent).toBe('Mozilla/5.0 TestBrowser');
  });

  it('should NOT crash when audit log recording fails', async () => {
    mockUseCase.execute.mockRejectedValue(new Error('DB connection failed'));
    const app = createApp();
    app.get('/test', (_req, res) => res.status(403).json({ code: 'FORBIDDEN', message: 'Denied' }));

    const res = await request(app).get('/test');

    // The 403 response should still be returned normally
    expect(res.status).toBe(403);
    expect((res.body as Record<string, unknown>).code).toBe('FORBIDDEN');
  });

  it('should NOT include Authorization header in logged metadata', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => res.status(403).json({ code: 'FORBIDDEN', message: 'Denied' }));

    await request(app).get('/test').set('Authorization', 'Bearer secret-token-123');

    await vi.waitFor(() => {
      expect(mockUseCase.execute).toHaveBeenCalledOnce();
    });

    const input = mockUseCase.execute.mock.calls[0][0] as RecordAuditLogInput;
    const metadata = input.metadata as Record<string, unknown>;
    // Verify no authorization-related data in metadata
    expect(metadata).not.toHaveProperty('authorization');
    expect(metadata).not.toHaveProperty('token');
    expect(JSON.stringify(metadata)).not.toContain('secret-token-123');
  });

  it('should default reason to unknown when response body has no message/error field', async () => {
    const app = createApp();
    app.get('/test', (_req, res) => {
      res.status(403).json({ code: 'FORBIDDEN' });
    });

    await request(app).get('/test');

    await vi.waitFor(() => {
      expect(mockUseCase.execute).toHaveBeenCalledOnce();
    });

    const input = mockUseCase.execute.mock.calls[0][0] as RecordAuditLogInput;
    const metadata = input.metadata as Record<string, unknown>;
    expect(metadata.reason).toBe('unknown');
  });
});
