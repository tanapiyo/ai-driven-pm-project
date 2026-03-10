/**
 * @what 認証ユーザーの Prisma リポジトリ
 * @why PostgreSQL を使った本番用実装
 */

import { Result, Email } from '@monorepo/shared';
import type { RepositoryError } from '@monorepo/shared';
import type { PrismaClient } from '@/infrastructure/database/index.js';
import type {
  AuthUserRepository,
  ListUsersFilter,
  PaginationOptions,
  PaginatedResult,
} from '@/domain/auth/auth-user-repository.js';
import {
  AuthUser,
  AuthUserId,
  PasswordHash,
  type UserRole,
  type UserStatus,
} from '@/domain/auth/auth-user.js';
import type { Logger } from '@/infrastructure/logger/index.js';

export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger?: Logger
  ) {}

  async save(user: AuthUser): Promise<Result<AuthUser, RepositoryError>> {
    try {
      const record = await this.prisma.authUser.create({
        data: {
          id: user.id.value,
          email: user.email.value,
          name: user.name,
          role: user.role,
          status: user.status,
          passwordHash: user.passwordHash.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      user.clearDomainEvents();
      return Result.ok(this.toDomain(record));
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        this.logger?.errorWithException('AuthUser save conflict (duplicate)', error, {
          operation: 'save',
          userId: user.id.value,
        });
        return Result.fail('conflict');
      }
      this.logger?.errorWithException('Failed to save auth user', error, {
        operation: 'save',
        userId: user.id.value,
      });
      return Result.fail('db_error');
    }
  }

  async findById(id: AuthUserId): Promise<Result<AuthUser, RepositoryError>> {
    try {
      const record = await this.prisma.authUser.findUnique({
        where: { id: id.value },
      });

      if (!record) {
        return Result.fail('not_found');
      }

      return Result.ok(this.toDomain(record));
    } catch (error) {
      this.logger?.errorWithException('Failed to find auth user by id', error, {
        operation: 'findById',
        userId: id.value,
      });
      return Result.fail('db_error');
    }
  }

  async exists(id: AuthUserId): Promise<Result<boolean, RepositoryError>> {
    try {
      const count = await this.prisma.authUser.count({
        where: { id: id.value },
      });
      return Result.ok(count > 0);
    } catch (error) {
      this.logger?.errorWithException('Failed to check auth user exists', error, {
        operation: 'exists',
        userId: id.value,
      });
      return Result.fail('db_error');
    }
  }

  async update(user: AuthUser): Promise<Result<AuthUser, RepositoryError>> {
    try {
      const record = await this.prisma.authUser.update({
        where: { id: user.id.value },
        data: {
          email: user.email.value,
          name: user.name,
          role: user.role,
          status: user.status,
          passwordHash: user.passwordHash.value,
          updatedAt: user.updatedAt,
        },
      });
      user.clearDomainEvents();
      return Result.ok(this.toDomain(record));
    } catch (error) {
      this.logger?.errorWithException('Failed to update auth user', error, {
        operation: 'update',
        userId: user.id.value,
      });
      return Result.fail('not_found');
    }
  }

  async findByEmail(email: Email): Promise<Result<AuthUser | null, RepositoryError>> {
    try {
      const record = await this.prisma.authUser.findUnique({
        where: { email: email.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      return Result.ok(this.toDomain(record));
    } catch (error) {
      this.logger?.errorWithException('Failed to find auth user by email', error, {
        operation: 'findByEmail',
      });
      return Result.fail('db_error');
    }
  }

  async emailExists(email: Email): Promise<Result<boolean, RepositoryError>> {
    try {
      const count = await this.prisma.authUser.count({
        where: { email: email.value },
      });
      return Result.ok(count > 0);
    } catch (error) {
      this.logger?.errorWithException('Failed to check auth user email exists', error, {
        operation: 'emailExists',
      });
      return Result.fail('db_error');
    }
  }

  async findAllWithPagination(
    filter: ListUsersFilter,
    pagination: PaginationOptions
  ): Promise<Result<PaginatedResult<AuthUser>, RepositoryError>> {
    try {
      const where: Record<string, unknown> = {};

      if (filter.role) {
        where.role = filter.role;
      }
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.search) {
        where.OR = [{ name: { contains: filter.search } }, { email: { contains: filter.search } }];
      }

      const [records, total] = await Promise.all([
        this.prisma.authUser.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.authUser.count({ where }),
      ]);

      return Result.ok({
        data: records.map((record) => this.toDomain(record)),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      this.logger?.errorWithException('Failed to find all auth users with pagination', error, {
        operation: 'findAllWithPagination',
      });
      return Result.fail('db_error');
    }
  }

  async delete(id: AuthUserId): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.authUser.delete({
        where: { id: id.value },
      });
      return Result.ok(undefined);
    } catch (error) {
      this.logger?.errorWithException('Failed to delete auth user', error, {
        operation: 'delete',
        userId: id.value,
      });
      return Result.fail('not_found');
    }
  }

  private toDomain(record: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  }): AuthUser {
    const email = Email.create(record.email);

    return AuthUser.restore(
      new AuthUserId(record.id),
      email,
      record.name,
      record.role as UserRole,
      record.status as UserStatus,
      PasswordHash.create(record.passwordHash),
      record.createdAt,
      record.updatedAt,
      record.deletedAt ?? null,
      1
    );
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
