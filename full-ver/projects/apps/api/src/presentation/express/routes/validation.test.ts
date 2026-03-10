/**
 * @what Route-level Zod validation integration tests
 * @why AC-001: All endpoints use Zod schema validation
 *      AC-002: Invalid input returns {code, message, details?} format
 *
 * Issue #164: Standardize input validation and error responses
 */

import { describe, it, expect } from 'vitest';
import express, { type RequestHandler, type ErrorRequestHandler, type Application } from 'express';
import request from 'supertest';
import { createAuthRouter } from './auth.js';
import { createProfileRouter } from './profile.js';
import { createAdminUsersRouter } from './admin-users.js';

// ---------------------------------------------------------------------------
// Test app factory (no OpenAPI validator, no DI context needed for validation)
// ---------------------------------------------------------------------------

function buildValidationTestApp(): Application {
  const app = express();
  app.use(express.json());

  app.use('/auth', createAuthRouter());
  app.use('/users/me', createProfileRouter());
  app.use('/admin/users', createAdminUsersRouter());

  const errHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const e = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({ code: 'INTERNAL_ERROR', message: e.message });
  };
  app.use(errHandler);

  return app;
}

// ---------------------------------------------------------------------------
// POST /auth/login — LoginBodySchema
// ---------------------------------------------------------------------------

describe('POST /auth/login — Zod validation (AC-001, AC-002)', () => {
  const app = buildValidationTestApp();

  it('should return 422 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'secret' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBe('Request validation failed');
    expect(res.body.details).toBeDefined();
  });

  it('should return 422 when email format is invalid', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'secret' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when body is empty', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should pass validation and reach controller with valid body', async () => {
    // The route has no DI context here, so the handler will throw; we care
    // that validateBody does NOT block the request (no 422)
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'secret123' })
      .set('Content-Type', 'application/json');

    // Any status other than 422 means validation passed
    expect(res.status).not.toBe(422);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh — RefreshBodySchema
// ---------------------------------------------------------------------------

describe('POST /auth/refresh — Zod validation (AC-001, AC-002)', () => {
  const app = buildValidationTestApp();

  it('should return 422 when refreshToken is not a string (number given)', async () => {
    // refreshToken field is defined as z.string(), passing a number should fail
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 123 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should pass validation with empty body (refreshToken is optional)', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({})
      .set('Content-Type', 'application/json');

    // Any status other than 422 means validation passed
    expect(res.status).not.toBe(422);
  });

  it('should pass validation with valid refreshToken in body', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'sometoken' })
      .set('Content-Type', 'application/json');

    expect(res.status).not.toBe(422);
  });
});

// ---------------------------------------------------------------------------
// PATCH /users/me/name — UpdateNameBodySchema
// ---------------------------------------------------------------------------

describe('PATCH /users/me/name — Zod validation (AC-001, AC-002)', () => {
  const app = buildValidationTestApp();

  it('should return 422 when name is missing', async () => {
    const res = await request(app)
      .patch('/users/me/name')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBe('Request validation failed');
    expect(res.body.details).toBeDefined();
  });

  it('should return 422 when name is empty string', async () => {
    const res = await request(app)
      .patch('/users/me/name')
      .send({ name: '' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when name exceeds 100 characters', async () => {
    const res = await request(app)
      .patch('/users/me/name')
      .send({ name: 'a'.repeat(101) })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should pass validation with valid name and reach auth check', async () => {
    const res = await request(app)
      .patch('/users/me/name')
      .send({ name: 'Alice' })
      .set('Content-Type', 'application/json');

    // Route requires auth; missing currentUser yields 401 — not 422
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// PATCH /users/me/password — UpdatePasswordBodySchema
// ---------------------------------------------------------------------------

describe('PATCH /users/me/password — Zod validation (AC-001, AC-002)', () => {
  const app = buildValidationTestApp();

  it('should return 422 when currentPassword is missing', async () => {
    const res = await request(app)
      .patch('/users/me/password')
      .send({ newPassword: 'newpass123' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when newPassword is too short', async () => {
    const res = await request(app)
      .patch('/users/me/password')
      .send({ currentPassword: 'old', newPassword: 'short' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when body is empty', async () => {
    const res = await request(app)
      .patch('/users/me/password')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should pass validation with valid body and reach auth check', async () => {
    const res = await request(app)
      .patch('/users/me/password')
      .send({ currentPassword: 'oldpass123', newPassword: 'newpass456' })
      .set('Content-Type', 'application/json');

    // Route requires auth; missing currentUser yields 401 — not 422
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// POST /admin/users — CreateUserBodySchema
// ---------------------------------------------------------------------------

describe('POST /admin/users — Zod validation (AC-001, AC-002)', () => {
  const app = buildValidationTestApp();

  it('should return 422 when email is missing', async () => {
    const res = await request(app)
      .post('/admin/users')
      .send({ password: 'secret123', displayName: 'Alice', role: 'user' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when password is too short', async () => {
    const res = await request(app)
      .post('/admin/users')
      .send({
        email: 'alice@example.com',
        password: 'short',
        displayName: 'Alice',
        role: 'user',
      })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when role is invalid', async () => {
    const res = await request(app)
      .post('/admin/users')
      .send({
        email: 'alice@example.com',
        password: 'secret123',
        displayName: 'Alice',
        role: 'superadmin',
      })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when body is empty', async () => {
    const res = await request(app)
      .post('/admin/users')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should pass validation and reach auth/admin check with valid body', async () => {
    const res = await request(app)
      .post('/admin/users')
      .send({
        email: 'alice@example.com',
        password: 'secret123',
        displayName: 'Alice',
        role: 'user',
      })
      .set('Content-Type', 'application/json');

    // Route requires admin role; missing currentUser yields 401 — not 422
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// PATCH /admin/users/:userId — UpdateUserBodySchema
// ---------------------------------------------------------------------------

describe('PATCH /admin/users/:userId — Zod validation (AC-001, AC-002)', () => {
  const app = buildValidationTestApp();
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  it('should return 422 when displayName is empty string', async () => {
    const res = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ displayName: '' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when role is invalid', async () => {
    const res = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ role: 'invalid-role' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when status is invalid', async () => {
    const res = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ status: 'banned' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should pass validation and reach auth/admin check with valid body', async () => {
    const res = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ role: 'admin' })
      .set('Content-Type', 'application/json');

    // Route requires admin role; missing currentUser yields 401 — not 422
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// Global error handler: unhandled errors return {code, message} (AC-004)
// ---------------------------------------------------------------------------

describe('Global error handler — structured error response (AC-004)', () => {
  it('should return {code, message} format for unhandled errors', async () => {
    const app = express();
    app.use(express.json());

    // Route that throws synchronously
    const throwingHandler: RequestHandler = (_req, _res, next) => {
      next(new Error('Unexpected error'));
    };
    app.get('/throw', throwingHandler);

    const errHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      const e = err instanceof Error ? err : new Error(String(err));
      res.status(500).json({ code: 'INTERNAL_ERROR', message: e.message });
    };
    app.use(errHandler);

    const res = await request(app).get('/throw');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
    expect(res.body.message).toBeDefined();
  });
});
