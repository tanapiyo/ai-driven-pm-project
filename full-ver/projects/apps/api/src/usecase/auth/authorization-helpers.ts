/**
 * @what ユースケース用認可ヘルパー関数
 * @why ad-hoc な認可チェックを標準化し、RBAC マトリクスに基づいた一貫性のある判定を提供
 */

import type { AuthorizedContext } from './authorized-context.js';

/**
 * 指定ユーザーのデータにアクセス可能か判定する
 *
 * - admin: すべてのユーザーにアクセス可能
 * - user: 自分のデータのみ
 */
export function canAccessUserData(ctx: AuthorizedContext, targetUserId: string): boolean {
  if (ctx.role === 'admin') {
    return true;
  }

  return ctx.userId === targetUserId;
}

/**
 * @deprecated Use canAccessUserData instead
 */
export function canAccessUnitData(_ctx: AuthorizedContext, _targetUnitId: string): boolean {
  return false;
}

/**
 * @deprecated Layer-based access control removed
 */
export function isUnitManager(_ctx: AuthorizedContext, _unitId: string): boolean {
  return false;
}
