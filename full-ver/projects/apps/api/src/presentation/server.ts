/**
 * @what HTTPサーバーエントリーポイント (Express)
 * @why アプリケーションの起動とルート登録
 *
 * ADR-0013: Migrated from Hono (@hono/node-server) to Express
 *
 * Composition層のルール:
 * - buildApp() で middleware + routes を統合
 * - buildApp() が全ルートを自動登録
 * - Express app.listen() で起動
 */

import { buildApp } from '@/composition/build-app.js';
import { logger } from '@/infrastructure/index.js';

const PORT = process.env['PORT'] ?? 3000;

// Build application with all middleware and routes registered
const app = buildApp();

// Start server
app.listen(Number(PORT), () => {
  logger.info('Server started', {
    port: Number(PORT),
    url: `http://localhost:${PORT}`,
  });
});

export { app };
