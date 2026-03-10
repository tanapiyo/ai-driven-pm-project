/**
 * @what Express JWT認証ミドルウェア
 * @why リクエストからJWTトークンを検証し、ユーザー情報をコンテキストに設定
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 */

import type { RequestHandler } from 'express';
import type { RouteContext } from '@/presentation/index.js';

/**
 * オプショナル認証ミドルウェア - Bearer トークンを検証
 * トークンが有効な場合は req.currentUser をセット、無効/未指定でも通過する
 * 個別のルートで req.currentUser の有無を確認して認証を強制する
 */
export const authMiddleware: RequestHandler = (req, _res, next) => {
  const context = req.appContext as RouteContext | undefined;
  const auth = context?.authMiddleware;

  if (!auth) {
    // DI context not yet set (e.g., health check before context injection)
    next();
    return;
  }

  const result = auth.authenticate(req as never);

  if (result.authenticated) {
    req.currentUser = result.user;
  }

  next();
};

/**
 * 認証必須ミドルウェア - Bearer トークンを検証し、未認証は 401 を返す
 * authMiddleware の後に使用すること
 */
export const requireAuthMiddleware: RequestHandler = (req, res, next) => {
  if (!req.currentUser) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  next();
};

/**
 * Admin権限チェックミドルウェア
 * 注意: authMiddleware の後に使用すること
 */
export const adminMiddleware: RequestHandler = (req, res, next) => {
  const user = req.currentUser;

  if (!user) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    return;
  }

  next();
};
