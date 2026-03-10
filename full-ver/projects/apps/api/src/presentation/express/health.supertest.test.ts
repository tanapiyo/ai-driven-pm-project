/**
 * @what supertest infrastructure sample test - GET /health
 * @why AC from Issue #22 - supertest test infrastructure setup
 *      Demonstrates the supertest pattern using the shared createTestApp helper.
 *
 * This file is the canonical example of how to write supertest tests for
 * Express endpoints in this repository.
 *
 * Pattern:
 *   1. Import createTestApp from test-helpers.ts
 *   2. Call request(app) from supertest
 *   3. Assert on status, body, and headers
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './test-helpers.js';

describe('GET /health - supertest infrastructure (Issue #22)', () => {
  it('should return 200 with { status: "ok" }', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('should include a timestamp in the response body', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.timestamp).toBe('string');
    // Verify timestamp is a valid ISO 8601 date
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });

  it('should return application/json content-type', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
