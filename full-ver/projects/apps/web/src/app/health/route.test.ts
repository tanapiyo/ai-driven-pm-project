/**
 * @what GET /health route handler unit test
 * @why Verify the health endpoint returns 200 with { status: 'ok', timestamp }
 *
 * Related: Issue #130 (REPO-005) - Docker Compose web/api/db/redis setup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from './route';

describe('GET /health', () => {
  const FIXED_ISO = '2026-01-01T00:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_ISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return HTTP 200', async () => {
    const response = GET();
    expect(response.status).toBe(200);
  });

  it('should return JSON body with status "ok"', async () => {
    const response = GET();
    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  it('should include an ISO timestamp in the response body', async () => {
    const response = GET();
    const body = await response.json();
    expect(body.timestamp).toBe(FIXED_ISO);
  });
});
