# Endpoint Patterns Reference

RESTful endpoint patterns and anti-patterns for this repository.

## Pattern Library

### P-01: Collection CRUD

Standard CRUD on a top-level resource collection.

```yaml
paths:
  /articles:
    get:
      operationId: searchArticles
      summary: 記事一覧・検索
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticleSearchResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
    post:
      operationId: createArticle
      summary: 記事作成
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateArticleRequest'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Article'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

### P-02: Single Resource

Get, update, delete a single resource by ID.

```yaml
paths:
  /articles/{articleId}:
    get:
      operationId: getArticle
      summary: 記事取得
      parameters:
        - name: articleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticleDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
    put:
      operationId: updateArticle
      summary: 記事更新
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateArticleRequest'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Article'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      operationId: deleteArticle
      summary: 記事削除
      responses:
        '204':
          description: No Content
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
```

### P-03: Sub-Resource Collection

Nested resources under a parent resource.

```yaml
paths:
  /articles/{articleId}/comments:
    get:
      operationId: listComments
      summary: コメント一覧
      parameters:
        - name: articleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CommentListResponse'
    post:
      operationId: addComment
      summary: コメント追加
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddCommentRequest'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Comment'

  /articles/{articleId}/comments/{commentId}:
    delete:
      operationId: removeComment
      summary: コメント削除
      parameters:
        - name: articleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: commentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: No Content
```

### P-04: State Transition via PATCH

Change the state of a resource using a targeted sub-resource.

```yaml
paths:
  /articles/{articleId}/status:
    patch:
      operationId: changeArticleStatus
      summary: 記事ステータス変更
      parameters:
        - name: articleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: [draft, published, archived]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Article'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'
```

### P-05: Action Trigger (Exception)

For actions that have no clear noun equivalent (export, send, etc.),
use `POST /{id}/actionVerb` as an exception.

```yaml
paths:
  /articles/{articleId}/export:
    post:
      operationId: exportArticle
      summary: 記事エクスポート
      parameters:
        - name: articleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '404':
          $ref: '#/components/responses/NotFound'
```

### P-06: Filter-Heavy Search

For search with many filter parameters, use `GET /resources` with
query parameters. Never create a `/search` sub-path.

```yaml
paths:
  /articles:
    get:
      operationId: searchArticles
      summary: 記事検索（フィルタ付き）
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, published, archived]
        - name: tagIds
          in: query
          schema:
            type: array
            items:
              type: string
              format: uuid
          style: form
          explode: true
        - name: sortBy
          in: query
          schema:
            type: string
            enum: [title, createdAt, updatedAt]
        - name: sortOrder
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: asc
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
```

### P-07: Admin Namespace

Use `/admin/` prefix for admin-only endpoints.

```yaml
paths:
  /admin/users:
    get:
      operationId: listAdminUsers
      security:
        - bearerAuth: []
      tags:
        - Admin
  /admin/audit-logs:
    get:
      operationId: listAdminAuditLogs
      tags:
        - Admin
```

---

## Anti-Pattern Reference

### AP-001: `/search` Sub-Path

```
# WRONG — causes route conflict with /{articleId}
GET /articles/search?keyword=foo

# CORRECT — filter at collection level
GET /articles?keyword=foo
```

**Root cause**: Framework route matching (Express/Hono) cannot distinguish between
`/articles/search` (static) and `/articles/{articleId}` (parameter) at
the same path level. The static segment wins if defined first, or validation of
`articleId` fails if the parameter route is matched with `"search"` as value.

### AP-002: Verb in Path Segment

```
# WRONG
POST /articles/create
GET  /articles/list
GET  /articles/getById/{id}

# CORRECT
POST /articles
GET  /articles
GET  /articles/{articleId}
```

### AP-003: Singular Resource Name

```
# WRONG
GET /article
GET /tag/{id}

# CORRECT
GET /articles
GET /tags/{tagId}
```

### AP-004: snake_case or kebab-case in Path

```
# WRONG
GET /article_list
GET /article-detail/{id}

# CORRECT
GET /articles
GET /articles/{articleId}
```

### AP-005: Ambiguous `{id}` Parameter

```
# WRONG
GET /articles/{id}       # Ambiguous — which resource?
GET /articles/{articleId}/comments/{id}  # Outer OK, inner ambiguous

# CORRECT
GET /articles/{articleId}
GET /articles/{articleId}/comments/{commentId}
```

### AP-006: State Transition as Separate Action Endpoint

```
# WRONG (RPC-style)
POST /articles/{id}/publish
POST /articles/{id}/archive
POST /articles/{id}/activate

# CORRECT (resource-oriented state transition)
PATCH /articles/{articleId}/status
# body: { "status": "published" | "archived" | "active" }
```

---

## Quick Reference Table

| Scenario | Method | Path | operationId |
|----------|--------|------|-------------|
| List resources | GET | `/resources` | `listResources` |
| Search resources | GET | `/resources?q=...` | `searchResources` |
| Get single | GET | `/resources/{resourceId}` | `getResource` |
| Create | POST | `/resources` | `createResource` |
| Full update | PUT | `/resources/{resourceId}` | `updateResource` |
| Partial update | PATCH | `/resources/{resourceId}` | `patchResource` |
| Delete | DELETE | `/resources/{resourceId}` | `deleteResource` |
| State change | PATCH | `/resources/{resourceId}/status` | `changeResourceStatus` |
| List sub-resources | GET | `/resources/{resourceId}/subresources` | `listSubresources` |
| Add sub-resource | POST | `/resources/{resourceId}/subresources` | `addSubresource` |
| Remove sub-resource | DELETE | `/resources/{resourceId}/subresources/{subId}` | `removeSubresource` |
| Trigger action | POST | `/resources/{resourceId}/actionVerb` | `actionVerbResource` |
| Export | POST | `/resources/{resourceId}/export` | `exportResource` |
