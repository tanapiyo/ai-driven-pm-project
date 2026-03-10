/**
 * @what Application構成の統合（Express版）
 * @why middleware + routes の結線
 *
 * Clean Architecture的責務:
 * - Global middleware: クロスカッティングコンサーン（CORS, 認証, ログなど）
 * - Routes: skeleton 基盤 auth/profile/admin-user/audit
 * - Composition: すべてを統合してconfigured app を返す
 *
 * ADR-0013: Replaced legacy Hono buildApp() with Express createExpressApp()
 * The Hono implementation has been fully migrated to Express.
 */

import type { Application } from 'express';
import { createExpressApp } from '@/presentation/express/create-express-app.js';
import { createAppContext } from './container.js';

/**
 * Build and configure the Express application
 *
 * @returns Configured Express Application instance
 *
 * @example
 * ```typescript
 * const app = buildApp();
 * app.listen(3000);
 * ```
 */
export function buildApp(): Application {
  const context = createAppContext();
  return createExpressApp(context);
}
