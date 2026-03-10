/**
 * @what 認証HTTPコントローラー
 * @why 認証関連のエンドポイントを処理
 *
 * presentation層のルール:
 * - usecase層のみimport可能
 * - domain層、infrastructure層を直接importしない
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 */

import type { Request, Response } from 'express';
import type {
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  GetCurrentUserUseCase,
} from '@/usecase/index.js';

export interface ControllerLogger {
  errorWithException(message: string, error: unknown, context?: Record<string, unknown>): void;
}

// Cookie 設定用の定数
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7日

/**
 * refreshToken を HttpOnly Cookie として設定するヘッダーを生成
 */
function createRefreshTokenCookie(refreshToken: string): string {
  return `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${REFRESH_TOKEN_MAX_AGE}`;
}

/**
 * refreshToken Cookie を削除するヘッダーを生成
 */
function createClearRefreshTokenCookie(): string {
  return 'refreshToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly logger: ControllerLogger
  ) {}

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    try {
      const body = req.body as { email: string; password: string };

      const result = await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
      });

      if (result.isFailure()) {
        switch (result.error) {
          case 'invalid_credentials':
            res
              .status(401)
              .json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
            return;
          default:
            res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
            return;
        }
      }

      // refreshToken を HttpOnly Cookie として設定
      res.setHeader('Set-Cookie', createRefreshTokenCookie(result.value.refreshToken));

      res.status(200).json({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
        expiresIn: result.value.expiresIn,
        tokenType: 'Bearer' as const,
      });
    } catch (error) {
      this.logger.errorWithException('Failed to login', error, {
        requestId,
        operation: 'login',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, userId: string): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    try {
      const result = await this.logoutUseCase.execute({ userId });

      if (result.isFailure()) {
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
        return;
      }

      // refreshToken Cookie を削除
      res.setHeader('Set-Cookie', createClearRefreshTokenCookie());

      res.status(204).end();
    } catch (error) {
      this.logger.errorWithException('Failed to logout', error, {
        requestId,
        userId,
        operation: 'logout',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/refresh
   *
   * refreshToken は以下の優先順位で取得:
   * 1. リクエストボディ
   * 2. HttpOnly Cookie
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    try {
      const body = req.body as { refreshToken?: string };
      // body から取得、なければ Cookie から取得
      const refreshToken = body.refreshToken ?? this.getRefreshTokenFromCookie(req);

      if (!refreshToken) {
        res.status(401).json({ code: 'INVALID_TOKEN', message: 'Refresh token is required' });
        return;
      }

      const result = await this.refreshTokenUseCase.execute({ refreshToken });

      if (result.isFailure()) {
        switch (result.error) {
          case 'invalid_token':
          case 'token_expired':
          case 'user_not_found':
            res
              .status(401)
              .json({ code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' });
            return;
          default:
            res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
            return;
        }
      }

      // refreshToken を HttpOnly Cookie として設定
      res.setHeader('Set-Cookie', createRefreshTokenCookie(result.value.refreshToken));

      res.status(200).json({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
        expiresIn: result.value.expiresIn,
        tokenType: 'Bearer' as const,
      });
    } catch (error) {
      this.logger.errorWithException('Failed to refresh token', error, {
        requestId,
        operation: 'refresh',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  /**
   * GET /auth/me
   */
  async getCurrentUser(req: Request, res: Response, userId: string): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    try {
      const result = await this.getCurrentUserUseCase.execute({ userId });

      if (result.isFailure()) {
        switch (result.error) {
          case 'user_not_found':
            res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
            return;
          default:
            res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
            return;
        }
      }

      res.status(200).json({
        id: result.value.id,
        email: result.value.email,
        name: result.value.name,
        role: result.value.role,
        status: result.value.status,
        createdAt: result.value.createdAt.toISOString(),
        updatedAt: result.value.updatedAt.toISOString(),
      });
    } catch (error) {
      this.logger.errorWithException('Failed to get current user', error, {
        requestId,
        userId,
        operation: 'getCurrentUser',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  /**
   * Cookie ヘッダーから refreshToken を取得
   */
  private getRefreshTokenFromCookie(req: Request): string | null {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          acc[name] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    return cookies['refreshToken'] ?? null;
  }
}
