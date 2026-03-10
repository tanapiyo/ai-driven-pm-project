/**
 * @what リフレッシュトークンの Prisma リポジトリ
 * @why PostgreSQL を使った本番用実装
 */

import { Result } from '@monorepo/shared';
import type { RepositoryError } from '@monorepo/shared';
import type { PrismaClient } from '@/infrastructure/database/index.js';
import type { RefreshTokenRepository } from '@/domain/auth/refresh-token-repository.js';
import { RefreshToken, RefreshTokenId, TokenHash } from '@/domain/auth/refresh-token.js';
import { AuthUserId } from '@/domain/auth/auth-user.js';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(token: RefreshToken): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.refreshToken.create({
        data: {
          id: token.id.value,
          userId: token.userId.value,
          tokenHash: token.tokenHash.value,
          expiresAt: token.expiresAt,
          createdAt: token.createdAt,
          revokedAt: token.revokedAt,
        },
      });
      return Result.ok(undefined);
    } catch {
      return Result.fail('db_error');
    }
  }

  async update(token: RefreshToken): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.refreshToken.update({
        where: { id: token.id.value },
        data: {
          revokedAt: token.revokedAt,
        },
      });
      return Result.ok(undefined);
    } catch {
      return Result.fail('db_error');
    }
  }

  async findById(id: RefreshTokenId): Promise<Result<RefreshToken | null, RepositoryError>> {
    try {
      const record = await this.prisma.refreshToken.findUnique({
        where: { id: id.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      return Result.ok(this.toDomain(record));
    } catch {
      return Result.fail('db_error');
    }
  }

  async findByTokenHash(
    tokenHash: TokenHash
  ): Promise<Result<RefreshToken | null, RepositoryError>> {
    try {
      const record = await this.prisma.refreshToken.findFirst({
        where: { tokenHash: tokenHash.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      return Result.ok(this.toDomain(record));
    } catch {
      return Result.fail('db_error');
    }
  }

  async revokeAllByUserId(userId: AuthUserId): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: userId.value,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      return Result.ok(undefined);
    } catch {
      return Result.fail('db_error');
    }
  }

  async delete(id: RefreshTokenId): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.refreshToken.delete({
        where: { id: id.value },
      });
      return Result.ok(undefined);
    } catch {
      return Result.fail('db_error');
    }
  }

  private toDomain(record: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
  }): RefreshToken {
    return RefreshToken.restore(
      new RefreshTokenId(record.id),
      new AuthUserId(record.userId),
      TokenHash.create(record.tokenHash),
      record.expiresAt,
      record.createdAt,
      record.revokedAt
    );
  }
}
