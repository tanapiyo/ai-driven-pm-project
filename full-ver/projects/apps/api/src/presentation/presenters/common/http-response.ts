/**
 * @what HTTP Response型定義
 * @why Presenter層の返り値を標準化
 *
 * Clean Architectureルール:
 * - Presenterは Result<T, E> → HttpResponse への変換を担当
 * - HTTP依存（status, headers）はここで初めて登場
 * - UseCase/Domain層にはHTTP概念を持ち込まない
 */

/**
 * HTTP Response representation
 */
export interface HttpResponse<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Helper to create success response
 */
export function successResponse<T>(body: T, status = 200): HttpResponse<T> {
  return { status, body };
}

/**
 * Helper to create error response
 */
export function errorResponse(
  code: string,
  message: string,
  status = 500,
  details?: unknown
): HttpResponse<ErrorResponse> {
  return {
    status,
    body: { code, message, details },
  };
}
