/**
 * @what パスワード変更ユースケース
 * @why 認証済みユーザーが自分のパスワードを更新する（現在のパスワード検証必須）
 */

import { Result } from '@monorepo/shared';
import type {
  AuthUserRepository,
  RefreshTokenRepository,
  PasswordService,
} from '@/domain/index.js';
import { AuthUserId } from '@/domain/index.js';

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  causationId: string;
  correlationId: string;
}

export interface ChangePasswordOutput {
  message: string;
}

export type ChangePasswordError =
  | 'user_not_found'
  | 'incorrect_password'
  | 'weak_password'
  | 'internal_error';

export class ChangePasswordUseCase {
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordService: PasswordService
  ) {}

  async execute(
    input: ChangePasswordInput
  ): Promise<Result<ChangePasswordOutput, ChangePasswordError>> {
    // 1. パスワード強度の検証
    const strengthResult = this.passwordService.validateStrength(input.newPassword);
    if (strengthResult.isFailure()) {
      return Result.fail('weak_password');
    }

    // 2. ユーザーの取得
    let userId: AuthUserId;
    try {
      userId = new AuthUserId(input.userId);
    } catch {
      return Result.fail('user_not_found');
    }

    const userResult = await this.authUserRepository.findById(userId);
    if (userResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const user = userResult.value;
    if (!user) {
      return Result.fail('user_not_found');
    }

    // 3. 現在のパスワードの検証
    const verifyResult = await this.passwordService.verify(
      input.currentPassword,
      user.passwordHash
    );
    if (verifyResult.isFailure()) {
      return Result.fail('internal_error');
    }
    if (!verifyResult.value) {
      return Result.fail('incorrect_password');
    }

    // 4. 新しいパスワードのハッシュ化
    const hashResult = await this.passwordService.hash(input.newPassword);
    if (hashResult.isFailure()) {
      return Result.fail('internal_error');
    }

    // 5. パスワードの更新
    user.changePassword(hashResult.value, input.causationId, input.correlationId);

    // 既存ユーザーの更新なので update を使用
    const updateResult = await this.authUserRepository.update(user);
    if (updateResult.isFailure()) {
      return Result.fail('internal_error');
    }

    // 6. 既存のリフレッシュトークンをすべて無効化（セキュリティ対策）
    await this.refreshTokenRepository.revokeAllByUserId(user.id);

    return Result.ok({
      message: 'Password has been changed successfully.',
    });
  }
}
