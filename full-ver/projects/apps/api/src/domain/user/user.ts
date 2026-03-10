/**
 * @what ユーザーエンティティのサンプル実装
 * @why DDDにおけるエンティティ/集約の実装パターンを示す
 *
 * domain層のルール:
 * - 外部依存禁止（usecase, presentation, infrastructure をimportしない）
 * - 純粋なビジネスロジックのみ
 * - Result<T>を使ったエラーハンドリング
 */

import { AggregateRoot, UUIDIdentifier, Email, Result, DomainEvent } from '@monorepo/shared';

/**
 * ユーザーID
 */
export class UserId extends UUIDIdentifier {
  protected validate(value: string): void {
    super.validate(value);
    // 追加のバリデーションがあればここに
  }
}

/**
 * ユーザー作成イベント
 */
export class UserCreatedEvent extends DomainEvent<'UserCreated'> {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    causationId: string,
    correlationId: string
  ) {
    super('UserCreated', userId, 1, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
      name: this.name,
    };
  }
}

/**
 * ユーザーメール変更イベント
 */
export class UserEmailChangedEvent extends DomainEvent<'UserEmailChanged'> {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly oldEmail: string,
    public readonly newEmail: string,
    causationId: string,
    correlationId: string
  ) {
    super('UserEmailChanged', aggregateId, aggregateVersion, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      oldEmail: this.oldEmail,
      newEmail: this.newEmail,
    };
  }
}

/**
 * ユーザー名変更イベント
 */
export class UserNameChangedEvent extends DomainEvent<'UserNameChanged'> {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly oldName: string,
    public readonly newName: string,
    causationId: string,
    correlationId: string
  ) {
    super('UserNameChanged', aggregateId, aggregateVersion, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> {
    return {
      oldName: this.oldName,
      newName: this.newName,
    };
  }
}

/**
 * ユーザー作成パラメータ
 */
export interface CreateUserParams {
  id: UserId;
  email: Email;
  name: string;
  causationId: string;
  correlationId: string;
}

/**
 * ユーザー集約
 */
export class User extends AggregateRoot<UserId> {
  private _email: Email;
  private _name: string;

  private constructor(id: UserId, email: Email, name: string) {
    super(id);
    this._email = email;
    this._name = name;
  }

  /**
   * ファクトリメソッド - 新規ユーザー作成
   */
  static create(params: CreateUserParams): Result<User, 'invalid_name'> {
    if (params.name.length < 1 || params.name.length > 100) {
      return Result.fail('invalid_name');
    }

    const user = new User(params.id, params.email, params.name);

    // ドメインイベントを発行
    user.addDomainEvent(
      new UserCreatedEvent(
        params.id.value,
        params.email.value,
        params.name,
        params.causationId,
        params.correlationId
      )
    );

    return Result.ok(user);
  }

  /**
   * 永続化データからリストア
   */
  static restore(id: UserId, email: Email, name: string, version: number): User {
    const user = new User(id, email, name);
    user.setVersion(version);
    return user;
  }

  // Getters
  get email(): Email {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  /**
   * メールアドレスを変更
   */
  changeEmail(
    newEmail: Email,
    causationId: string,
    correlationId: string
  ): Result<void, 'same_email'> {
    if (this._email.equals(newEmail)) {
      return Result.fail('same_email');
    }

    const oldEmail = this._email.value;
    this._email = newEmail;
    this.incrementVersion();

    this.addDomainEvent(
      new UserEmailChangedEvent(
        this.id.value,
        this.version,
        oldEmail,
        newEmail.value,
        causationId,
        correlationId
      )
    );

    return Result.ok(undefined);
  }

  /**
   * 名前を変更
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
    this.incrementVersion();

    this.addDomainEvent(
      new UserNameChangedEvent(
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
