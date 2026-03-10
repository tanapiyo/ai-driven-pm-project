/**
 * @what List Audit Logs UseCase
 * @why Retrieve audit logs with filtering and pagination (Admin only)
 *
 * UseCase rules:
 * - Admin role check should be done at presentation layer
 * - Support filtering by actor, entity type, action, date range
 * - Support pagination
 */

import { Result } from '@monorepo/shared';
import type {
  AuditLogRepository,
  AuditEntityType,
  AuditAction,
  AuditChanges,
  AuditMetadata,
} from '@/domain/index.js';

export interface ListAuditLogsInput {
  page?: number;
  limit?: number;
  actorId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogOutput {
  id: string;
  actorId: string;
  actorName: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes: AuditChanges | null;
  metadata: AuditMetadata | null;
  timestamp: Date;
}

export interface ListAuditLogsOutput {
  data: AuditLogOutput[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ListAuditLogsError = 'internal_error';

export class ListAuditLogsUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(
    input: ListAuditLogsInput
  ): Promise<Result<ListAuditLogsOutput, ListAuditLogsError>> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);

    const result = await this.auditLogRepository.findAll(
      {
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        startDate: input.startDate,
        endDate: input.endDate,
      },
      { page, limit }
    );

    if (result.isFailure()) {
      return Result.fail('internal_error');
    }

    const { data, pagination } = result.value;

    return Result.ok({
      data: data.map((log) => ({
        id: log.id.value,
        actorId: log.actorId,
        actorName: log.actorName,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        changes: log.changes,
        metadata: log.metadata,
        timestamp: log.timestamp,
      })),
      pagination,
    });
  }
}
