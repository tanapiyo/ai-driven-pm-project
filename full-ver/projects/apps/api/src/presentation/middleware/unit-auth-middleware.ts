/**
 * @what ロールベースの認可ミドルウェア
 * @why admin/user ロールによるアクセス制御を標準化
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 */

import type { RequestHandler } from 'express';
import type { UserRole } from '@/domain/index.js';

export type { AuthorizedContext } from '@/usecase/auth/authorized-context.js';

/**
 * ユーザーコンテキストミドルウェア
 * authMiddleware の後に使用し、userContext を設定する
 */
export const unitAccessMiddleware: RequestHandler = (req, res, next) => {
  const user = req.currentUser;

  if (!user) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  req.userContext = {
    userId: user.userId,
    role: user.role as UserRole,
  };

  next();
};

/**
 * アクセスガードオプション
 */
export interface UnitAccessGuardOptions {
  /** 許可するロール（指定しない場合はすべてのロールを許可） */
  allowedRoles?: UserRole[];
}

/**
 * アクセスガードファクトリ
 * ルートレベルで設定可能なアクセスガードを生成する
 *
 * - admin: すべてのチェックをバイパス
 * - user: ロールチェックを適用
 */
export const createUnitAccessGuard = (options: UnitAccessGuardOptions): RequestHandler => {
  return (req, res, next) => {
    const ctx = req.userContext;

    if (!ctx) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    // Admin はすべてのチェックをバイパス
    if (ctx.role === 'admin') {
      next();
      return;
    }

    // ロールチェック
    if (options.allowedRoles && !options.allowedRoles.includes(ctx.role as UserRole)) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
