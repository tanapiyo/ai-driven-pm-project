/**
 * @layer features
 * @segment audit
 * @what Audit Log types
 */

export type AuditEntityType = 'User';
export type AuditAction = 'create' | 'update' | 'delete' | 'authorization_denied';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  actorId?: string;
  entityType?: AuditEntityType;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}
