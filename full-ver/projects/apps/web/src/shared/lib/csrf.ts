/**
 * @layer shared
 * @segment lib
 * @what CSRF トークン取得ユーティリティ
 * @why Double-Submit Cookie パターンで CSRF トークンを取得し、リクエストヘッダーに設定するため
 */

const CSRF_TOKEN_COOKIE_NAME = 'X-CSRF-Token';

/**
 * Cookie から CSRF トークンを取得
 * サーバーサイドレンダリング時は null を返す
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp(`${CSRF_TOKEN_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * CSRF トークンが存在するかチェック
 */
export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null;
}
