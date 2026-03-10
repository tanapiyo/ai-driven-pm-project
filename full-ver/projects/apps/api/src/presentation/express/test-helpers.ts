/**
 * @what Test helper - lightweight Express app factory for supertest
 * @why Provides a minimal Express app without OpenAPI validator middleware,
 *      so tests can run without the openapi.yaml spec file on disk.
 *
 * ADR-0013: section 3 (Testing: supertest)
 *
 * Usage:
 *   import request from 'supertest';
 *   import { createTestApp } from './test-helpers.js';
 *
 *   const app = createTestApp();
 *   const res = await request(app).get('/health');
 *   expect(res.status).toBe(200);
 */

import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import type { Application } from 'express';
import { createHealthRouter } from './routes/health.js';
import { createVersionRouter } from './routes/version.js';

/**
 * Creates a minimal Express application suitable for supertest integration tests.
 *
 * Includes:
 * - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * - CORS middleware with localhost:3000 allowed
 * - X-Request-ID propagation
 * - JSON body parsing
 * - GET /health route
 * - Global error handler
 *
 * Does NOT include:
 * - OpenAPI validator (requires openapi.yaml to be present)
 * - DI context injection (not needed for unit-level HTTP tests)
 * - Request logger (reduces test noise)
 */
export function createTestApp(): Application {
  const app = express();

  // Security headers
  const securityHeaders: RequestHandler = (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
  app.use(securityHeaders);

  // CORS
  const corsMiddleware: RequestHandler = (req, res, next) => {
    const allowedOrigins = ['http://localhost:3000'];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Request-ID'
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
  app.use(corsMiddleware);

  // Request ID
  const requestIdMiddleware: RequestHandler = (req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  };
  app.use(requestIdMiddleware);

  // Body parsing
  app.use(express.json());

  // Routes
  app.use('/health', createHealthRouter());
  app.use('/version', createVersionRouter());

  // Global error handler (must be last)
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const error = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({ code: 'INTERNAL_ERROR', message: error.message });
  };
  app.use(errorHandler);

  return app;
}
