/**
 * @what パスワードサービスインターフェース
 * @why ユースケース層がインフラ層に依存しないよう、ドメイン層でインターフェースを定義
 *
 * domain層のルール:
 * - インターフェースのみ定義（実装はinfrastructure層）
 * - 外部ライブラリに依存しない
 */

import { Result } from '@monorepo/shared';
import { PasswordHash } from './auth-user.js';

export type PasswordServiceError = 'hash_failed' | 'verify_failed';

/**
 * パスワードサービスインターフェース
 * 実装: infrastructure/services/password-service.ts
 */
export interface PasswordService {
  /**
   * パスワードをハッシュ化
   */
  hash(plainPassword: string): Promise<Result<PasswordHash, PasswordServiceError>>;

  /**
   * パスワードを検証
   */
  verify(plainPassword: string, hash: PasswordHash): Promise<Result<boolean, PasswordServiceError>>;

  /**
   * パスワード強度を検証
   */
  validateStrength(password: string): Result<void, 'weak_password'>;
}
