/**
 * @what JWTサービスのインターフェース
 * @why トークン生成・検証の抽象化（domain層）
 */

import type { Result } from '@monorepo/shared';
import type { UserRole } from './auth-user.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export type JwtServiceError = 'sign_failed' | 'verify_failed' | 'token_expired' | 'invalid_token';

export interface JwtService {
  generateTokenPair(
    userId: string,
    email: string,
    role: UserRole
  ): Result<TokenPair, JwtServiceError>;
  generateAccessToken(
    userId: string,
    email: string,
    role: UserRole
  ): Result<string, JwtServiceError>;
  verifyAccessToken(token: string): Result<JwtPayload, JwtServiceError>;
  verifyRefreshToken(token: string): Result<JwtPayload, JwtServiceError>;
}
