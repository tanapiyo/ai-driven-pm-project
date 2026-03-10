/**
 * @what Record Audit Log UseCase
 * @why Record significant system operations for compliance
 *
 * UseCase rules:
 * - Orchestrate domain and infrastructure
 * - No business logic (delegate to domain)
 * - Return Result<T> for error handling
 */

import { Result } from '@monorepo/shared';
import { AuditLog, AuditLogId } from '@/domain/index.js';
import type {
  AuditLogRepository,
  AuditEntityType,
  AuditAction,
  AuditChanges,
  AuditMetadata,
} from '@/domain/index.js';

export interface RecordAuditLogInput {
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes?: AuditChanges | null;
  metadata?: AuditMetadata | null;
}

export interface RecordAuditLogOutput {
  id: string;
  timestamp: Date;
}

export type RecordAuditLogError = 'internal_error';

export class RecordAuditLogUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(
    input: RecordAuditLogInput
  ): Promise<Result<RecordAuditLogOutput, RecordAuditLogError>> {
    const id = AuditLogId.generate();
    const timestamp = new Date();

    const auditLog = AuditLog.create({
      id,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      changes: input.changes,
      metadata: input.metadata,
      timestamp,
    });

    const createResult = await this.auditLogRepository.create(auditLog);
    if (createResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok({
      id: id.value,
      timestamp,
    });
  }
}
