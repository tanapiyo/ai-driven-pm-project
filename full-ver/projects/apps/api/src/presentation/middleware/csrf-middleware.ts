/**
 * @what CSRF保護ミドルウェア
 * @why State-changing operations（POST/PUT/PATCH/DELETE）への Cross-Site Request Forgery 攻撃を防止
 * @how Double-submit Cookie パターンを使用
 *
 * ADR-0013: Hono → Express migration (Wave 2)
 *
 * Implementation notes:
 * - For GET requests: CSRF token cookie is set BEFORE calling next() so the header
 *   can be set without worrying about the response already being sent.
 * - For state-changing requests: validates header vs cookie token before calling next().
 */

import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_HEADER_NAME = 'X-CSRF-Token';

export const csrfMiddleware: RequestHandler = (req, res, next) => {
  const method = req.method;

  // State-changing methods に対してのみCSRF検証を実施
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateChangingMethods.includes(method)) {
    // リクエストヘッダーからCSRFトークンを取得
    const headerToken = req.headers[CSRF_TOKEN_HEADER_NAME.toLowerCase()] as string | undefined;

    // Cookieからトークンを取得
    const cookieToken = getCookieFromHeader(req.headers.cookie ?? '', CSRF_TOKEN_COOKIE_NAME);

    // どちらも存在しない場合はエラー
    if (!headerToken || !cookieToken) {
      res.status(403).json({
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is missing. Include X-CSRF-Token header and cookie.',
      });
      return;
    }

    // トークンが一致しない場合はエラー（Double-submit Cookie パターン）
    if (headerToken !== cookieToken) {
      res.status(403).json({
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token validation failed',
      });
      return;
    }
  }

  // GET リクエストの場合のみ、新しいCSRFトークンを生成してレスポンスに含める
  // NOTE: Express では next() を呼ぶ前にヘッダーを設定する必要がある
  // （next() がルートハンドラーを実行してレスポンスを送信してしまうため）
  // NOTE: HttpOnly を外してある（Double-Submit Cookie パターンでは JS から読み取る必要があるため）
  if (method === 'GET') {
    const token = generateCsrfToken();
    res.setHeader(
      'Set-Cookie',
      `${CSRF_TOKEN_COOKIE_NAME}=${token}; Path=/; Secure; SameSite=Strict`
    );
  }

  next();
};

/**
 * CSRFトークンを生成
 */
function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Cookieから値を取得（Express Cookie ヘッダー文字列から解析）
 */
function getCookieFromHeader(cookieHeader: string, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));

  if (!cookie) return undefined;
  return cookie.slice(name.length + 1);
}

export { CSRF_TOKEN_HEADER_NAME };
