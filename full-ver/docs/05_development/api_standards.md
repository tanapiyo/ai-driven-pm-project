# OpenAPI Specification Standards

## Overview

このドキュメントでは、OpenAPI (OAS) 仕様を記述する際の命名規則、構造、ベストプラクティスを定義します。

---

## Naming Conventions

### operationId

**形式**: `camelCase` - 動詞 + 名詞

| Pattern | Example | Description |
|---------|---------|-------------|
| `get{Resource}` | `getProduct` | 単一リソース取得 |
| `list{Resources}` | `listProposals` | リスト取得 |
| `search{Resources}` | `searchProducts` | 検索 (クエリパラメータ付き) |
| `create{Resource}` | `createProposal` | 新規作成 |
| `update{Resource}` | `updateProduct` | 更新 |
| `delete{Resource}` | `deleteCandidate` | 削除 |
| `{action}{Resource}` | `changeProductStatus` | 特定アクション |

```yaml
# Good
operationId: searchProducts
operationId: createProposal
operationId: changeProductStatus

# Bad
operationId: SearchProducts  # PascalCase
operationId: product_search  # snake_case
operationId: getProducts     # listを使う
```

### Path Parameters

**形式**: `camelCase`

```yaml
# Good
/products/{productId}
/proposals/{proposalId}/candidates/{candidateId}

# Bad
/products/{product_id}  # snake_case
/products/{id}          # 曖昧
```

### Query Parameters

**形式**: `camelCase`

```yaml
# Good
parameters:
  - name: channelId
    in: query
  - name: minFollowers
    in: query
  - name: sortBy
    in: query

# Bad
parameters:
  - name: channel_id   # snake_case
  - name: min-followers # kebab-case
```

### Schema Names

**形式**: `PascalCase`

| Pattern | Example |
|---------|---------|
| `{Resource}` | `Product`, `Proposal` |
| `{Resource}Summary` | `ProductSummary` |
| `{Resource}Detail` | `ProductDetail` |
| `{Action}{Resource}Request` | `CreateProposalRequest` |
| `{Action}{Resource}Response` | `SearchProductsResponse` |
| `{Resource}ListResponse` | `ProposalListResponse` |

```yaml
components:
  schemas:
    # Entity
    Product:
      type: object
      properties: ...

    # Summary (一覧用)
    ProductSummary:
      type: object
      properties: ...

    # Request
    CreateProductRequest:
      type: object
      properties: ...

    # Response
    ProductSearchResponse:
      type: object
      properties: ...
```

### Tags

**形式**: `PascalCase` - 複数形

```yaml
tags:
  - name: Products
  - name: Proposals
  - name: MasterData
  - name: Admin
```

---

## Path Structure

### RESTful Patterns

```yaml
paths:
  # Collection
  /products:
    get:
      operationId: searchProducts
    post:
      operationId: createProduct

  # Single Resource
  /products/{productId}:
    get:
      operationId: getProduct
    put:
      operationId: updateProduct
    delete:
      operationId: deleteProduct

  # Sub-resource
  /proposals/{proposalId}/candidates:
    get:
      operationId: listCandidates
    post:
      operationId: addCandidate

  /proposals/{proposalId}/candidates/{candidateId}:
    delete:
      operationId: removeCandidate

  # Action (RPC-style)
  /proposals/{proposalId}/export:
    post:
      operationId: exportProposal

  /products/{productId}/status:
    patch:
      operationId: changeProductStatus
```

### Namespace Prefixes

```yaml
paths:
  # Public API
  /health: ...
  /auth/login: ...

  # Protected API (認証必須)
  /products: ...
  /proposals: ...

  # Admin API
  /admin/channels: ...
  /admin/segments: ...
```

---

## Response Structure

### Success Response

```yaml
# 単一リソース
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Product'

# リスト + ページネーション
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          required:
            - items
            - pagination
          properties:
            items:
              type: array
              items:
                $ref: '#/components/schemas/ProductSummary'
            pagination:
              $ref: '#/components/schemas/Pagination'
```

### Error Response

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: エラーコード
          example: VALIDATION_ERROR
        message:
          type: string
          description: エラーメッセージ
          example: Invalid request parameters
        details:
          type: object
          description: 詳細情報 (バリデーションエラー等)

  responses:
    BadRequest:
      description: Bad Request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            code: VALIDATION_ERROR
            message: Title is required

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            code: UNAUTHORIZED
            message: Invalid or expired token

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            code: NOT_FOUND
            message: Product not found

    InternalError:
      description: Internal Server Error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            code: INTERNAL_ERROR
            message: Internal server error
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | リクエストバリデーション失敗 |
| `UNAUTHORIZED` | 401 | 認証エラー |
| `FORBIDDEN` | 403 | 権限エラー |
| `NOT_FOUND` | 404 | リソース未存在 |
| `CONFLICT` | 409 | 競合 (重複等) |
| `INTERNAL_ERROR` | 500 | サーバーエラー |

---

## Common Schemas

### Pagination

```yaml
components:
  schemas:
    Pagination:
      type: object
      required:
        - page
        - limit
        - total
        - hasNext
      properties:
        page:
          type: integer
          minimum: 1
        limit:
          type: integer
          minimum: 1
          maximum: 100
        total:
          type: integer
          minimum: 0
        hasNext:
          type: boolean

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1

    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
```

### Timestamps

```yaml
components:
  schemas:
    Timestamps:
      type: object
      properties:
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
```

### ID Types

```yaml
components:
  schemas:
    UUID:
      type: string
      format: uuid
      example: 550e8400-e29b-41d4-a716-446655440000
```

---

## Security

### Bearer Token

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []

paths:
  /health:
    get:
      security: []  # 認証不要
      operationId: getHealth

  /products:
    get:
      security:
        - bearerAuth: []  # 認証必須 (デフォルト)
      operationId: searchProducts
```

---

## Full Example

```yaml
openapi: 3.0.3
info:
  title: Base App API
  version: 0.0.1

servers:
  - url: http://localhost:3001
    description: Development

tags:
  - name: Products
    description: プロダクト管理

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    ProductSummary:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        imageUrl:
          type: string
          nullable: true
        totalFollowers:
          type: integer

    ProductSearchResponse:
      type: object
      required:
        - products
        - pagination
      properties:
        products:
          type: array
          items:
            $ref: '#/components/schemas/ProductSummary'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      required:
        - page
        - limit
        - total
        - hasNext
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        hasNext:
          type: boolean

    ErrorResponse:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string

  responses:
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        default: 1

    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        default: 20

security:
  - bearerAuth: []

paths:
  /products:
    get:
      operationId: searchProducts
      summary: プロダクト検索
      tags:
        - Products
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: 検索結果
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductSearchResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

---

## Checklist

### 新規エンドポイント追加時

- [ ] `operationId` は camelCase で動詞+名詞
- [ ] Path parameters は camelCase
- [ ] Query parameters は camelCase
- [ ] Schema 名は PascalCase
- [ ] エラーレスポンスを定義 (400, 401, 404, 500)
- [ ] 認証要否を `security` で明示
- [ ] `tags` でグルーピング
- [ ] `summary` と `description` を記述

### レビュー時

- [ ] 命名規則に準拠しているか
- [ ] 既存の Schema を再利用しているか
- [ ] Pagination パターンに従っているか
- [ ] Error response が統一されているか
