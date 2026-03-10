/**
 * @what Ping Express router
 * @why Health check and deep ping endpoints
 *
 * ADR-0013: Wave 2 - Ping routes migrated from Hono to Express
 *
 * Routes:
 *   GET /ping/deep
 */

import { Router, type RequestHandler } from 'express';
import type { RouteContext } from '@/presentation/index.js';

/**
 * Creates the ping router.
 * Mount at /ping: app.use('/ping', createPingRouter())
 */
export function createPingRouter(): Router {
  const router = Router();

  /**
   * GET /ping/deep
   * Deep health check - checks database connectivity and other dependencies
   */
  const deepPingHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.deepPingController.deepPing(req, res);
  };
  router.get('/deep', deepPingHandler);

  return router;
}
