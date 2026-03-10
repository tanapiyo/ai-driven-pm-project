/**
 * @what JWTサービス実装
 * @why アクセストークンとリフレッシュトークンの生成・検証
 *
 * infrastructure層のルール:
 * - 外部ライブラリの詳細を隠蔽
 * - domain層のインターフェースを実装
 */

import jwt from 'jsonwebtoken';
import { Result } from '@monorepo/shared';
import type {
  JwtService,
  JwtPayload,
  TokenPair,
  JwtServiceError,
  UserRole,
} from '@/domain/index.js';

// Re-export types from domain for convenience
export type { JwtService, JwtPayload, TokenPair, JwtServiceError };

export interface JwtServiceConfig {
  secret: string;
  accessTokenExpiresIn: number; // seconds
  refreshTokenExpiresIn: number; // seconds
}

export class JwtServiceImpl implements JwtService {
  constructor(private readonly config: JwtServiceConfig) {}

  generateTokenPair(
    userId: string,
    email: string,
    role: UserRole
  ): Result<TokenPair, JwtServiceError> {
    try {
      const now = Math.floor(Date.now() / 1000);

      const accessToken = jwt.sign(
        {
          sub: userId,
          email,
          role,
          iat: now,
          exp: now + this.config.accessTokenExpiresIn,
          type: 'access',
        },
        this.config.secret
      );

      const refreshToken = jwt.sign(
        {
          sub: userId,
          email,
          role,
          iat: now,
          exp: now + this.config.refreshTokenExpiresIn,
          type: 'refresh',
        },
        this.config.secret
      );

      return Result.ok({
        accessToken,
        refreshToken,
        accessTokenExpiresIn: this.config.accessTokenExpiresIn,
        refreshTokenExpiresIn: this.config.refreshTokenExpiresIn,
      });
    } catch {
      return Result.fail('sign_failed');
    }
  }

  generateAccessToken(
    userId: string,
    email: string,
    role: UserRole
  ): Result<string, JwtServiceError> {
    try {
      const now = Math.floor(Date.now() / 1000);

      const accessToken = jwt.sign(
        {
          sub: userId,
          email,
          role,
          iat: now,
          exp: now + this.config.accessTokenExpiresIn,
          type: 'access',
        },
        this.config.secret
      );

      return Result.ok(accessToken);
    } catch {
      return Result.fail('sign_failed');
    }
  }

  verifyAccessToken(token: string): Result<JwtPayload, JwtServiceError> {
    return this.verifyToken(token, 'access');
  }

  verifyRefreshToken(token: string): Result<JwtPayload, JwtServiceError> {
    return this.verifyToken(token, 'refresh');
  }

  private verifyToken(
    token: string,
    expectedType: 'access' | 'refresh'
  ): Result<JwtPayload, JwtServiceError> {
    try {
      const decoded = jwt.verify(token, this.config.secret) as JwtPayload & { type: string };

      if (decoded.type !== expectedType) {
        return Result.fail('invalid_token');
      }

      return Result.ok({
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Result.fail('token_expired');
      }
      return Result.fail('invalid_token');
    }
  }
}
