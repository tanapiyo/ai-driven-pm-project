---
applyTo: "apps/**/src/infrastructure/**,packages/**/src/infrastructure/**"
---

# Infrastructure Layer Instructions

## Role: External Services

データベース、外部API、ファイルシステムなど外部サービスとの連携を担当。

## Non-negotiables

1. **依存制約**: domain, shared のみimport可能
2. **禁止import**: usecase, presentation をimportしない
3. **インターフェース実装**: domain層で定義されたインターフェースを実装
4. **Result<T>必須**: すべてのメソッドは Result<T> を返す

## Layer Rules

```
✅ infrastructure → domain (OK - インターフェースを実装)
✅ infrastructure → shared (OK)
❌ infrastructure → usecase (NG)
❌ infrastructure → presentation (NG)
```

## Required Patterns

### Repository Implementation

```typescript
/**
 * @what インメモリユーザーリポジトリ
 * @why 開発・テスト用の簡易実装
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: UserId): Promise<Result<User, RepositoryError>> {
    const user = this.users.get(id.value);
    if (!user) {
      return Result.fail('not_found');
    }
    return Result.ok(user);
  }

  async save(aggregate: User): Promise<Result<void, RepositoryError>> {
    if (this.users.has(aggregate.id.value)) {
      return Result.fail('conflict');
    }
    this.users.set(aggregate.id.value, aggregate);
    // ドメインイベントをクリア（イベントディスパッチャーに送った後）
    aggregate.clearDomainEvents();
    return Result.ok(undefined);
  }
}
```

### Database Repository

```typescript
/**
 * @what PostgreSQLユーザーリポジトリ
 * @why 本番環境での永続化
 */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: UserId): Promise<Result<User, RepositoryError>> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id.value]
      );
      if (result.rows.length === 0) {
        return Result.fail('not_found');
      }
      return Result.ok(this.mapToEntity(result.rows[0]));
    } catch (error) {
      console.error('DB error:', error);
      return Result.fail('db_error');
    }
  }

  private mapToEntity(row: UserRow): User {
    return User.restore(
      new UserId(row.id),
      Email.create(row.email),
      row.name,
      row.version
    );
  }
}
```

### Event Dispatcher

```typescript
/**
 * @what イベントディスパッチャー実装
 * @why ドメインイベントを非同期で配信
 */
export class EventDispatcherImpl implements EventDispatcher {
  private handlers = new Map<string, EventHandler[]>();

  async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    await Promise.all(handlers.map((h) => h.handle(event)));
  }
}
```

## Error Handling

```typescript
async findById(id: UserId): Promise<Result<User, RepositoryError>> {
  try {
    // 正常系
    const data = await this.db.findOne({ id: id.value });
    if (!data) {
      return Result.fail('not_found');
    }
    return Result.ok(this.mapToEntity(data));
  } catch (error) {
    // 異常系 - エラーログを出力し、汎用エラーを返す
    console.error(`Failed to find user: ${id.value}`, error);
    return Result.fail('db_error');
  }
}
```

## Comment Pattern

```typescript
/**
 * @what 何を実装するか（1行）
 * @why なぜこの実装が必要か
 */
```
