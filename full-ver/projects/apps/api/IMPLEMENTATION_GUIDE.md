# API Implementation Guide (OAS-Driven + Clean Architecture)

## Overview

このAPIは **OpenAPI仕様駆動** + **Clean Architecture Pattern 1** で実装されています。

**Key Principles**:

1. **OAS = Single Source of Truth**: すべてのエンドポイント・型定義はOpenAPI仕様から生成
2. **Mechanical Routing**: operationId → handler の機械的マッピング
3. **Validated Inputs Only**: OASスキーマ検証済みデータのみがUseCase層へ流れる
4. **Clean Architecture**: HTTP依存はPresentation層で止める

## Architecture Layers

```
presentation/       # HTTP Adapter Layer
├── handlers/       # operationId → UseCase 呼び出し
├── presenters/     # UseCase Result → HTTP Response 変換
├── routes/         # 機械的ルーティング登録
└── middleware/     # 認証・CORS・セキュリティヘッダー

application/        # Business Logic Orchestration
├── common/         # Result型、エラー定義
└── usecases/       # ビジネスロジック（HTTP無関係）

domain/             # Pure Business Logic
└── */              # エンティティ・Value Object

infrastructure/     # External I/O
├── repositories/   # DBアクセス実装
└── services/       # 外部サービス統合

composition/        # DI Container
└── container.ts    # すべてを結線
```

## Dependencies Rule (Clean Architecture)

```
presentation → application → domain ← infrastructure
     ↓             ↓
  handlers      usecases
  presenters      ↓
                ports (interfaces)
                  ↑
            infrastructure (implements ports)
```

**Prohibited**:

- ❌ `domain/` から `presentation/`, `infrastructure/` をimport
- ❌ `application/` から `presentation/`, `infrastructure/` をimport
- ❌ `domain/`, `application/` から Hono, Prisma などのフレームワークをimport

**Enforced by**: `.eslintrc.local.json` の `no-restricted-imports` ルール

---

## Adding a New Endpoint (Step-by-Step)

### Step 1: Define OpenAPI Spec

`docs/02_architecture/api/<domain>.yaml` に追加:

```yaml
paths:
  /users/{id}:
    get:
      operationId: getUserById # ← これが重要（handler名と一致）
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

**Rules**:

- `operationId` は **camelCase** (例: `getUserById`, `createUser`)
- リクエスト/レスポンススキーマを必ず定義
- エラーレスポンス（400, 404, 500等）も定義

### Step 2: Generate Code

```bash
cd projects/apps/api
pnpm generate:openapi
```

**Output** (例):

```
src/generated/oas/
├── routes/
│   └── users.routes.ts       # Express Router route definitions (ADR-0013)
├── schemas/
│   └── users.schemas.ts      # Zod schemas
└── types.ts                  # TypeScript types
```

### Step 3: Implement Handler

`src/presentation/handlers/<domain>/<operation-id>.handler.ts`:

```typescript
/**
 * @what GET /users/:id handler
 * @why operationId: getUserById
 *
 * ADR-0013: Express RequestHandler pattern (Hono removed)
 */

import type { RequestHandler } from 'express';
import type { RouteContext } from '@/presentation/index.js';

export const getUserById: RequestHandler = async (req, res) => {
  // 1. Extract validated input (OAS validated by express-openapi-validator)
  const { id } = req.params as { id: string };

  // 2. Get use case from context
  const context = req.appContext as unknown as RouteContext;
  const { getUserUseCase } = context;

  // 3. Call use case
  const result = await getUserUseCase.execute({ id });

  // 4. Present response
  if (result.isFailure()) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    return;
  }

  // 5. Return JSON
  res.status(200).json(result.value);
};
```

**Handler Checklist**:

- ✅ OAS validated input を抽出（`express-openapi-validator` 経由）
- ✅ UseCase を `req.appContext` DI context から取得
- ✅ UseCase の Result をチェックしてレスポンスを返す
- ✅ `res.status(status).json(body)` で返す

### Step 4: Implement Presenter

`src/presentation/presenters/<domain>.presenter.ts`:

```typescript
/**
 * @what User Presenter
 * @why UseCase Result → OAS準拠 HTTPレスポンス変換
 */

import type { HttpResponse } from './common/http-response.js';
import type { UserResponse } from '@/generated/oas/types';
import type { GetUserOutput, GetUserError } from '@/application/usecases/user/get-user.usecase';
import { getErrorMapping } from './common/error-map.js';

export const userPresenter = {
  /**
   * Success response
   */
  success(output: GetUserOutput): HttpResponse<UserResponse> {
    return {
      status: 200,
      body: {
        id: output.id,
        email: output.email,
        name: output.name,
        createdAt: output.createdAt.toISOString(),
      },
    };
  },

  /**
   * Error response
   */
  error(error: GetUserError): HttpResponse {
    const mapping = getErrorMapping(error);
    return {
      status: mapping.status,
      body: {
        code: mapping.code,
        message: mapping.message,
      },
    };
  },
};
```

**Presenter Checklist**:

- ✅ 純粋関数（Express Request/Response に依存しない）
- ✅ UseCase Output → OAS型に変換
- ✅ エラーマッピング使用（`getErrorMapping`）

### Step 5: Register Handler

`src/presentation/handlers/index.ts`:

```typescript
import { getUserById } from './<domain>/get-user-by-id.handler.js';

export const handlers = {
  getHealth,
  getUserById, // ← 追加
  // ...
} as const;
```

**Build-time Validation**:

- handler未実装 → TypeScriptコンパイルエラー
- operationIdとhandler名が不一致 → 型エラー

### Step 6: Implement UseCase (if needed)

`src/application/usecases/<domain>/<operation>.usecase.ts`:

```typescript
/**
 * @what Get User by ID UseCase
 * @why ユーザー取得のビジネスロジック
 */

import type { Result } from '../../common/result.js';
import type { UseCaseError } from '../../common/errors.js';

export interface GetUserInput {
  id: string;
}

export interface GetUserOutput {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export type GetUserError = 'not_found' | 'internal_error';

export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetUserInput): Promise<Result<GetUserOutput, GetUserError>> {
    // 1. Fetch user from repository
    const userResult = await this.userRepository.findById(input.id);

    if (userResult.isFailure()) {
      return Result.fail('not_found');
    }

    const user = userResult.value;

    // 2. Return output
    return Result.ok({
      id: user.id.value,
      email: user.email.value,
      name: user.name,
      createdAt: user.createdAt,
    });
  }
}
```

**UseCase Checklist**:

- ✅ HTTP依存なし（`Request`, `Response`, Honoを使わない）
- ✅ Result型で返す（例外を投げない）
- ✅ Repository/Serviceはインターフェース経由で注入
- ✅ Input/Output型を明示

### Step 7: Test

```bash
# Unit tests
pnpm test

# Type check
./tools/contract typecheck

# Lint
./tools/contract lint
```

**Test Checklist**:

- ✅ Presenterユニットテスト（success/error）
- ✅ UseCaseユニットテスト（ビジネスロジック）
- ✅ Handler統合テスト（optional）

---

## Commands Reference

| Command                      | Description                       |
| ---------------------------- | --------------------------------- |
| `pnpm generate:openapi`      | OASから型・スキーマ・ルーター生成 |
| `pnpm check:openapi`         | 生成物とコミットの差分確認 (CI用) |
| `./tools/contract format`    | コード整形                        |
| `./tools/contract lint`      | 静的解析                          |
| `./tools/contract typecheck` | 型チェック                        |
| `./tools/contract test`      | ユニットテスト実行                |
| `./tools/contract build`     | 本番ビルド                        |
| `pnpm dev`                   | 開発サーバー起動 (hot reload)     |

---

## Template: Vertical Slice

**代表エンドポイント**: `GET /health`

```
src/presentation/handlers/health/get-health.handler.ts
src/presentation/presenters/health.presenter.ts
src/presentation/presenters/health.presenter.test.ts
```

**Usage**:

1. このテンプレートをコピーして新しいエンドポイントを実装
2. `getHealth` → `<operationId>` に置き換え
3. OAS生成型を使用
4. Presenterテストを作成

---

## Error Handling Pattern

**Domain/Application Error** → **Presenter** → **HTTP Status + Message**

```typescript
// UseCase returns Result
const result = await useCase.execute(input);

if (result.isFailure()) {
  // Presenter maps error to HTTP response
  const httpResponse = presenter.error(result.error);
  return c.json(httpResponse.body, httpResponse.status);
}
```

**Error Mapping** (`src/presentation/presenters/common/error-map.ts`):

- `invalid_email` → 400 Bad Request
- `not_found` → 404 Not Found
- `already_exists` → 409 Conflict
- `unauthorized` → 401 Unauthorized
- `internal_error` → 500 Internal Server Error

**Customize**:

```typescript
const customMap = {
  invalid_email: {
    status: 422,
    code: 'VALIDATION_ERROR',
    message: 'Email validation failed',
  },
};

const mapping = getErrorMapping('invalid_email', customMap);
```

---

## Response Schema Validation (Dev/Test)

**Purpose**: OASスキーマとレスポンス実装の乖離を検出

```typescript
if (process.env.NODE_ENV !== 'production') {
  import { UserResponseSchema } from '@/generated/oas/schemas/users.schemas';

  const validationResult = UserResponseSchema.safeParse(httpResponse.body);
  if (!validationResult.success) {
    console.error('[Schema Validation] Response does not match OAS:', {
      errors: validationResult.error.errors,
    });
  }
}
```

**Recommendation**: Presenterユニットテストでスキーマ検証を行う（実行時検証はオプション）

---

## Directory Structure (Final)

```
src/
├── generated/oas/              # takibi生成物 (編集禁止)
│   ├── routes/
│   ├── schemas/
│   └── types.ts
│
├── presentation/               # HTTP Adapter Layer
│   ├── handlers/
│   │   ├── health/
│   │   │   └── get-health.handler.ts
│   │   └── index.ts            # Handler registry
│   ├── presenters/
│   │   ├── common/
│   │   │   ├── http-response.ts
│   │   │   └── error-map.ts
│   │   ├── health.presenter.ts
│   │   └── health.presenter.test.ts
│   ├── routes/
│   │   └── register-routes.ts  # 機械的ルーティング
│   ├── middleware/
│   ├── express/
│   │   ├── create-express-app.ts   # Express app factory (ADR-0013)
│   │   ├── server.ts               # Express server entry point
│   │   └── routes/                 # Express Router definitions
│   └── server.ts
│
├── application/                # Business Logic
│   ├── common/
│   │   ├── result.ts
│   │   └── errors.ts
│   └── usecases/
│
├── domain/                     # Pure Business Logic
│
├── infrastructure/             # External I/O
│
└── composition/                # DI Container
    └── container.ts
```

---

## Troubleshooting

### Q: 生成物がない

```bash
pnpm generate:openapi
```

### Q: 型エラー (handler not found)

`src/presentation/handlers/index.ts` にhandlerをexportしてください。

### Q: OASスキーマとレスポンスが一致しない

1. OAS定義を修正
2. `pnpm generate:openapi` 再実行
3. Presenterを更新

### Q: 依存境界違反エラー

```
Domain/Application layers must not import from Presentation layer
```

→ HTTP依存を削除してください。Result型を使い、Presenterで変換してください。

---

## Sources

- [ADR-0013](../../../docs/02_architecture/adr/0013-hono-to-express-migration.md) - Hono → Express migration decision record
- [express-openapi-validator](https://www.npmjs.com/package/express-openapi-validator) - OAS runtime validation middleware
- [Express 5.x Documentation](https://expressjs.com/) - HTTP framework
- [supertest](https://www.npmjs.com/package/supertest) - HTTP testing utility
