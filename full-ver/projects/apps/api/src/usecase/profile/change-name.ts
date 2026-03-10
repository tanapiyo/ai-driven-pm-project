/**
 * @what 名前変更ユースケース
 * @why 認証済みユーザーが自分の名前を更新する
 */

import { Result } from '@monorepo/shared';
import type { AuthUserRepository } from '@/domain/index.js';
import { AuthUserId } from '@/domain/index.js';

export interface ChangeNameInput {
  userId: string;
  name: string;
  causationId: string;
  correlationId: string;
}

export interface ChangeNameOutput {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChangeNameError = 'user_not_found' | 'invalid_name' | 'same_name' | 'internal_error';

export class ChangeNameUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(input: ChangeNameInput): Promise<Result<ChangeNameOutput, ChangeNameError>> {
    // 1. ユーザーの取得
    let userId: AuthUserId;
    try {
      userId = new AuthUserId(input.userId);
    } catch {
      return Result.fail('user_not_found');
    }

    const userResult = await this.authUserRepository.findById(userId);
    if (userResult.isFailure()) {
      if (userResult.error === 'not_found') {
        return Result.fail('user_not_found');
      }
      return Result.fail('internal_error');
    }

    const user = userResult.value;

    // 2. 名前の変更
    const changeResult = user.changeName(input.name, input.causationId, input.correlationId);
    if (changeResult.isFailure()) {
      if (changeResult.error === 'same_name') {
        return Result.fail('same_name');
      }
      return Result.fail('invalid_name');
    }

    // 3. 保存（既存ユーザーの更新なので update を使用）
    const updateResult = await this.authUserRepository.update(user);
    if (updateResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok({
      id: user.id.value,
      name: user.name,
      email: user.email.value,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
