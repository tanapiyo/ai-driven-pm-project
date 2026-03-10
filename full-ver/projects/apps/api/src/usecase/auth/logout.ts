/**
 * @what ログアウトユースケース
 * @why リフレッシュトークンの無効化
 */

import { Result } from '@monorepo/shared';
import { AuthUserId, type RefreshTokenRepository } from '@/domain/index.js';

export interface LogoutInput {
  userId: string;
}

export type LogoutError = 'internal_error';

export class LogoutUseCase {
  constructor(private readonly refreshTokenRepository: RefreshTokenRepository) {}

  async execute(input: LogoutInput): Promise<Result<void, LogoutError>> {
    const userId = new AuthUserId(input.userId);

    const result = await this.refreshTokenRepository.revokeAllByUserId(userId);
    if (result.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok(undefined);
  }
}
