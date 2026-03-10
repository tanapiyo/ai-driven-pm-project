/**
 * @what CORS ミドルウェア
 * @why クロスオリジンリクエストを制御し、許可されたオリジンからのみアクセスを許可
 *
 * NOTE: In local development with Traefik, CORS is handled by Traefik middleware.
 * This middleware serves as a fallback for production environments without Traefik.
 * Traefik CORS headers will take precedence when both are present.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

export interface CorsConfig {
  /** 許可するオリジン（カンマ区切りまたは '*'） */
  allowedOrigins: string[];
  /** 許可する HTTP メソッド */
  allowedMethods: string[];
  /** 許可するリクエストヘッダー */
  allowedHeaders: string[];
  /** クレデンシャル（Cookie等）を許可するか */
  allowCredentials: boolean;
  /** プリフライトのキャッシュ時間（秒） */
  maxAge: number;
}

const DEFAULT_CONFIG: CorsConfig = {
  allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowCredentials: true,
  maxAge: 86400,
};

export class CorsMiddleware {
  private readonly config: CorsConfig;

  constructor(config: Partial<CorsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * CORS ヘッダーを付与
   * @returns true: プリフライトリクエストで終了、false: 通常のリクエスト処理を続行
   */
  handle(req: IncomingMessage, res: ServerResponse): boolean {
    const origin = req.headers.origin;

    if (origin && this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);

      if (this.config.allowCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', this.config.allowedMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', this.config.allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', String(this.config.maxAge));

      res.writeHead(204);
      res.end();
      return true;
    }

    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');

    return false;
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }
    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Check if an origin is allowed (public API for Hono middleware)
   */
  isAllowedOrigin(origin: string): boolean {
    return this.isOriginAllowed(origin);
  }
}
