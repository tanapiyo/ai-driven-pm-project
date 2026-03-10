/**
 * @what Health Presenter
 * @why UseCase output → HTTPレスポンスへの変換
 *
 * Clean Architectureルール:
 * - Presenterは純粋関数（可能な限り）
 * - HTTPレスポンス型（status, body, headers）を返す
 * - Hono Context は受け取らない（testability重視）
 */

import type { HttpResponse } from './common/http-response.js';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

interface HealthInput {
  timestamp: string;
}

/**
 * Health Presenter
 */
export const healthPresenter = {
  /**
   * Present success response
   */
  success(input: HealthInput): HttpResponse<HealthResponse> {
    return {
      status: 200,
      body: {
        status: 'ok' as const,
        timestamp: input.timestamp,
      },
    };
  },
};
