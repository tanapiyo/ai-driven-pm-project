---
applyTo: "apps/**/src/presentation/**,packages/**/src/presentation/**"
---

# Presentation Layer Instructions

## Role: HTTP/UI Interface

外部からのリクエストを受け取り、UseCaseを呼び出し、レスポンスを返す。

## Non-negotiables

1. **依存制約**: usecase, shared のみimport可能
2. **禁止import**: domain, infrastructure を直接importしない
3. **変換責務**: HTTPリクエスト/レスポンスの変換のみ担当
4. **エラーマッピング**: UseCaseのエラーをHTTPステータスコードに変換

## Layer Rules

```
✅ presentation → usecase (OK)
✅ presentation → shared (OK)
❌ presentation → domain (NG - ドメインオブジェクトを直接扱わない)
❌ presentation → infrastructure (NG)
```

## Required Patterns

### Controller

```typescript
/**
 * @what ユーザーコントローラー
 * @why ユーザー関連のHTTPリクエストを処理
 */
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase
  ) {}

  async createUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 1. リクエストボディをパース
    const body = await this.parseJsonBody(req);

    // 2. ユースケースを実行
    const result = await this.createUserUseCase.execute({
      email: body.email,
      name: body.name,
      requestId: crypto.randomUUID(),
    });

    // 3. エラーをHTTPステータスにマッピング
    if (result.isFailure()) {
      switch (result.error) {
        case 'invalid_email':
          return this.sendError(res, 400, 'Invalid email format');
        case 'email_already_exists':
          return this.sendError(res, 409, 'Email already exists');
        default:
          return this.sendError(res, 500, 'Internal server error');
      }
    }

    // 4. 成功レスポンス
    this.sendJson(res, 201, result.value);
  }
}
```

### Router

```typescript
/**
 * @what HTTPルーター
 * @why URLパスとHTTPメソッドをコントローラーにディスパッチ
 */
export async function handleRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  context: RouteContext
): Promise<void> {
  const method = req.method ?? 'GET';
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

  // POST /users
  if (pathname === '/users' && method === 'POST') {
    await context.userController.createUser(req, res);
    return;
  }

  // GET /users/:id
  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch && method === 'GET') {
    await context.userController.getUser(req, res, userMatch[1]);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}
```

## Error Mapping

| UseCase Error | HTTP Status | 説明 |
|---------------|-------------|------|
| `invalid_*` | 400 | バリデーションエラー |
| `not_found` | 404 | リソースが存在しない |
| `*_exists` | 409 | 競合（重複） |
| `unauthorized` | 401 | 認証エラー |
| `forbidden` | 403 | 認可エラー |
| `repository_error` | 500 | 内部エラー |

## Comment Pattern

```typescript
/**
 * @what 何を処理するか（1行）
 * @why なぜこのエンドポイントが必要か
 */
```

## OpenAPI First

新しいエンドポイントを追加する場合:

1. まず `docs/02_architecture/api/*.yaml` にOpenAPI仕様を定義
2. その後、実装を行う
3. ガードレール `openapi-route-coverage` が仕様と実装の整合性をチェック
