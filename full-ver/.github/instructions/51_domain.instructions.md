---
applyTo: "apps/**/src/domain/**,packages/**/src/domain/**"
---

# Domain Layer Instructions

## Role: Domain Model

ビジネスロジックの中核。外部レイヤーに依存しない純粋なドメインモデル。

## Non-negotiables

1. **依存禁止**: usecase, presentation, infrastructure をimportしない
2. **Result<T>必須**: リポジトリは `Promise<Result<T, E>>` を返す
3. **因果メタ必須**: ドメインイベントには `causationId`, `correlationId`, `emittedAt` を含める
4. **不変性**: Value Object は immutable

## Layer Rules

```
✅ domain → shared (OK)
❌ domain → usecase (NG)
❌ domain → presentation (NG)
❌ domain → infrastructure (NG)
```

## Required Patterns

### Entity / Aggregate Root

```typescript
/**
 * @what ユーザー集約
 * @why ユーザーに関するビジネスルールを集約
 */
export class User extends AggregateRoot<UserId> {
  // ファクトリメソッドで作成
  static create(params: CreateUserParams): Result<User, 'invalid_name'> { ... }

  // 永続化データからリストア
  static restore(id: UserId, ...): User { ... }

  // ビジネスルールを含むメソッド
  changeEmail(newEmail: Email, causationId: string, correlationId: string): Result<void, 'same_email'> { ... }
}
```

### Value Object

```typescript
/**
 * @what メールアドレス
 * @why メール形式のバリデーションをカプセル化
 */
export class Email extends ValueObject<{ value: string }> {
  protected validate(props: { value: string }): void {
    if (!EMAIL_REGEX.test(props.value)) {
      throw new Error('Invalid email format');
    }
  }

  static create(value: string): Email {
    return new Email({ value: value.toLowerCase().trim() });
  }
}
```

### Domain Event

```typescript
/**
 * @what ユーザー作成イベント
 * @why ユーザー作成をトリガーに他のサービスへ通知
 */
export class UserCreatedEvent extends DomainEvent<'UserCreated'> {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    causationId: string,    // 必須: 起因となった操作のID
    correlationId: string   // 必須: 一連の操作を紐づけるID
  ) {
    super('UserCreated', userId, 1, causationId, correlationId);
  }

  toPayload(): Record<string, unknown> { ... }
}
```

### Repository Interface

```typescript
/**
 * @what ユーザーリポジトリのインターフェース
 * @why ドメイン層がインフラ層に依存しないよう分離
 * @failure Result<T>を返さないメソッドはガードレールで検出される
 */
export interface UserRepository extends Repository<User, UserId> {
  // 必ず Result<T> で返す
  findByEmail(email: Email): Promise<Result<User, UserRepositoryError>>;
  emailExists(email: Email): Promise<Result<boolean, RepositoryError>>;
}
```

## Comment Pattern

すべてのクラス・関数に以下のコメントを付ける:

```typescript
/**
 * @what 何を表現するか（1行）
 * @why なぜこのモデルが必要か（理由）
 */
```

## Guardrails

以下のガードレールが自動で検査:

| Guard | 検査内容 |
|-------|----------|
| `repository-result` | リポジトリが Result<T> を返すか |
| `domain-event-causation` | ドメインイベントに因果メタがあるか |
| `value-object-immutability` | Value Object が不変か |
