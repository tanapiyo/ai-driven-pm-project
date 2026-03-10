/**
 * @what 現在のユーザー取得ユースケース
 * @why 認証済みユーザーの情報取得
 */

import { Result } from '@monorepo/shared';
import {
  AuthUserId,
  type AuthUserRepository,
  type UserRole,
  type UserStatus,
} from '@/domain/index.js';

export interface GetCurrentUserInput {
  userId: string;
}

export interface GetCurrentUserOutput {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type GetCurrentUserError = 'user_not_found' | 'internal_error';

export class GetCurrentUserUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(
    input: GetCurrentUserInput
  ): Promise<Result<GetCurrentUserOutput, GetCurrentUserError>> {
    const userId = new AuthUserId(input.userId);

    const userResult = await this.authUserRepository.findById(userId);
    if (userResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const user = userResult.value;
    if (!user) {
      return Result.fail('user_not_found');
    }

    return Result.ok({
      id: user.id.value,
      email: user.email.value,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
