/**
 * @what Root and utility Express routes
 * @why Root endpoint and CSRF token endpoint
 *
 * ADR-0013: Wave 2 - Root routes migrated from Hono to Express
 *
 * Routes:
 *   GET /
 *   GET /csrf-token
 */

import { Router, type RequestHandler } from 'express';

/**
 * Creates the root router.
 * Mount at /: app.use('/', createRootRouter())
 *
 * Note: must be mounted carefully to avoid catching all routes
 */
export function createRootRouter(): Router {
  const router = Router();

  /**
   * GET /
   * Returns basic API info
   */
  const rootHandler: RequestHandler = (_req, res) => {
    res.status(200).json({ name: 'Base App API', version: '0.0.1' });
  };
  router.get('/', rootHandler);

  /**
   * GET /csrf-token
   * Returns a CSRF token for use in subsequent requests
   */
  const csrfTokenHandler: RequestHandler = (_req, res) => {
    const csrfToken = crypto.randomUUID();
    res.status(200).json({ csrfToken });
  };
  router.get('/csrf-token', csrfTokenHandler);

  return router;
}
