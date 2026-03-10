# ADR-0013: Hono から Express への移行

## ステータス

Completed (Epic #20 — Issues #21, #22, #23, #157 完了。Hono パッケージおよび関連デッドコードを完全削除済み)

## 背景

API バックエンド（`projects/apps/api/`）は現在 Hono を HTTP フレームワークとして使用しており、以下の統合ポイントがある：

- `OpenAPIHono<AppEnv>` による型付きアプリ構築
- `@hono/zod-openapi` + `hono-takibi` による OpenAPI-first コード生成（ルート + Zod スキーマ）
- `createMiddleware<AppEnv>` による型付きミドルウェア
- `c.set()` / `c.get()` と `AppEnv.Variables` による DI コンテキスト
- `app.request()` によるインプロセステスト（HTTP サーバー不要）

Express への移行が決定された。本 ADR では、各 Hono 固有の統合ポイントに対する推奨代替手段を記録する。

## 決定事項

### 1. OpenAPI バリデーション: express-openapi-validator（hono-takibi + @hono/zod-openapi の代替）

**推奨**: `express-openapi-validator` v5.6+

hono-takibi は OpenAPI 仕様からルート定義を生成する。Express では、コード生成の代わりにミドルウェアによる実行時バリデーションで対応する。

```typescript
// Before (Hono): hono-takibi が createRoute() + Zod スキーマを生成
app.openapi(route, handler);

// After (Express): 同じ OpenAPI 仕様からの実行時バリデーション
import * as OpenApiValidator from "express-openapi-validator";
app.use(
  OpenApiValidator.middleware({
    apiSpec: "./docs/02_architecture/api/openapi.yaml",
    validateRequests: true,
    validateResponses: true,
  }),
);
router.get("/health", healthHandler); // 標準的な Express Router
```

OpenAPI 仕様は引き続き Single Source of Truth となる。Orval クライアント生成やドメイン Zod スキーマへの影響はない。

**検討した代替案**:

| オプション            | 判定                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `express-zod-api` v27 | フルフレームワーク、過度に独自仕様                               |
| `openapi-backend`     | ルーティング層を追加、Express Router と競合                      |
| `tsoa`                | コードファースト（デコレータ）、仕様ファーストワークフローと競合 |
| 手動 Zod ミドルウェア | レスポンスバリデーションなし、OAS 定義と重複                     |

### 2. Zod リクエストバリデーションミドルウェア（express-openapi-validator の補完）

バリデーション済みデータへの型付きアクセス（Hono の `c.req.valid('json')` 相当）のため、軽量なジェネリックミドルウェアを追加する：

```typescript
// validateBody<T>(schema) は req.body を Zod でパースし、
// 失敗時は 422 を返し、成功時は req.validatedBody にセットする。
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: result.error.flatten(),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
```

express-openapi-validator は仕様レベルの OAS 準拠を担保し、このミドルウェアはルートごとのコンパイル時型推論を追加する。

### 3. テスト: supertest（app.request() の代替）

**推奨**: `supertest` v7.2+

```typescript
// Before (Hono): インプロセスリクエスト
const app = buildApp();
const res = await app.request("/health", { method: "GET" });
expect(res.status).toBe(200);

// After (Express): supertest
import request from "supertest";
const app = buildApp();
const res = await request(app).get("/health");
expect(res.status).toBe(200);
expect(res.body).toEqual({ status: "ok" });
```

supertest は内部でエフェメラルポートにバインドするため、手動のサーバー管理は不要。標準的な async/await で Vitest と統合できる。

### 4. DI コンテキスト注入（AppEnv 型付きコンテキストの代替）

**推奨**: `express.Request` に対する TypeScript declaration merging

```typescript
// Before (Hono): AppEnv ジェネリック経由で c.get('context') が型付き
// After (Express): declaration merging 経由で req.appContext が型付き

// src/presentation/types/express.d.ts
declare module "express" {
  interface Request {
    appContext: RouteContext;
    currentUser?: {
      userId: string;
      email: string;
      role: UserRole;
    };
  }
}

// ミドルウェアが req.appContext = createAppContext() をセット
// ハンドラーは req.appContext（型付き）と req.currentUser を読み取る
```

これは Express における DI の標準パターンである。

### 5. ミドルウェアとサーバーの移行

ミドルウェア: `createMiddleware<AppEnv>` を標準の `RequestHandler` に置き換える。`c.get('context')` / `c.set('user')` パターンは `req.appContext` / `req.currentUser` にマッピングされる（セクション 4 参照）。

サーバー: `@hono/node-server` の `serve({ fetch: app.fetch })` を `app.listen(port)` に置き換える。

## 移行リスクとトレードオフ

### 型安全性の比較

| 観点                    | Hono                                          | Express                                |
| ----------------------- | --------------------------------------------- | -------------------------------------- |
| コンテキスト変数        | ジェネリックパラメータ `AppEnv`               | `Request` への declaration merging     |
| ルートパラメータ/ボディ | `c.req.valid()` による型推論                  | 手動 Zod ミドルウェアまたは `req.body` |
| レスポンス型            | `RouteHandler<R>` がステータス + ボディを強制 | ビルトインの強制なし                   |
| ミドルウェアチェーン    | `AppEnv` 経由で型安全                         | `Request` のアンビエント拡張           |

Express はレスポンス型のコンパイル時保証が弱い。緩和策: `express-openapi-validator` の `validateResponses: true` がレスポンススキーマ違反を実行時に検出する。

### パフォーマンス

Hono はベンチマークで Express より大幅に高速（低オーバーヘッド、Web Standards `Request`/`Response`）。本プロジェクトではボトルネックがデータベース I/O であるため、フレームワークオーバーヘッドの影響は実用上無視できる。

### ADR-0011 への影響

ADR-0011（RouteHandler 型付き静的登録）は `@hono/zod-openapi` と `hono-takibi` に固有である。本移行が実施される場合、ADR-0011 は本 ADR により **superseded** とすべきである。

## 結果

### ポジティブ

- Express は Node.js 最大のミドルウェアエコシステムを持つ
- `supertest` は HTTP テストのデファクトスタンダード
- Express に精通した人材プールが広い
- `express-openapi-validator` が既存の OpenAPI 仕様に対するリクエスト + レスポンスの実行時バリデーションを提供

### ネガティブ

- Hono のルートとレスポンスに対するコンパイル時型安全性が失われる
- `hono-takibi` のコード生成に直接的な Express 版代替がない。ルート登録は手動になる
- 移行工数: すべてのミドルウェア、ハンドラー、テストの書き換えが必要

### 緩和策

- `express-openapi-validator` による実行時バリデーションがコンパイル時チェックの欠落を補完
- カスタム Zod ミドルウェアがバリデーション済みデータへの型付きアクセスを維持
- ルートグループごとの段階的移行が可能（ADR-0011 と同じ Wave 戦略）

## 依存関係の変更

| 削除                  | 追加                             |
| --------------------- | -------------------------------- |
| `hono`                | `express` ^5.2                   |
| `@hono/node-server`   | `@types/express` ^5.0            |
| `@hono/zod-openapi`   | `express-openapi-validator` ^5.6 |
| `@hono/zod-validator` | `supertest` ^7.2 (dev)           |
| `hono-takibi` (dev)   | `@types/supertest` ^7.0 (dev)    |

`zod`、`@monorepo/shared`、およびすべてのインフラストラクチャ依存関係は変更なし。

## Express スケルトン — 使い方ガイド

スケルトンは `projects/apps/api/src/presentation/express/` に配置されている。

### ファイル構成

```
presentation/express/
├── create-express-app.ts  # Express アプリファクトリ（ミドルウェアスタック構成）
├── server.ts              # サーバーエントリポイント（app.listen）
├── validate-body.ts       # Zod バリデーションミドルウェア
├── test-helpers.ts        # supertest 用テストアプリファクトリ
├── index.ts               # パブリック API（エクスポート）
└── routes/
    └── health.ts          # GET /health エンドポイント（実装例）
```

### 新しいエンドポイントの追加方法

1. `routes/` 配下に新しいルートファイルを作成し、Router を返す関数をエクスポートする。

```typescript
// routes/users.ts
import { Router, type RequestHandler } from "express";

export function createUsersRouter(): Router {
  const router = Router();

  const listUsersHandler: RequestHandler = (req, res) => {
    const users = req.appContext.userRepository.findAll();
    res.status(200).json({ users });
  };

  router.get("/", listUsersHandler);
  return router;
}
```

2. `create-express-app.ts` の Routes セクションにルーターをマウントする。

```typescript
// create-express-app.ts — Routes セクション
import { createUsersRouter } from "./routes/users.js";

app.use("/health", createHealthRouter());
app.use("/users", createUsersRouter()); // 追加
```

3. ルート固有の Zod バリデーションが必要な場合は `validateBody` ミドルウェアを使う。

```typescript
import { validateBody } from "../validate-body.js";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

router.post("/", validateBody(CreateUserSchema), (req, res) => {
  const { name, email } = req.validatedBody as z.infer<typeof CreateUserSchema>;
  // ...
});
```

### ミドルウェアの追加方法

`create-express-app.ts` のミドルウェアスタックはコメントで番号付けされており、順序が重要である。

```
1. Security headers
2. CORS
3. Request ID
4. Body parsing (JSON)
5. OpenAPI validation (express-openapi-validator)
6. DI context injection
7. Request logger
8. Routes
9. Error handler (must be last)
```

新しいミドルウェアを追加する場合は適切な位置に挿入する。

```typescript
// 例: 認証ミドルウェアを DI コンテキスト注入の後（7番）に追加
app.use((req: Request, res: Response, next: NextFunction) => {
  req.appContext = context as unknown as { [key: string]: unknown };
  next();
});

// 認証（新規追加）
app.use(authMiddleware);

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  // ...
});
```

グローバルエラーハンドラーは必ず最後に配置すること（Express の制約）。

### supertest を使ったテストの書き方

`createTestApp()` ヘルパー（`test-helpers.ts`）を使ってテストを書く。このヘルパーは OpenAPI validator を省いた軽量な app を返すため、テスト実行に `openapi.yaml` ファイルが不要となる。

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "../test-helpers.js";

describe("GET /users", () => {
  it("should return 200 with user list", async () => {
    const app = createTestApp();
    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ users: expect.any(Array) });
  });

  it("POST /users should return 201 on valid body", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/users")
      .send({ name: "Alice", email: "alice@example.com" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
  });
});
```

実装例は `health.supertest.test.ts` を参照。

## 段階的移行手順

既存の Hono ハンドラーを Express へ移行する推奨手順。

### 概要

Hono から Express への移行は **ルートグループ（Resource）単位の Wave 方式**で進める。各 Wave は独立した PR として CI を通過させることで安全に移行できる。

### Wave 戦略

| Wave   | 対象リソース             | 備考                                                                |
| ------ | ------------------------ | ------------------------------------------------------------------- |
| Wave 0 | スケルトン構築（完了）   | Issue #21: `create-express-app.ts`、`server.ts`、`routes/health.ts` |
| Wave 1 | Health + Master Data     | 低リスクな読み取り専用エンドポイントから開始                        |
| Wave 2 | Auth + Profile + Users   | 認証系は慎重に移行                                                  |
| Wave 3 | ドメイン固有リソース     | DI コンテキスト依存度が高いハンドラー                               |
| Wave 4 | Admin Users + Audit Logs | 権限管理が複雑なエンドポイント                                      |

### 1 エンドポイントの移行手順

1. **Hono ハンドラーの特定**: 移行対象の `RouteHandler` と `createRoute()` を特定する。

2. **Express Router の作成**: `routes/<resource>.ts` に新しいルートファイルを作成する（「新しいエンドポイントの追加方法」セクション参照）。

3. **ハンドラーロジックの移植**:
   - `c.req.valid('json')` → `req.validatedBody`（`validateBody` ミドルウェア経由）
   - `c.get('context')` → `req.appContext`
   - `c.json({ ... }, 200)` → `res.status(200).json({ ... })`
   - `c.req.param('id')` → `req.params['id']`
   - `c.req.query('page')` → `req.query['page']`

4. **テストの移植**: `app.request()` を `supertest` の `request(app).get(...)` に置き換える。

5. **ルートのマウント**: `create-express-app.ts` に新しいルーターを追加し、Hono の同等ルートをコメントアウト（後で削除）。

6. **CI 確認**: `./tools/contract test` と `./tools/contract typecheck` でグリーンを確認してからマージ。

### 対照表: Hono → Express

| Hono パターン                | Express 相当                                         |
| ---------------------------- | ---------------------------------------------------- |
| `c.req.valid('json')`        | `req.validatedBody`（`validateBody` ミドルウェア後） |
| `c.req.valid('query')`       | `req.query` + 手動 Zod パース                        |
| `c.req.param('id')`          | `req.params['id']`                                   |
| `c.get('context')`           | `req.appContext`                                     |
| `c.json(body, status)`       | `res.status(status).json(body)`                      |
| `c.text(text, status)`       | `res.status(status).send(text)`                      |
| `app.request('/path')`       | `request(app).get('/path')` (supertest)              |
| `createMiddleware<AppEnv>()` | `RequestHandler` 型の関数                            |

## 参照

- Issue #4: [Spike] Express 移行の技術調査・代替ライブラリ選定
- Issue #21: [Feature] Express 5.x サーバースケルトン構築（PR #81）
- Issue #22: [Feature] supertest テストインフラ構築（PR #83）
- Issue #23: [Doc] ADR-0013 ステータス更新と移行ガイド
- ADR-0011: `as never` 排除（本移行実施時に superseded）
- [express-openapi-validator](https://www.npmjs.com/package/express-openapi-validator)
- [supertest](https://www.npmjs.com/package/supertest)
- [Express 5.1 release](https://expressjs.com/2025/03/31/v5-1-latest-release.html)
