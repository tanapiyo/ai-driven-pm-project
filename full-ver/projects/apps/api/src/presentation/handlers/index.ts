/**
 * @what Handler registry
 * @why operationId → handler function の機械的マッピング
 *
 * ルール:
 * - operationId (camelCase) = handler function name
 * - 未実装ハンドラーがあれば TypeScript コンパイルエラー
 *
 * Clean Architecture的責務:
 * - OAS仕様の operationId と handler実装を1対1マッピング
 * - 型安全な registry で未実装エンドポイント検出
 * - 新規handler追加時は必ずここに登録
 */

import type { HandlerRegistry } from './types.js';
import {
  // Health
  getRoot,
  getHealth,
  deepPing,
  getCsrfToken,
  // Auth
  login,
  logout,
  refreshToken,
  getCurrentUser,
  // Profile
  updateMyName,
  updateMyPassword,
  // Admin - Users
  adminListUsers,
  adminCreateUser,
  adminGetUser,
  adminUpdateUser,
  adminDeactivateUser,
  // Admin - Audit Logs
  adminListAuditLogs,
} from './all-handlers.js';

/**
 * Handler registry
 *
 * Key = operationId (from OpenAPI spec, camelCase)
 * Value = handler function
 */
export const handlers: HandlerRegistry = {
  // Health (4)
  getRoot,
  getHealth,
  deepPing,
  getCsrfToken,
  // Auth (4)
  login,
  logout,
  refreshToken,
  getCurrentUser,
  // Profile (2)
  updateMyName,
  updateMyPassword,
  // Admin - Users (5)
  adminListUsers,
  adminCreateUser,
  adminGetUser,
  adminUpdateUser,
  adminDeactivateUser,
  // Admin - Audit Logs (1)
  adminListAuditLogs,
} as const;

/**
 * Handler type
 */
export type Handlers = typeof handlers;

/**
 * Operation ID type（型安全な operationId）
 */
export type OperationId = keyof Handlers;

/**
 * Check if an operationId has a handler implementation
 */
export function hasHandler(operationId: string): operationId is OperationId {
  return operationId in handlers;
}
