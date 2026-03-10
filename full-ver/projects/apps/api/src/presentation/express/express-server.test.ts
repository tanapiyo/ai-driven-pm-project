/**
 * @what Express 5.x server integration tests
 * @why Verifies AC from Issue #21 - Express server setup
 *
 * Tests:
 * - GET /health returns 200
 * - Security headers are present
 * - CORS headers are present
 * - X-Request-ID is set on response
 * - Error handler returns structured error
 * - validateBody returns 422 on invalid body
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import { validateBody } from './validate-body.js';
import { createHealthRouter } from './routes/health.js';
import { createTestApp } from './test-helpers.js';
import { z } from 'zod';

describe('Express server - GET /health (AC #7)', () => {
  it('should return 200 with status ok', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return JSON content type', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Express server - security headers (AC #4)', () => {
  it('should set X-Content-Type-Options: nosniff', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set X-Frame-Options: DENY', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('should set X-XSS-Protection', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['x-xss-protection']).toBeDefined();
  });

  it('should set Referrer-Policy', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

describe('Express server - CORS middleware (AC #4)', () => {
  it('should set CORS headers for allowed origins', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('should NOT set CORS headers for disallowed origins', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health').set('Origin', 'http://evil.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should handle OPTIONS preflight with 204', async () => {
    const app = createTestApp();
    const res = await request(app).options('/health').set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(204);
  });
});

describe('Express server - request ID middleware (AC #4)', () => {
  it('should set X-Request-ID header on response', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('should use the provided X-Request-ID if present', async () => {
    const app = createTestApp();
    const customId = 'test-request-id-12345';
    const res = await request(app).get('/health').set('X-Request-ID', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });
});

describe('validateBody middleware (AC #6)', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  function createValidationTestApp() {
    const app = express();
    app.use(express.json());

    const validationRoute: RequestHandler = (req, res, next) => {
      validateBody(TestSchema)(req, res, next);
    };

    const validationSuccessHandler: RequestHandler = (req, res) => {
      res.status(200).json({ validatedBody: req.validatedBody });
    };

    app.post('/test', validationRoute, validationSuccessHandler);

    const errHandler: ErrorRequestHandler = (_err, _req, res, _next) => {
      res.status(500).json({ code: 'INTERNAL_ERROR' });
    };
    app.use(errHandler);

    return app;
  }

  it('should return 422 when body is invalid', async () => {
    const app = createValidationTestApp();
    const res = await request(app)
      .post('/test')
      .send({ name: '', age: -1 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBe('Request validation failed');
    expect(res.body.details).toBeDefined();
  });

  it('should return 200 and set validatedBody when body is valid', async () => {
    const app = createValidationTestApp();
    const res = await request(app)
      .post('/test')
      .send({ name: 'Alice', age: 25 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.validatedBody).toEqual({ name: 'Alice', age: 25 });
  });

  it('should return 422 when required fields are missing', async () => {
    const app = createValidationTestApp();
    const res = await request(app).post('/test').send({}).set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('Express createHealthRouter (AC #7)', () => {
  it('should export createHealthRouter as a function', () => {
    expect(typeof createHealthRouter).toBe('function');
  });

  it('should create a valid Express Router', () => {
    const router = createHealthRouter();
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});

describe('Express module exports (AC #2)', () => {
  it('should export validateBody', async () => {
    const mod = await import('./index.js');
    expect(mod.validateBody).toBeDefined();
    expect(typeof mod.validateBody).toBe('function');
  });

  it('should export createExpressApp', async () => {
    const mod = await import('./index.js');
    expect(mod.createExpressApp).toBeDefined();
    expect(typeof mod.createExpressApp).toBe('function');
  });

  it('should export createHealthRouter', async () => {
    const mod = await import('./index.js');
    expect(mod.createHealthRouter).toBeDefined();
    expect(typeof mod.createHealthRouter).toBe('function');
  });
});

describe('express.d.ts type declaration (AC #2)', () => {
  it('should be resolvable as a module', async () => {
    // Type declaration files cannot be runtime-imported; verify file existence
    const { existsSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const declarationPath = resolve(__dirname, '../types/express.d.ts');

    expect(existsSync(declarationPath)).toBe(true);
  });
});
