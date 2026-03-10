/**
 * @what トークンリフレッシュユースケース
 * @why アクセストークンの更新
 */

import { Result } from '@monorepo/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  RefreshToken,
  RefreshTokenId,
  type AuthUserRepository,
  type RefreshTokenRepository,
  type TokenHashService,
} from '@/domain/index.js';
import type { JwtService } from '@/infrastructure/index.js';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type RefreshTokenError =
  | 'invalid_token'
  | 'token_expired'
  | 'user_not_found'
  | 'internal_error';

export class RefreshTokenUseCase {
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly tokenHashService: TokenHashService
  ) {}

  async execute(input: RefreshTokenInput): Promise<Result<RefreshTokenOutput, RefreshTokenError>> {
    // 1. トークンの検証
    const verifyResult = this.jwtService.verifyRefreshToken(input.refreshToken);
    if (verifyResult.isFailure()) {
      if (verifyResult.error === 'token_expired') {
        return Result.fail('token_expired');
      }
      return Result.fail('invalid_token');
    }

    // payload は検証済み（verifyResult.value）だが、
    // DB に保存されたトークンの userId を使用する

    // 2. リフレッシュトークンハッシュの確認
    const tokenHash = this.tokenHashService.hashToken(input.refreshToken);
    const tokenResult = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (tokenResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const storedToken = tokenResult.value;
    if (!storedToken || !storedToken.isValid()) {
      return Result.fail('invalid_token');
    }

    // 3. ユーザーの存在確認
    const userResult = await this.authUserRepository.findById(storedToken.userId);
    if (userResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const user = userResult.value;
    if (!user) {
      return Result.fail('user_not_found');
    }

    // 4. 古いリフレッシュトークンを無効化（既存トークンの更新なので update を使用）
    storedToken.revoke();
    await this.refreshTokenRepository.update(storedToken);

    // 5. 新しいトークンペアを生成
    const tokenPairResult = this.jwtService.generateTokenPair(
      user.id.value,
      user.email.value,
      user.role
    );
    if (tokenPairResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const tokenPair = tokenPairResult.value;

    // 6. 新しいリフレッシュトークンを保存
    const newRefreshTokenHash = this.tokenHashService.hashToken(tokenPair.refreshToken);
    const newRefreshToken = RefreshToken.create({
      id: new RefreshTokenId(uuidv4()),
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + tokenPair.refreshTokenExpiresIn * 1000),
    });

    if (newRefreshToken.isFailure()) {
      return Result.fail('internal_error');
    }

    const saveResult = await this.refreshTokenRepository.save(newRefreshToken.value);
    if (saveResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.accessTokenExpiresIn,
    });
  }
}
