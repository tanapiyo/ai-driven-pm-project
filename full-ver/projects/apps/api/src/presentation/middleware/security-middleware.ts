/**
 * @what セキュリティヘッダーミドルウェア
 * @why HTTPレスポンスにセキュリティ関連ヘッダーを付与し、一般的な攻撃を防止
 */

import type { ServerResponse } from 'node:http';

export interface SecurityConfig {
  /** HSTS を有効にするか（本番環境のみ推奨） */
  enableHSTS: boolean;
  /** CSP ディレクティブ */
  contentSecurityPolicy?: string;
}

const DEFAULT_CONFIG: SecurityConfig = {
  enableHSTS: process.env.NODE_ENV === 'production',
  contentSecurityPolicy: "default-src 'self'",
};

export class SecurityMiddleware {
  private readonly config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * セキュリティヘッダーをレスポンスに付与
   */
  applyHeaders(res: ServerResponse): void {
    // XSS 攻撃防止
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // クリックジャッキング防止
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS フィルター有効化（レガシーブラウザ向け）
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer 情報の漏洩防止
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // MIME タイプスニッフィング防止
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // HTTPS 強制（本番環境のみ）
    if (this.config.enableHSTS) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // CSP
    if (this.config.contentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', this.config.contentSecurityPolicy);
    }

    // キャッシュ制御（API レスポンス用）
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}
