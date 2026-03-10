/**
 * @what Handler function signature types
 * @why すべてのhandlerが同一の型を持つことを保証
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 *
 * Clean Architecture的責務:
 * - Handler: presentation層のendpoint handler
 */

import type { RequestHandler } from 'express';

/**
 * Standard Express handler type
 *
 * @example
 * ```typescript
 * export const getHealth: Handler = (_req, res) => {
 *   res.status(200).json({ status: 'ok' });
 * };
 * ```
 */
export type Handler = RequestHandler;

/**
 * Handler registry type
 * - Key: operationId or route name
 * - Value: Express RequestHandler
 */
export type HandlerRegistry = Record<string, Handler>;
