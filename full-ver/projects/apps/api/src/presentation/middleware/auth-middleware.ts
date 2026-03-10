/**
 * @what JWT認証ミドルウェア
 * @why リクエストからJWTトークンを検証し、ユーザー情報を抽出
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { JwtService } from '@/infrastructure/index.js';
import type { UserRole } from '@/domain/index.js';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  role: UserRole;
}

export type AuthResult =
  | { authenticated: true; user: AuthenticatedRequest }
  | { authenticated: false; error: 'missing_token' | 'invalid_token' | 'token_expired' };

export class AuthMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * リクエストを認証 (Node.js HTTP pattern)
   */
  authenticate(req: IncomingMessage): AuthResult {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'missing_token' };
    }

    const token = authHeader.slice(7); // "Bearer " を除去
    return this.verifyToken(token);
  }

  /**
   * トークンを検証 (Hono pattern)
   */
  verifyToken(token: string): AuthResult {
    const result = this.jwtService.verifyAccessToken(token);

    if (result.isFailure()) {
      if (result.error === 'token_expired') {
        return { authenticated: false, error: 'token_expired' };
      }
      return { authenticated: false, error: 'invalid_token' };
    }

    const payload = result.value;

    return {
      authenticated: true,
      user: {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  }

  /**
   * 認証エラーレスポンスを送信
   */
  sendUnauthorized(
    res: ServerResponse,
    error: 'missing_token' | 'invalid_token' | 'token_expired'
  ): void {
    const messages: Record<typeof error, string> = {
      missing_token: 'Authorization header required',
      invalid_token: 'Invalid access token',
      token_expired: 'Access token expired',
    };

    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        code: 'UNAUTHORIZED',
        message: messages[error],
      })
    );
  }
}
