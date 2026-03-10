/**
 * @what GET /health handler
 * @why ヘルスチェックエンドポイント
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 */

import type { RequestHandler } from 'express';

/**
 * GET /health handler
 */
export const getHealth: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' as const, timestamp: new Date().toISOString() });
};
