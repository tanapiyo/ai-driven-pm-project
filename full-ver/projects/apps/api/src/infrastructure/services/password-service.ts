/**
 * @what パスワードハッシュサービス実装
 * @why bcryptを使用したパスワードのハッシュ化と検証
 *
 * infrastructure層のルール:
 * - 外部ライブラリの詳細を隠蔽
 * - ドメイン層のインターフェースを実装
 */

import bcrypt from 'bcrypt';
import { Result } from '@monorepo/shared';
import { PasswordHash } from '@/domain/auth/auth-user.js';
import type { PasswordService, PasswordServiceError } from '@/domain/auth/password-service.js';

export class BcryptPasswordService implements PasswordService {
  constructor(private readonly rounds: number = 12) {}

  async hash(plainPassword: string): Promise<Result<PasswordHash, PasswordServiceError>> {
    try {
      const hashed = await bcrypt.hash(plainPassword, this.rounds);
      return Result.ok(PasswordHash.create(hashed));
    } catch {
      return Result.fail('hash_failed');
    }
  }

  async verify(
    plainPassword: string,
    hash: PasswordHash
  ): Promise<Result<boolean, PasswordServiceError>> {
    try {
      const isValid = await bcrypt.compare(plainPassword, hash.value);
      return Result.ok(isValid);
    } catch {
      return Result.fail('verify_failed');
    }
  }

  validateStrength(password: string): Result<void, 'weak_password'> {
    // 8文字以上、英字と数字を含む
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < minLength || !hasLetter || !hasNumber) {
      return Result.fail('weak_password');
    }

    return Result.ok(undefined);
  }
}
