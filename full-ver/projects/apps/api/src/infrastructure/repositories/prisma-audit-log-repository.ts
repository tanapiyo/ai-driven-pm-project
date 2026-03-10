/**
 * @what Audit Log Prisma Repository
 * @why Persist and retrieve audit logs from PostgreSQL
 *
 * Infrastructure rules:
 * - Implements domain interface
 * - Uses Prisma for database operations
 * - Returns Result<T> for error handling
 */

import { Result } from '@monorepo/shared';
import type { RepositoryError } from '@monorepo/shared';
import type { PrismaClient } from '@/infrastructure/database/index.js';
import {
  AuditLog,
  AuditLogId,
  type AuditLogRepository,
  type AuditLogFilters,
  type PaginationOptions,
  type PaginatedResult,
  type AuditLogWithActor,
  type AuditAction,
  type AuditChanges,
  type AuditMetadata,
} from '@/domain/index.js';
import type { Logger } from '@/infrastructure/logger/index.js';

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger?: Logger
  ) {}

  async create(auditLog: AuditLog): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: auditLog.id.value,
          actorId: auditLog.actorId,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          action: auditLog.action,
          changes: auditLog.changes as object | undefined,
          metadata: auditLog.metadata as object | undefined,
          createdAt: auditLog.timestamp,
        },
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger?.errorWithException('Failed to create audit log', error, {
        operation: 'create',
        auditLogId: auditLog.id.value,
      });
      return Result.fail('db_error');
    }
  }

  async findById(id: AuditLogId): Promise<Result<AuditLogWithActor, RepositoryError>> {
    try {
      const record = await this.prisma.auditLog.findUnique({
        where: { id: id.value },
        include: {
          actor: {
            select: { name: true },
          },
        },
      });

      if (!record) {
        return Result.fail('not_found');
      }

      return Result.ok(this.toDomainWithActor(record));
    } catch (error) {
      this.logger?.errorWithException('Failed to find audit log by id', error, {
        operation: 'findById',
        auditLogId: id.value,
      });
      return Result.fail('db_error');
    }
  }

  async findAll(
    filters: AuditLogFilters,
    pagination: PaginationOptions
  ): Promise<Result<PaginatedResult<AuditLogWithActor>, RepositoryError>> {
    try {
      const where = this.buildWhereClause(filters);
      const skip = (pagination.page - 1) * pagination.limit;

      const [records, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: {
            actor: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pagination.limit,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      const data = records.map((record) => this.toDomainWithActor(record));
      const totalPages = Math.ceil(total / pagination.limit);

      return Result.ok({
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      this.logger?.errorWithException('Failed to list audit logs', error, {
        operation: 'findAll',
        filters,
        pagination,
      });
      return Result.fail('db_error');
    }
  }

  private buildWhereClause(filters: AuditLogFilters) {
    const where: Record<string, unknown> = {};

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, Date>).lte = filters.endDate;
      }
    }

    return where;
  }

  private toDomainWithActor(record: {
    id: string;
    actorId: string;
    entityType: string;
    entityId: string;
    action: string;
    changes: unknown;
    metadata: unknown;
    ipAddress?: string | null;
    createdAt: Date;
    actor: { name: string };
  }): AuditLogWithActor {
    const auditLog = AuditLog.restore(
      new AuditLogId(record.id),
      record.actorId,
      record.entityType,
      record.entityId,
      record.action as AuditAction,
      record.changes as AuditChanges | null,
      record.metadata as AuditMetadata | null,
      record.ipAddress ?? null,
      record.createdAt
    );

    // Create a new object that includes actorName
    return Object.assign(auditLog, { actorName: record.actor.name });
  }
}
