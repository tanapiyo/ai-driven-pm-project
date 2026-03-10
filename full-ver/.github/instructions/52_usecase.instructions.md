---
applyTo: "apps/**/src/usecase/**,packages/**/src/usecase/**"
---

# UseCase Layer Instructions

## Role: Application Logic

ビジネスフローを記述し、ドメインロジックと外部連携を調整。

## Non-negotiables

1. **依存制約**: domain, shared のみimport可能
2. **禁止import**: presentation, infrastructure を直接importしない
3. **DI**: 具象クラスではなくインターフェースに依存
4. **DTO**: 入出力は専用のDTOで定義

## Layer Rules

```
✅ usecase → domain (OK)
✅ usecase → shared (OK)
❌ usecase → presentation (NG)
❌ usecase → infrastructure (NG - DI経由で注入)
```

## Required Patterns

### UseCase Class

```typescript
/**
 * @what ユーザー作成ユースケース
 * @why 新規ユーザー登録のビジネスフローを記述
 */
export class CreateUserUseCase {
  // インターフェースに依存（具象クラスではない）
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: CreateUserInput): AsyncResult<CreateUserOutput, CreateUserError> {
    // 1. バリデーション
    // 2. ドメインロジック実行
    // 3. 永続化
    // 4. 出力DTOを返す
  }
}
```

### Input/Output DTO

```typescript
/**
 * @what ユースケースの入力DTO
 * @why 外部からの入力を型安全に受け取る
 */
export interface CreateUserInput {
  email: string;
  name: string;
  requestId: string;  // 因果追跡用
}

/**
 * @what ユースケースの出力DTO
 * @why ドメインオブジェクトを外部に公開しない
 */
export interface CreateUserOutput {
  userId: string;
  email: string;
  name: string;
}

/**
 * @what ユースケースのエラー型
 * @why 発生しうるエラーを列挙型で明示
 */
export type CreateUserError =
  | 'invalid_email'
  | 'invalid_name'
  | 'email_already_exists'
  | 'repository_error';
```

### Error Handling

```typescript
async execute(input: CreateUserInput): AsyncResult<CreateUserOutput, CreateUserError> {
  // バリデーションエラー
  try {
    email = Email.create(input.email);
  } catch {
    return Result.fail('invalid_email');
  }

  // ドメインエラー
  const userResult = User.create({ ... });
  if (userResult.isFailure()) {
    return Result.fail('invalid_name');
  }

  // インフラエラー
  const saveResult = await this.userRepository.save(userResult.value);
  if (saveResult.isFailure()) {
    return Result.fail('repository_error');
  }

  return Result.ok({ ... });
}
```

## Comment Pattern

```typescript
/**
 * @what 何をするユースケースか（1行）
 * @why なぜこのユースケースが必要か
 */
```

## Guardrails

| Guard | 検査内容 |
|-------|----------|
| `usecase-dependency` | presentation/infrastructure をimportしていないか |
