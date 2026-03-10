/**
 * @what Express validateBody バリデーションテスト
 * @why Express の validateBody ミドルウェアで 422 レスポンスが返ることを検証
 *
 * ADR-0013: Migrated from Hono defaultHook test to Express validateBody test
 * Previously tested @hono/zod-openapi defaultHook; now tests express validateBody middleware
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import express from 'express';
import request from 'supertest';
import { validateBody } from './express/validate-body.js';
import { withArrayQueryCoercion } from '@/composition/coerce-array-query-params.js';

const TestBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const TestParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Create a minimal test app with validateBody middleware
 */
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Test route with body validation
  app.post('/test', validateBody(TestBodySchema), (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Test route with UUID param validation
  app.get('/test/:id', (req, res) => {
    const result = TestParamSchema.safeParse({ id: req.params['id'] });
    if (!result.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.flatten(),
      });
      return;
    }
    res.status(200).json({ ok: true });
  });

  return app;
}

describe('validateBody middleware (Express equivalent of defaultHook)', () => {
  describe('request body validation', () => {
    it('should return 422 when required fields are missing', async () => {
      const app = createTestApp();
      const res = await request(app).post('/test').set('Content-Type', 'application/json').send({});

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.message).toBe('Request validation failed');
      expect(res.body.details).toBeDefined();
    });

    it('should return 422 when email format is invalid', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test', email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 when request body is valid', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test', email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('path params validation', () => {
    it('should return 422 when path param is not a valid UUID', async () => {
      const app = createTestApp();
      const res = await request(app).get('/test/not-a-uuid');

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 when path param is a valid UUID', async () => {
      const app = createTestApp();
      const res = await request(app).get('/test/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});

describe('array query param coercion (Issue #708)', () => {
  const querySchema = z.object({
    q: z.string().optional(),
    rankIds: z.array(z.string().uuid()).optional(),
    genders: z.array(z.enum(['MALE', 'FEMALE', 'OTHER'])).optional(),
  });

  function createArrayQueryTestApp() {
    const app = express();

    // Middleware that coerces single-string query params to arrays
    app.get('/test-array', (req, res) => {
      // Coerce single-value array params from Express query (already handles arrays)
      const rawQuery = req.query as Record<string, unknown>;
      const processedQuery: Record<string, unknown> = {};

      // Apply withArrayQueryCoercion logic for test
      for (const [key, value] of Object.entries(rawQuery)) {
        processedQuery[key] = value;
      }

      // Use withArrayQueryCoercion for array fields
      const coercedSchema = withArrayQueryCoercion(querySchema);
      const result = coercedSchema.safeParse(processedQuery);

      if (!result.success) {
        res.status(422).json({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: (result as { success: false; error: z.ZodError }).error.flatten(),
        });
        return;
      }
      res.status(200).json({ ok: true });
    });

    return app;
  }

  it('should return 200 when a single UUID is passed for an array param', async () => {
    const app = createArrayQueryTestApp();
    const res = await request(app).get('/test-array?rankIds=550e8400-e29b-41d4-a716-446655440000');

    expect(res.status).toBe(200);
  });

  it('should return 200 when multiple UUIDs are passed for an array param', async () => {
    const app = createArrayQueryTestApp();
    const res = await request(app).get(
      '/test-array?rankIds=550e8400-e29b-41d4-a716-446655440000&rankIds=660e8400-e29b-41d4-a716-446655440000'
    );

    expect(res.status).toBe(200);
  });

  it('should return 422 when an invalid value is passed for an array param', async () => {
    const app = createArrayQueryTestApp();
    const res = await request(app).get('/test-array?rankIds=not-a-uuid');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 200 when a single enum is passed for an array param', async () => {
    const app = createArrayQueryTestApp();
    const res = await request(app).get('/test-array?genders=MALE');

    expect(res.status).toBe(200);
  });

  it('should return 200 when combining single array param with string param', async () => {
    const app = createArrayQueryTestApp();
    const res = await request(app).get(
      '/test-array?rankIds=550e8400-e29b-41d4-a716-446655440000&q=search'
    );

    expect(res.status).toBe(200);
  });

  it('should return 200 with no query params', async () => {
    const app = createArrayQueryTestApp();
    const res = await request(app).get('/test-array');

    expect(res.status).toBe(200);
  });
});
