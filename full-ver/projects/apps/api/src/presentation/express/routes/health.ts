/**
 * @what GET /health Express router
 * @why Health check endpoint for Express 5.x server
 *
 * ADR-0013: health endpoint migrated from Hono to Express
 */

import { Router, type RequestHandler } from 'express';

/**
 * Creates the health router with GET /health endpoint.
 * Mount at /health: app.use('/health', createHealthRouter())
 */
export function createHealthRouter(): Router {
  const router = Router();

  /**
   * GET /health
   * Returns 200 with server status and timestamp
   */
  const healthHandler: RequestHandler = (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  };

  router.get('/', healthHandler);

  return router;
}
