/**
 * @what Audit Log Entity
 * @why Track all significant operations for compliance and debugging
 *
 * Domain rules:
 * - Audit logs are immutable (no update/delete operations)
 * - All significant entity changes must be recorded
 * - Actor information must always be captured
 */

import { UUIDIdentifier } from '@monorepo/shared';

/**
 * Audit Log ID
 */
export class AuditLogId extends UUIDIdentifier {
  protected validate(value: string): void {
    super.validate(value);
  }

  static generate(): AuditLogId {
    return new AuditLogId(crypto.randomUUID());
  }
}

/**
 * Supported actions for audit logging
 */
export const AuditActions = {
  Create: 'create',
  Update: 'update',
  Delete: 'delete',
  AuthorizationDenied: 'authorization_denied',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

/**
 * Entity types that can appear in audit logs
 */
export const AuditEntityTypes = ['User', 'Authorization'] as const;
export type AuditEntityType = string;

/**
 * Changes captured during update operations
 */
export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Additional metadata for the audit log
 */
export type AuditMetadata = Record<string, unknown>;

/**
 * Parameters for creating an audit log entry
 */
export interface CreateAuditLogParams {
  id: AuditLogId;
  actorId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: AuditChanges | null;
  metadata?: AuditMetadata | null;
  ipAddress?: string | null;
  timestamp?: Date;
}

/**
 * Audit Log Entity (Read Model)
 *
 * Audit logs are immutable records of system operations.
 * They cannot be modified or deleted after creation.
 */
export class AuditLog {
  private constructor(
    private readonly _id: AuditLogId,
    private readonly _actorId: string,
    private readonly _entityType: string,
    private readonly _entityId: string,
    private readonly _action: AuditAction,
    private readonly _changes: AuditChanges | null,
    private readonly _metadata: AuditMetadata | null,
    private readonly _ipAddress: string | null,
    private readonly _timestamp: Date
  ) {}

  /**
   * Factory method - create new audit log entry
   */
  static create(params: CreateAuditLogParams): AuditLog {
    return new AuditLog(
      params.id,
      params.actorId,
      params.entityType,
      params.entityId,
      params.action,
      params.changes ?? null,
      params.metadata ?? null,
      params.ipAddress ?? null,
      params.timestamp ?? new Date()
    );
  }

  /**
   * Restore from persistence
   */
  static restore(
    id: AuditLogId,
    actorId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    changes: AuditChanges | null,
    metadata: AuditMetadata | null,
    ipAddress: string | null,
    timestamp: Date
  ): AuditLog {
    return new AuditLog(
      id,
      actorId,
      entityType,
      entityId,
      action,
      changes,
      metadata,
      ipAddress,
      timestamp
    );
  }

  // Getters (read-only)
  get id(): AuditLogId {
    return this._id;
  }

  get actorId(): string {
    return this._actorId;
  }

  get entityType(): string {
    return this._entityType;
  }

  get entityId(): string {
    return this._entityId;
  }

  get action(): AuditAction {
    return this._action;
  }

  get changes(): AuditChanges | null {
    return this._changes;
  }

  get metadata(): AuditMetadata | null {
    return this._metadata;
  }

  get ipAddress(): string | null {
    return this._ipAddress;
  }

  get timestamp(): Date {
    return this._timestamp;
  }
}
