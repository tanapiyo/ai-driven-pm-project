# ADR-0011: `as never` 排除 — RouteHandler 型付き静的登録への移行

## Status

Superseded by ADR-0013 (Hono → Express migration completed in Issue #157. `@hono/zod-openapi` and `hono-takibi` have been removed; this ADR is no longer applicable.)

## Context

現在の API サーバーでは、route 登録時に型チェーンが断裂している:

```typescript
// register-generated-routes.ts:348
app.openapi(normalizedRoute as any, handler);
```

**根本原因: 集中ディスパッチアーキテクチャ**

1. `HandlerRegistry = Record<string, Handler>` で 86 ハンドラを格納 → 個別 route の型情報が消失
2. ランタイム `operationId` キーで動的に handler を引くため静的型チェックが効かない
3. `withArrayQueryCoercion` の spread で `createRoute()` の narrow type が消失

**結果**: `c.req.valid('query' as never)` のようなキャストが必要になる。

### Spike 調査結果 (Issue #826)

#### 調査 1: hono-takibi 0.9.961 の `--template` 機能

`--template` は CLI フラグではなく、`hono-takibi.config.ts` の設定値として機能する。

**config モード条件**:
```typescript
// config["zod-openapi"]?.routes && !config["zod-openapi"]?.output && config["zod-openapi"]?.template
// → routes.output のみ指定 + output 未指定 + template: true
```

**生成物フォーマット** (ソースコード解析で確認):

- `<routeOutput>/index.ts`: OpenAPIHono app setup + `.openapi(route, handler)` チェーン
- `<routeOutput>/handlers/<resource>.ts`: 各 resource ファイル (stub)

```typescript
// 生成されるハンドラースタブ (makeStubHandlerCode より)
export const getHealthRouteHandler: RouteHandler<typeof getHealthRoute> = async (c) => {}

// 生成されるファイル冒頭 (makeStubFileContent より)
import type { RouteHandler } from '@hono/zod-openapi'
import type { getHealthRoute } from '../routes';
```

- handlers/ のバレルファイル (`index.ts`) も自動生成
- 既存ファイルは **マージ** (既存ハンドラーを保持しつつ新規を追加)

#### 調査 2: `RouteHandler<typeof route, AppEnv>` の型互換性

`@hono/zod-openapi` の型定義 (v1.2.2):

```typescript
type RouteHandler<
  R extends RouteConfig,
  E extends Env = RouteConfigToEnv<R>,
  I extends Input = InputTypeParam<R> & InputTypeQuery<R> & ...,
  P extends string = ConvertPathType<R["path"]>
> = Handler<E, P, I, ...>
```

- 第 2 型引数 `E extends Env` に `AppEnv` を渡すことが**型的に正当**
- `AppEnv.Variables` が `c.get('context')` で `RouteContext` を取得可能
- 実装例:

```typescript
import type { RouteHandler } from '@hono/zod-openapi';
import type { AppEnv } from '../app.js';
import { getHealthRoute } from '../../generated/oas/routes.js';

export const getHealthRouteHandler: RouteHandler<typeof getHealthRoute, AppEnv> = async (c) => {
  const context = c.get('context'); // RouteContext 型で推論される
  return c.json({ status: 'ok', timestamp: new Date().toISOString() }, 200);
};
```

**検証**: TypeScript は `c.req.valid('json')`, `c.req.valid('query')` の引数を自動補完し、
返値型も `200: { schema: HealthResponseSchema }` から推論されるため `as never` は不要。

#### 調査 3: `withArrayQueryCoercion` の型安全な適用方法

**問題**: 現在の spread アプローチが narrow type を破壊する

```typescript
// 問題: route の型が (typeof getUsersRoute) から汎用型に退化する
const normalizedRoute = query
  ? { ...route, request: { ...req, query: withArrayQueryCoercion(query) } }
  : route;
app.openapi(normalizedRoute as any, handler); // as any が必要になる
```

**根本原因**: `createRoute()` が返す型は `Route` オブジェクトのリテラル型。
spread すると `request.query` フィールドが `ZodObject → ZodType` に広がり、
`app.openapi(route, handler)` の型パラメータ推論が失敗する。

**採用すべき解決策: Hono ミドルウェアによる前処理 (Option C)**

```typescript
// Hono middleware で query string を正規化 (検証前に実行)
app.use('*', async (c, next) => {
  // single-value array query params を配列に正規化
  // z.array() の検証前に string → [string] に変換
  await next();
});
```

具体的には、`register-generated-routes.ts` の spread を廃止し、
Hono ミドルウェアで URL query string を前処理する:

```typescript
// coerce-middleware.ts
export const arrayQueryCoercionMiddleware: MiddlewareHandler = async (c, next) => {
  // URLSearchParams から配列フィールドを正規化
  // app.use('*', arrayQueryCoercionMiddleware) で全ルートに適用
  await next();
};
```

これにより `normalizedRoute as any` が不要になり、`createRoute()` の型が保持される。

ただし「どのフィールドが配列か」をミドルウェアで特定するには、
各 route の schema を参照するか、OpenAPI spec から静的に取得する必要がある。
**推奨**: route ごとに配列フィールドリストを静的コンパイル時に収集し、
ミドルウェアに渡す構造にする (詳細は Wave 1 実装 Issue で設計する)。

## Decision

### 静的登録パターンへの移行 (Strategy A)

`HandlerRegistry = Record<string, Handler>` の集中ディスパッチを廃止し、
resource group 単位の静的登録パターンに移行する。

#### 移行後のパターン

```typescript
// handlers/health/index.ts
import type { RouteHandler } from '@hono/zod-openapi';
import type { AppEnv } from '../../app.js';
import { getHealthRoute } from '../../../generated/oas/routes.js';

export const getHealthRouteHandler: RouteHandler<typeof getHealthRoute, AppEnv> = async (c) => {
  const context = c.get('context'); // 型安全
  return c.json({ status: 'ok', timestamp: new Date().toISOString() }, 200);
};

// register-health-routes.ts
import { getHealthRouteHandler } from '../handlers/health/index.js';
import { getHealthRoute } from '../generated/oas/routes.js';

export function registerHealthRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(getHealthRoute, getHealthRouteHandler); // as any 不要
}
```

#### 移行単位 (resource group 別 Wave)

| Wave | Routes | Resource Groups |
|------|--------|----------------|
| Wave 1 | 8 routes | Health (4) + Master Data (4) |
| Wave 2 | 11 routes | Auth (7) + Profile (2) + Users (2) |
| Wave 3 | 10 routes | Additional resources (domain-specific, to be defined) |
| Wave 4 | 5 routes | Admin Users (4) + AdminAuditLogs (1) |

各 Wave は独立した PR として CI を通過させることで安全に移行できる。

#### `withArrayQueryCoercion` 移行方針

1. ミドルウェアアプローチ (Option C) を採用
2. `arrayQueryCoercionMiddleware` を `register-<resource>-routes.ts` 単位で適用
3. spread-based normalization を `register-generated-routes.ts` から除去

#### hono-takibi `--template` 機能の位置づけ

- 既存コードベース (20 ファイル・117 箇所の `as never`) は手動移行
- `--template` 機能は**新規 resource 追加時**に活用する (stub 自動生成)
- 既存 `generate:openapi` スクリプトは routes.ts 生成のみ (変更なし)

## Consequences

### Positive

- `as never` / `as any` キャストが route-by-route で消去される
- `c.req.valid('json')` が型推論され IDE 補完が効く
- route 追加時に未実装ハンドラーが型エラーとして即時検出される
- レスポンス型も `RouteConfigToTypedResponse<R>` で自動推論される

### Negative / Risks

- 86 route × 移行コスト: 中規模のリファクタリング
- `withArrayQueryCoercion` のミドルウェア化で動作確認が必要
- Wave 単位での移行期間中、旧 `as any` 登録と新型付き登録が混在する

### Mitigation

- 各 Wave は独立 PR (CI 必須)、`register-generated-routes.ts` から Wave 済み routes を除外
- Wave 1 (Health + MasterData) で PoC + ミドルウェア設計を先行検証
- 移行完了後に `HandlerRegistry` 型と `register-generated-routes.ts` を完全削除

## Follow-up Issues

- Epic: `[Epic] RouteHandler 型付き静的登録移行` (refactoring)
- Wave 1 実装: `[refactoring] RouteHandler 型付き静的登録 Wave 1 — Health + MasterData`

## References

- Issue #826: [Spike] as never 排除 — hono-takibi --template + 型付きハンドラ移行調査
- `projects/apps/api/src/composition/register-generated-routes.ts`
- `projects/apps/api/src/presentation/handlers/types.ts`
- `projects/apps/api/src/composition/coerce-array-query-params.ts`
- hono-takibi 0.9.961 source: `dist/openapi-CIz3Sac_.js` (makeTemplate, makeStubHandlerCode)
- `@hono/zod-openapi` v1.2.2 type: `RouteHandler<R, E>`
