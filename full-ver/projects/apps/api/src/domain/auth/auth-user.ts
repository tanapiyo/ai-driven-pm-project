/**
 * @what 認証ユーザーエンティティ
 * @why 認証に特化したユーザー情報を管理
 *
 * domain層のルール:
 * - 外部依存禁止（usecase, presentation, infrastructure をimportしない）
 * - 純粋なビジネスロジックのみ
 */

import { AggregateRoot, UUIDIdentifier, Email, Result, DomainEvent } from '@monorepo/shared';

/**
 * ユーザーロール
 */
export const UserRoles = ['admin', 'user'] as const;
export type UserRole = (typeof UserRoles)[number];

/**
 * ユーザーステータス
 */
export const UserStatuses = ['active', 'inactive'] as const;
export type UserStatus = (typeof UserStatuses)[number];

/**
 * 認証ユーザーID
 */
export class AuthUserId extends UUIDIdentifier {}

/**
 * パスワードハッシュ値オブジェクト
 */
export class PasswordHash {
  private constructor(private readonly _value: string) {}

  static create(hash: string): PasswordHash {
    return new PasswordHash(hash);
  }

  get value(): string {
    return this._value;
  }
}

/**
 * ユーザー登録イベント
 */
export class AuthUserRegisteredEvent extends DomainEvent<'AuthUserRegistered'> {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    causationId: string,
    correlationId: string
  ) {
    super('AuthUserRegistered', userId, 1, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
    };
  }
}

/**
 * パスワード変更イベント
 */
export class PasswordChangedEvent extends DomainEvent<'PasswordChanged'> {
  constructor(userId: string, version: number, causationId: string, correlationId: string) {
    super('PasswordChanged', userId, version, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {};
  }
}

/**
 * ユーザー名変更イベント
 */
export class AuthUserNameChangedEvent extends DomainEvent<'AuthUserNameChanged'> {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly oldName: string,
    public readonly newName: string,
    causationId: string,
    correlationId: string
  ) {
    super('AuthUserNameChanged', aggregateId, aggregateVersion, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      oldName: this.oldName,
      newName: this.newName,
    };
  }
}

/**
 * 認証ユーザー作成パラメータ
 */
export interface CreateAuthUserParams {
  id: AuthUserId;
  email: Email;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  passwordHash: PasswordHash;
  causationId: string;
  correlationId: string;
}

/**
 * 認証ユーザー集約
 */
export class AuthUser extends AggregateRoot<AuthUserId> {
  private _email: Email;
  private _name: string;
  private _role: UserRole;
  private _status: UserStatus;
  private _passwordHash: PasswordHash;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(
    id: AuthUserId,
    email: Email,
    name: string,
    role: UserRole,
    status: UserStatus,
    passwordHash: PasswordHash,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
  ) {
    super(id);
    this._email = email;
    this._name = name;
    this._role = role;
    this._status = status;
    this._passwordHash = passwordHash;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._deletedAt = deletedAt;
  }

  /**
   * ファクトリメソッド - 新規ユーザー登録
   */
  static create(params: CreateAuthUserParams): Result<AuthUser, never> {
    const now = new Date();
    const user = new AuthUser(
      params.id,
      params.email,
      params.name ?? '',
      params.role ?? 'user',
      params.status ?? 'active',
      params.passwordHash,
      now,
      now,
      null
    );

    user.addDomainEvent(
      new AuthUserRegisteredEvent(
        params.id.value,
        params.email.value,
        params.causationId,
        params.correlationId
      )
    );

    return Result.ok(user);
  }

  /**
   * 永続化データからリストア
   */
  static restore(
    id: AuthUserId,
    email: Email,
    name: string,
    role: UserRole,
    status: UserStatus,
    passwordHash: PasswordHash,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null,
    version: number
  ): AuthUser {
    const user = new AuthUser(
      id,
      email,
      name,
      role,
      status,
      passwordHash,
      createdAt,
      updatedAt,
      deletedAt
    );
    user.setVersion(version);
    return user;
  }

  get email(): Email {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  get role(): UserRole {
    return this._role;
  }

  get status(): UserStatus {
    return this._status;
  }

  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  /**
   * パスワードを変更
   */
  changePassword(
    newPasswordHash: PasswordHash,
    causationId: string,
    correlationId: string
  ): Result<void, never> {
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
    this.incrementVersion();

    this.addDomainEvent(
      new PasswordChangedEvent(this.id.value, this.version, causationId, correlationId)
    );

    return Result.ok(undefined);
  }

  /**
   * ユーザー情報を更新
   */
  update(params: { name?: string; role?: UserRole; status?: UserStatus }): Result<void, never> {
    if (params.name !== undefined) {
      this._name = params.name;
    }
    if (params.role !== undefined) {
      this._role = params.role;
    }
    if (params.status !== undefined) {
      this._status = params.status;
    }
    this._updatedAt = new Date();
    this.incrementVersion();

    return Result.ok(undefined);
  }

  /**
   * ユーザーを無効化
   */
  deactivate(): Result<void, never> {
    this._status = 'inactive';
    this._updatedAt = new Date();
    this.incrementVersion();

    return Result.ok(undefined);
  }

  /**
   * ユーザーがアクティブかどうか
   */
  isActive(): boolean {
    return this._status === 'active';
  }

  /**
   * ユーザー名を変更
   */
  changeName(
    newName: string,
    causationId: string,
    correlationId: string
  ): Result<void, 'invalid_name' | 'same_name'> {
    if (newName.length < 1 || newName.length > 100) {
      return Result.fail('invalid_name');
    }

    if (this._name === newName) {
      return Result.fail('same_name');
    }

    const oldName = this._name;
    this._name = newName;
    this._updatedAt = new Date();
    this.incrementVersion();

    this.addDomainEvent(
      new AuthUserNameChangedEvent(
        this.id.value,
        this.version,
        oldName,
        newName,
        causationId,
        correlationId
      )
    );

    return Result.ok(undefined);
  }
}
