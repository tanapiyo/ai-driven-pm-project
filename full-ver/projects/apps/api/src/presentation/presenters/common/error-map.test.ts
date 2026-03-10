/**
 * @what Error Mapping Unit Tests
 * @why エラー → HTTPステータスの変換が正しいことを保証
 */

import { describe, it, expect } from 'vitest';
import { getErrorMapping, DEFAULT_ERROR_MAP } from './error-map';

describe('getErrorMapping', () => {
  it('should map domain errors to 400 status', () => {
    const mapping = getErrorMapping('invalid_email');

    expect(mapping.status).toBe(400);
    expect(mapping.code).toBe('INVALID_EMAIL');
    expect(mapping.message).toBeTruthy();
  });

  it('should map not_found to 404 status', () => {
    const mapping = getErrorMapping('not_found');

    expect(mapping.status).toBe(404);
    expect(mapping.code).toBe('NOT_FOUND');
  });

  it('should map already_exists to 409 status', () => {
    const mapping = getErrorMapping('already_exists');

    expect(mapping.status).toBe(409);
    expect(mapping.code).toBe('ALREADY_EXISTS');
  });

  it('should map unauthorized to 401 status', () => {
    const mapping = getErrorMapping('unauthorized');

    expect(mapping.status).toBe(401);
    expect(mapping.code).toBe('UNAUTHORIZED');
  });

  it('should map internal_error to 500 status', () => {
    const mapping = getErrorMapping('internal_error');

    expect(mapping.status).toBe(500);
    expect(mapping.code).toBe('INTERNAL_ERROR');
  });

  it('should allow custom error mappings to override defaults', () => {
    const customMap = {
      invalid_email: {
        status: 422,
        code: 'CUSTOM_CODE',
        message: 'Custom message',
      },
    };

    const mapping = getErrorMapping('invalid_email', customMap);

    expect(mapping.status).toBe(422);
    expect(mapping.code).toBe('CUSTOM_CODE');
    expect(mapping.message).toBe('Custom message');
  });

  it('should map validation_error to 422 status', () => {
    const mapping = getErrorMapping('validation_error');

    expect(mapping.status).toBe(422);
    expect(mapping.code).toBe('VALIDATION_ERROR');
    expect(mapping.message).toBeTruthy();
  });

  it('should map forbidden to 403 status', () => {
    const mapping = getErrorMapping('forbidden');

    expect(mapping.status).toBe(403);
    expect(mapping.code).toBe('FORBIDDEN');
  });

  it('should map conflict to 409 status', () => {
    const mapping = getErrorMapping('conflict');

    expect(mapping.status).toBe(409);
    expect(mapping.code).toBe('CONFLICT');
  });

  it('should have mappings for all error types', () => {
    const errorTypes = Object.keys(DEFAULT_ERROR_MAP);

    expect(errorTypes.length).toBeGreaterThan(0);
    errorTypes.forEach((errorType) => {
      const mapping = DEFAULT_ERROR_MAP[errorType as keyof typeof DEFAULT_ERROR_MAP];
      expect(mapping.status).toBeGreaterThan(0);
      expect(mapping.code).toBeTruthy();
      expect(mapping.message).toBeTruthy();
    });
  });

  it('should cover all standard HTTP error status codes (400/401/403/404/409/422/500)', () => {
    const statusCodes = Object.values(DEFAULT_ERROR_MAP).map((m) => m.status);
    expect(statusCodes).toContain(400);
    expect(statusCodes).toContain(401);
    expect(statusCodes).toContain(403);
    expect(statusCodes).toContain(404);
    expect(statusCodes).toContain(409);
    expect(statusCodes).toContain(422);
    expect(statusCodes).toContain(500);
  });
});
