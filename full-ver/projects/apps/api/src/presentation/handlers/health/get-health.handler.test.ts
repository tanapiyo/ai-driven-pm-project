/**
 * @what Unit tests for GET /health handler
 * @why AC-003 (Issue #175, COD-30): /health エンドポイントのユニットテストを追加
 *
 * This is a pure unit test (no HTTP server) verifying the handler's behavior
 * in isolation. For integration-level testing, see health.supertest.test.ts.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { getHealth } from './get-health.handler.js';

describe('getHealth handler', () => {
  it('should respond with status 200', () => {
    const req = {} as Request;
    const json = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    getHealth(req, res, vi.fn());

    expect(status).toHaveBeenCalledWith(200);
  });

  it('should respond with { status: "ok", timestamp }', () => {
    const req = {} as Request;
    const json = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    getHealth(req, res, vi.fn());

    const jsonArg = json.mock.calls[0][0] as { status: string; timestamp: string };
    expect(jsonArg.status).toBe('ok');
    expect(typeof jsonArg.timestamp).toBe('string');
    expect(() => new Date(jsonArg.timestamp)).not.toThrow();
  });

  it('should include a valid ISO 8601 timestamp', () => {
    const req = {} as Request;
    const json = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    const before = new Date();
    getHealth(req, res, vi.fn());
    const after = new Date();

    const jsonArg = json.mock.calls[0][0] as { status: string; timestamp: string };
    const timestamp = new Date(jsonArg.timestamp);
    expect(timestamp >= before).toBe(true);
    expect(timestamp <= after).toBe(true);
  });
});
