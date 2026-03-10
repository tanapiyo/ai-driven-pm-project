/**
 * @what Health Presenter Unit Tests
 * @why Presenter層の純粋性を保証（HTTP依存なし、OAS準拠）
 */

import { describe, it, expect } from 'vitest';
import { healthPresenter } from './health.presenter';

describe('healthPresenter', () => {
  describe('success', () => {
    it('should return 200 status with ok and timestamp', () => {
      const timestamp = '2024-01-01T00:00:00.000Z';

      const result = healthPresenter.success({ timestamp });

      expect(result).toEqual({
        status: 200,
        body: {
          status: 'ok',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should match OAS schema structure', () => {
      const timestamp = new Date().toISOString();

      const result = healthPresenter.success({ timestamp });

      // OAS schema validation
      expect(result.body).toHaveProperty('status');
      expect(result.body).toHaveProperty('timestamp');
      expect(result.body.status).toBe('ok');
      expect(typeof result.body.timestamp).toBe('string');
    });

    it('should be a pure function (no side effects)', () => {
      const timestamp = '2024-01-01T00:00:00.000Z';

      const result1 = healthPresenter.success({ timestamp });
      const result2 = healthPresenter.success({ timestamp });

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object instances
    });
  });
});
