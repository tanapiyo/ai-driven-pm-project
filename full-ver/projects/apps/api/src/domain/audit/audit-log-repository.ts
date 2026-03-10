/**
 * @what Audit Log Repository Interface
 * @why Define contract for audit log persistence (domain layer)
 *
 * Domain rules:
 * - Audit logs can only be created and read (no update/delete)
 * - Listing supports filtering and pagination
 */

import type { Result, RepositoryError } from '@monorepo/shared';
import type { AuditLog, AuditLogId, AuditAction } from './audit-log.js';

/**
 * Filters for listing audit logs
 */
export interface AuditLogFilters {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Audit log with actor name (for display)
 */
export interface AuditLogWithActor extends AuditLog {
  actorName: string;
}

/**
 * Audit Log Repository Interface
 *
 * Note: No update() or delete() methods - audit logs are immutable
 */
export interface AuditLogRepository {
  /**
   * Create a new audit log entry
   */
  create(auditLog: AuditLog): Promise<Result<void, RepositoryError>>;

  /**
   * Find audit log by ID
   */
  findById(id: AuditLogId): Promise<Result<AuditLogWithActor, RepositoryError>>;

  /**
   * List audit logs with filtering and pagination
   */
  findAll(
    filters: AuditLogFilters,
    pagination: PaginationOptions
  ): Promise<Result<PaginatedResult<AuditLogWithActor>, RepositoryError>>;
}
