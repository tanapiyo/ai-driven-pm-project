/**
 * @what Express 5.x HTTP server entry point
 * @why Starts the Express application using app.listen()
 *
 * ADR-0013: replaces @hono/node-server serve({ fetch: app.fetch })
 */

import { createAppContext } from '@/composition/container.js';
import { createExpressApp } from './create-express-app.js';
import { logger } from '@/infrastructure/logger/index.js';

const PORT = Number(process.env['PORT'] ?? 3000);

const context = createAppContext();
const app = createExpressApp(context);

const server = app.listen(PORT, () => {
  logger.info('Express server started', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    health: `http://localhost:${PORT}/health`,
  });
});

export { app, server };
