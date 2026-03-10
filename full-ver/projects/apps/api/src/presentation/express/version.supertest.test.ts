/**
 * @what supertest tests for Issue #154 AC coverage
 * @why Verifies /health, /version, and error handling for Express server
 *
 * AC-002: GET /health returns 200 + { status: "ok", timestamp: "..." }
 * AC-003: GET /version returns 200 + version information
 * AC-004: Common error handling - unknown path returns appropriate error response
 * AC-005: supertest tests are added
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './test-helpers.js';

describe('GET /health (AC-002)', () => {
  it('should return 200 with status "ok"', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('should include a valid ISO 8601 timestamp', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('should return application/json content-type', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('GET /version (AC-003)', () => {
  it('should return 200 with version information', async () => {
    const app = createTestApp();
    const res = await request(app).get('/version');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      version: expect.any(String),
      name: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should include a non-empty version string', async () => {
    const app = createTestApp();
    const res = await request(app).get('/version');

    expect(res.body.version).toBeTruthy();
    expect(typeof res.body.version).toBe('string');
  });

  it('should include a non-empty name string', async () => {
    const app = createTestApp();
    const res = await request(app).get('/version');

    expect(res.body.name).toBeTruthy();
    expect(typeof res.body.name).toBe('string');
  });

  it('should include a valid ISO 8601 timestamp', async () => {
    const app = createTestApp();
    const res = await request(app).get('/version');

    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('should return application/json content-type', async () => {
    const app = createTestApp();
    const res = await request(app).get('/version');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Unknown route error handling (AC-004)', () => {
  it('should return 404 for GET /unknown-path', async () => {
    const app = createTestApp();
    const res = await request(app).get('/unknown-path-that-does-not-exist');

    expect(res.status).toBe(404);
  });

  it('should return 404 for GET /api/nonexistent', async () => {
    const app = createTestApp();
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
  });
});
