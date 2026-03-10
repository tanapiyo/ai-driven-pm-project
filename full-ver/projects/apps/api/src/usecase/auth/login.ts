/**
 * @what ログインユースケース
 * @why メールアドレスとパスワードによる認証
 */

import { Result, Email } from '@monorepo/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  RefreshToken,
  RefreshTokenId,
  type AuthUserRepository,
  type RefreshTokenRepository,
  type PasswordService,
  type TokenHashService,
} from '@/domain/index.js';
import type { JwtService } from '@/infrastructure/index.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
}

export type LoginError = 'invalid_credentials' | 'internal_error';

export class LoginUseCase {
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly tokenHashService: TokenHashService
  ) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput, LoginError>> {
    // 1. メールアドレスのバリデーション
    let email: Email;
    try {
      email = Email.create(input.email);
    } catch {
      return Result.fail('invalid_credentials');
    }

    // 2. ユーザーの取得
    const userResult = await this.authUserRepository.findByEmail(email);
    if (userResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const user = userResult.value;
    if (!user) {
      return Result.fail('invalid_credentials');
    }

    // 3. パスワードの検証
    const verifyResult = await this.passwordService.verify(input.password, user.passwordHash);
    if (verifyResult.isFailure()) {
      return Result.fail('internal_error');
    }

    if (!verifyResult.value) {
      return Result.fail('invalid_credentials');
    }

    // 4. トークンペアの生成
    const tokenPairResult = this.jwtService.generateTokenPair(
      user.id.value,
      user.email.value,
      user.role
    );
    if (tokenPairResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const tokenPair = tokenPairResult.value;

    // 5. リフレッシュトークンの保存
    const refreshTokenHash = this.tokenHashService.hashToken(tokenPair.refreshToken);
    const refreshTokenEntity = RefreshToken.create({
      id: new RefreshTokenId(uuidv4()),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + tokenPair.refreshTokenExpiresIn * 1000),
    });

    if (refreshTokenEntity.isFailure()) {
      return Result.fail('internal_error');
    }

    const saveResult = await this.refreshTokenRepository.save(refreshTokenEntity.value);
    if (saveResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.accessTokenExpiresIn,
      user: {
        id: user.id.value,
        email: user.email.value,
      },
    });
  }
}
