---
applyTo: "apps/**/src/composition/**,packages/**/src/composition/**"
---

# Composition Layer Instructions

## Role: Dependency Injection

すべてのレイヤーの依存関係を組み立て、アプリケーションコンテキストを構築。

## Non-negotiables

1. **唯一の組み立て場所**: DIはここでのみ行う
2. **全レイヤーimport可能**: composition層のみ全レイヤーをimportできる
3. **環境切り替え**: 環境変数等で実装を切り替える

## Layer Rules

```
✅ composition → domain (OK)
✅ composition → usecase (OK)
✅ composition → presentation (OK)
✅ composition → infrastructure (OK)
✅ composition → shared (OK)
```

## Required Patterns

### Container

```typescript
/**
 * @what DIコンテナ
 * @why 各レイヤーの依存関係を組み立て
 */

import { InMemoryUserRepository } from '../infrastructure/index.js';
import { PostgresUserRepository } from '../infrastructure/index.js';
import { CreateUserUseCase, GetUserUseCase } from '../usecase/index.js';
import { UserController, type RouteContext } from '../presentation/index.js';

/**
 * アプリケーションコンテキストを作成
 */
export function createAppContext(): RouteContext {
  // 環境に応じて実装を切り替え
  const userRepository = process.env.NODE_ENV === 'production'
    ? new PostgresUserRepository(getDbPool())
    : new InMemoryUserRepository();

  // UseCases
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const getUserUseCase = new GetUserUseCase(userRepository);

  // Controllers
  const userController = new UserController(createUserUseCase, getUserUseCase);

  return {
    userController,
  };
}
```

### Factory Pattern

```typescript
/**
 * @what リポジトリファクトリ
 * @why 環境に応じたリポジトリ実装を提供
 */
export function createUserRepository(): UserRepository {
  const env = process.env.NODE_ENV ?? 'development';

  switch (env) {
    case 'production':
      return new PostgresUserRepository(getDbPool());
    case 'test':
      return new InMemoryUserRepository();
    default:
      return new InMemoryUserRepository();
  }
}
```

## Environment Configuration

```typescript
/**
 * @what 環境設定
 * @why 環境変数を型安全に読み込み
 */
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  databaseUrl?: string;
}

export function loadConfig(): AppConfig {
  return {
    env: (process.env.NODE_ENV as AppConfig['env']) ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    databaseUrl: process.env.DATABASE_URL,
  };
}
```

## Comment Pattern

```typescript
/**
 * @what 何を構成するか（1行）
 * @why なぜこの構成が必要か
 */
```
