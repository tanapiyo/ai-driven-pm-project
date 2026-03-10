/**
 * @what GET /version Express router
 * @why Version information endpoint for Express 5.x server
 *
 * ADR-0013: wave 1 — /version endpoint added alongside /health
 * Issue #154: AC-003
 */

import { Router, type RequestHandler } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve to projects/apps/api/package.json
// From: projects/apps/api/src/presentation/express/routes/
// Up 4 levels: routes/ -> express/ -> presentation/ -> src/ -> api/
const PKG_PATH = resolve(__dirname, '../../../../package.json');

interface PackageJson {
  name: string;
  version: string;
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as PackageJson;

/**
 * Creates the version router with GET /version endpoint.
 * Mount at /version: app.use('/version', createVersionRouter())
 */
export function createVersionRouter(): Router {
  const router = Router();

  /**
   * GET /version
   * Returns 200 with API version information
   */
  const versionHandler: RequestHandler = (_req, res) => {
    res.status(200).json({
      version: pkg.version,
      name: pkg.name,
      timestamp: new Date().toISOString(),
    });
  };

  router.get('/', versionHandler);

  return router;
}
