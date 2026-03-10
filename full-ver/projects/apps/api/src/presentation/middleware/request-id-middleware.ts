/**
 * @what Request ID ミドルウェア
 * @why リクエスト追跡 ID を生成・伝播し、ログのトレーサビリティを向上
 *
 * FR-002: リクエスト追跡 ID（Correlation ID）
 * - X-Request-ID ヘッダーから取得、なければ生成
 * - レスポンスヘッダーに X-Request-ID を設定
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 */

import type { RequestHandler, Request } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Request ID middleware for Express
 * Generates or extracts a request ID and adds it to the response
 */
export function requestIdMiddleware(): RequestHandler {
  return (req, res, next) => {
    const existingRequestId = req.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined;
    const requestId = existingRequestId ?? crypto.randomUUID();

    req.headers[REQUEST_ID_HEADER.toLowerCase()] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  };
}

/**
 * Get request ID from Express request
 */
export function getRequestId(req: Request): string {
  return (
    (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined) ?? crypto.randomUUID()
  );
}
