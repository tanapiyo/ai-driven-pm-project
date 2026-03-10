/**
 * @what トークンハッシュサービス実装
 * @why リフレッシュトークンやリセットトークンのハッシュ化
 *
 * infrastructure層のルール:
 * - ドメイン層のインターフェースを実装
 */

import { createHash, randomBytes } from 'node:crypto';
import { TokenHash } from '@/domain/auth/refresh-token.js';
import type { TokenHashService } from '@/domain/auth/token-hash-service.js';

export class CryptoTokenHashService implements TokenHashService {
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): TokenHash {
    const hash = createHash('sha256').update(token).digest('hex');
    return TokenHash.create(hash);
  }
}
