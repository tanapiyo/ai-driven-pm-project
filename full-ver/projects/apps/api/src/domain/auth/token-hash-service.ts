/**
 * @what トークンハッシュサービスインターフェース
 * @why ユースケース層がインフラ層に依存しないよう、ドメイン層でインターフェースを定義
 *
 * domain層のルール:
 * - インターフェースのみ定義（実装はinfrastructure層）
 * - 外部ライブラリに依存しない
 */

import { TokenHash } from './refresh-token.js';

/**
 * トークンハッシュサービスインターフェース
 * 実装: infrastructure/services/token-hash-service.ts
 */
export interface TokenHashService {
  /**
   * ランダムなトークンを生成
   */
  generateToken(): string;

  /**
   * トークンをハッシュ化
   */
  hashToken(token: string): TokenHash;
}
