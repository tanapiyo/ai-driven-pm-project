/**
 * @what CSRF保護ミドルウェアのユニットテスト
 * @why セキュリティクリティカルなCSRF攻撃防止の正確性を保証
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 * Tests migrated from Hono app.request() to supertest
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { csrfMiddleware, CSRF_TOKEN_HEADER_NAME } from './csrf-middleware.js';

interface CsrfErrorResponse {
  code: string;
  message: string;
}

describe('csrfMiddleware', () => {
  const createApp = () => {
    const app = express();
    app.use(csrfMiddleware);

    // Test routes for each HTTP method
    app.get('/test', (_req, res) => res.json({ ok: true }));
    app.post('/test', (_req, res) => res.json({ ok: true }));
    app.put('/test', (_req, res) => res.json({ ok: true }));
    app.patch('/test', (_req, res) => res.json({ ok: true }));
    app.delete('/test', (_req, res) => res.json({ ok: true }));

    return app;
  };

  describe('GET requests', () => {
    it('should allow GET requests without CSRF token', async () => {
      const app = createApp();
      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should set CSRF token cookie on GET response', async () => {
      const app = createApp();
      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
      const setCookieHeader = res.headers['set-cookie'] as string[] | string | undefined;
      const setCookieStr = Array.isArray(setCookieHeader)
        ? setCookieHeader.join('; ')
        : (setCookieHeader ?? '');
      expect(setCookieStr).toContain('X-CSRF-Token=');
      expect(setCookieStr).toContain('Path=/');
      expect(setCookieStr).toContain('Secure');
      expect(setCookieStr).toContain('SameSite=Strict');
    });

    it('should generate unique CSRF tokens for each GET request', async () => {
      const app = createApp();

      const res1 = await request(app).get('/test');
      const res2 = await request(app).get('/test');

      const cookieHeader1 = res1.headers['set-cookie'] as unknown;
      const cookieHeader2 = res2.headers['set-cookie'] as unknown;
      const cookie1 =
        (Array.isArray(cookieHeader1)
          ? (cookieHeader1 as string[])[0]
          : (cookieHeader1 as string | undefined)) ?? '';
      const cookie2 =
        (Array.isArray(cookieHeader2)
          ? (cookieHeader2 as string[])[0]
          : (cookieHeader2 as string | undefined)) ?? '';

      // Extract token values
      const token1 = cookie1.match(/X-CSRF-Token=([^;]+)/)?.[1];
      const token2 = cookie2.match(/X-CSRF-Token=([^;]+)/)?.[1];

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
    });

    it('should generate token with correct length (64 hex chars = 32 bytes)', async () => {
      const app = createApp();
      const res = await request(app).get('/test');

      const rawCookieHeader = res.headers['set-cookie'] as unknown;
      const setCookieHeader =
        (Array.isArray(rawCookieHeader)
          ? (rawCookieHeader as string[])[0]
          : (rawCookieHeader as string | undefined)) ?? '';
      const token = setCookieHeader.match(/X-CSRF-Token=([^;]+)/)?.[1];

      expect(token).toBeDefined();
      expect(token?.length).toBe(64); // 32 bytes * 2 (hex encoding)
    });
  });

  describe('POST requests', () => {
    it('should reject POST without CSRF token', async () => {
      const app = createApp();
      const res = await request(app).post('/test');

      expect(res.status).toBe(403);
      expect((res.body as CsrfErrorResponse).code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST with only header token (no cookie)', async () => {
      const app = createApp();
      const res = await request(app).post('/test').set(CSRF_TOKEN_HEADER_NAME, 'test-token');

      expect(res.status).toBe(403);
      expect((res.body as CsrfErrorResponse).code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST with only cookie token (no header)', async () => {
      const app = createApp();
      const res = await request(app).post('/test').set('Cookie', 'X-CSRF-Token=test-token');

      expect(res.status).toBe(403);
      expect((res.body as CsrfErrorResponse).code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST with mismatched tokens (Double-Submit Cookie pattern)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, 'header-token')
        .set('Cookie', 'X-CSRF-Token=cookie-token');

      expect(res.status).toBe(403);
      const body = res.body as CsrfErrorResponse;
      expect(body.code).toBe('CSRF_TOKEN_INVALID');
      expect(body.message).toBe('CSRF token validation failed');
    });

    it('should allow POST with matching header and cookie tokens', async () => {
      const app = createApp();
      const validToken = 'a'.repeat(64); // Valid token format

      const res = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `X-CSRF-Token=${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('PUT requests', () => {
    it('should reject PUT without CSRF token', async () => {
      const app = createApp();
      const res = await request(app).put('/test');

      expect(res.status).toBe(403);
      expect((res.body as CsrfErrorResponse).code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should allow PUT with matching tokens', async () => {
      const app = createApp();
      const validToken = 'b'.repeat(64);

      const res = await request(app)
        .put('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `X-CSRF-Token=${validToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH requests', () => {
    it('should reject PATCH without CSRF token', async () => {
      const app = createApp();
      const res = await request(app).patch('/test');

      expect(res.status).toBe(403);
      expect((res.body as CsrfErrorResponse).code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should allow PATCH with matching tokens', async () => {
      const app = createApp();
      const validToken = 'c'.repeat(64);

      const res = await request(app)
        .patch('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `X-CSRF-Token=${validToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE requests', () => {
    it('should reject DELETE without CSRF token', async () => {
      const app = createApp();
      const res = await request(app).delete('/test');

      expect(res.status).toBe(403);
      expect((res.body as CsrfErrorResponse).code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should allow DELETE with matching tokens', async () => {
      const app = createApp();
      const validToken = 'd'.repeat(64);

      const res = await request(app)
        .delete('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `X-CSRF-Token=${validToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Cookie parsing edge cases', () => {
    it('should find CSRF token among multiple cookies', async () => {
      const app = createApp();
      const validToken = 'e'.repeat(64);

      const res = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `session=abc123; X-CSRF-Token=${validToken}; other=value`);

      expect(res.status).toBe(200);
    });

    it('should handle cookie with extra whitespace', async () => {
      const app = createApp();
      const validToken = 'f'.repeat(64);

      const res = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `  X-CSRF-Token=${validToken}  `);

      expect(res.status).toBe(200);
    });

    it('should not match partial cookie name', async () => {
      const app = createApp();
      const validToken = 'g'.repeat(64);

      // Cookie name is different (X-CSRF-Token-OLD vs X-CSRF-Token)
      const res = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, validToken)
        .set('Cookie', `X-CSRF-Token-OLD=${validToken}`);

      expect(res.status).toBe(403);
      const body = res.body as CsrfErrorResponse;
      expect(body.code).toBe('CSRF_TOKEN_MISSING');
    });
  });

  describe('Full flow integration', () => {
    it('should complete full CSRF protection flow: GET token, then POST with it', async () => {
      const app = createApp();

      // Step 1: GET request to obtain CSRF token
      const getRes = await request(app).get('/test');
      expect(getRes.status).toBe(200);

      const rawCookie = getRes.headers['set-cookie'] as unknown;
      const setCookieHeader =
        (Array.isArray(rawCookie)
          ? (rawCookie as string[])[0]
          : (rawCookie as string | undefined)) ?? '';
      const token = setCookieHeader.match(/X-CSRF-Token=([^;]+)/)?.[1];
      expect(token).toBeDefined();

      // Step 2: POST request with the obtained token
      const postRes = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, token!)
        .set('Cookie', `X-CSRF-Token=${token}`);

      expect(postRes.status).toBe(200);
      expect(postRes.body).toEqual({ ok: true });
    });
  });

  describe('Error response format', () => {
    it('should return consistent error response for missing token', async () => {
      const app = createApp();
      const res = await request(app).post('/test');

      expect(res.status).toBe(403);
      const body = res.body as CsrfErrorResponse;
      expect(body).toHaveProperty('code', 'CSRF_TOKEN_MISSING');
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('X-CSRF-Token');
    });

    it('should return consistent error response for invalid token', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/test')
        .set(CSRF_TOKEN_HEADER_NAME, 'token-a')
        .set('Cookie', 'X-CSRF-Token=token-b');

      expect(res.status).toBe(403);
      const body = res.body as CsrfErrorResponse;
      expect(body).toHaveProperty('code', 'CSRF_TOKEN_INVALID');
      expect(body).toHaveProperty('message');
    });
  });
});
