/**
 * @what リフレッシュトークンのインメモリリポジトリ
 * @why 開発・テスト用の簡易実装
 */

import { Result } from '@monorepo/shared';
import type { RepositoryError } from '@monorepo/shared';
import type { RefreshTokenRepository } from '@/domain/auth/refresh-token-repository.js';
import { RefreshToken, RefreshTokenId, TokenHash } from '@/domain/auth/refresh-token.js';
import type { AuthUserId } from '@/domain/auth/auth-user.js';

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private tokens: Map<string, RefreshToken> = new Map();

  async save(token: RefreshToken): Promise<Result<void, RepositoryError>> {
    this.tokens.set(token.id.value, token);
    return Result.ok(undefined);
  }

  async update(token: RefreshToken): Promise<Result<void, RepositoryError>> {
    if (!this.tokens.has(token.id.value)) {
      return Result.fail('not_found');
    }
    this.tokens.set(token.id.value, token);
    return Result.ok(undefined);
  }

  async findById(id: RefreshTokenId): Promise<Result<RefreshToken | null, RepositoryError>> {
    const token = this.tokens.get(id.value);
    return Result.ok(token ?? null);
  }

  async findByTokenHash(
    tokenHash: TokenHash
  ): Promise<Result<RefreshToken | null, RepositoryError>> {
    for (const token of this.tokens.values()) {
      if (token.tokenHash.equals(tokenHash)) {
        return Result.ok(token);
      }
    }
    return Result.ok(null);
  }

  async revokeAllByUserId(userId: AuthUserId): Promise<Result<void, RepositoryError>> {
    for (const [id, token] of this.tokens.entries()) {
      if (token.userId.equals(userId)) {
        token.revoke();
        this.tokens.set(id, token);
      }
    }
    return Result.ok(undefined);
  }

  async delete(id: RefreshTokenId): Promise<Result<void, RepositoryError>> {
    this.tokens.delete(id.value);
    return Result.ok(undefined);
  }

  // テスト用のヘルパーメソッド
  clear(): void {
    this.tokens.clear();
  }
}
