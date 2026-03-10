---
name: api-designer
description: >
  RESTful resource modeling and OAS-driven API design workflow. Use when designing
  new API endpoints, reviewing path structures, creating OpenAPI specs, or preventing
  non-RESTful design patterns. Triggers on "API design", "resource modeling",
  "RESTful", "OpenAPI spec", "endpoint design", "OAS first".
globs:
  - "docs/02_architecture/api/**"
  - "projects/packages/api-contract/openapi.yaml"
  - "**/*.yaml"
alwaysApply: false
---

# API Designer

RESTful resource modeling and OAS-driven API design for this repository.

## Canonical Source

This skill complements:
- `docs/05_development/openapi_workflow.md` — OAS development workflow
- `docs/05_development/api_standards.md` — naming conventions and OAS standards
- `.claude/rules/02-backend.md` — "OpenAPI spec FIRST" rule

## Design Workflow

```
Requirements → Resource Modeling → RESTful Path Design → OAS Spec → Validate → Generate
```

### Step 1: Requirements Analysis

Extract nouns from requirements — these become resources.

```
Requirements: "ユーザーが記事を検索し、フィルタリングできる"
↓
Noun extraction: article (main resource)
↓
Operations: list/search (GET on collection), get by id (GET on single)
```

### Step 2: Resource Modeling

Define resource hierarchy and relationships:

```
Resource: Article
  - Collection: /articles
  - Single:     /articles/{articleId}
  - Sub-resource example: /articles/{articleId}/comments

Resource: Tag
  - Collection: /tags
  - Single:     /tags/{tagId}
  - Sub-resource: /articles/{articleId}/tags
  - Sub-resource single: /articles/{articleId}/tags/{tagId}
```

### Step 3: RESTful Path Design

Map HTTP methods to CRUD operations:

| Operation | Method | Path | operationId |
|-----------|--------|------|-------------|
| List/Search | GET | `/resources` | `listResources` or `searchResources` |
| Create | POST | `/resources` | `createResource` |
| Get single | GET | `/resources/{id}` | `getResource` |
| Replace | PUT | `/resources/{id}` | `updateResource` |
| Partial update | PATCH | `/resources/{id}` | `patchResource` |
| Delete | DELETE | `/resources/{id}` | `deleteResource` |
| State action | PATCH | `/resources/{id}/status` | `changeResourceStatus` |
| Export/trigger | POST | `/resources/{id}/export` | `exportResource` |

### Step 4: OAS Spec Definition

Write the OpenAPI spec BEFORE any implementation. See `docs/05_development/api_standards.md` for full naming conventions.

```yaml
paths:
  /articles:
    get:
      operationId: searchArticles   # camelCase, verb+noun
      summary: 記事検索
      tags:
        - Articles                  # PascalCase, plural
      parameters:
        - name: keyword             # camelCase
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
```

### Step 5: Validate and Generate

```bash
./tools/contract openapi-check          # Validate OAS spec
./tools/contract openapi-generate       # Generate backend + frontend code
./tools/contract typecheck              # Verify generated types
```

---

## RESTful Path Design Rules

### MUST

| Rule | Correct | Reason |
|------|---------|--------|
| Collection operations use `GET /resources` | `GET /articles?keyword=foo` | HTTP semantics: idempotent read |
| Single resource uses `GET /resources/{id}` | `GET /articles/{articleId}` | Identifies resource by ID |
| Use nouns in paths | `/articles`, `/tags` | REST = resource-oriented |
| Path parameters use camelCase | `{articleId}`, `{tagId}` | Consistency with codebase |
| Filter/search via query parameters | `?keyword=foo&status=published` | Idempotent, bookmarkable |
| Sub-resources express relationships | `/articles/{id}/comments` | Hierarchy in path |
| State changes use PATCH on sub-resource | `PATCH /articles/{id}/status` | Targeted update |

### MUST NOT

| Rule | Wrong | Correct |
|------|-------|---------|
| No verb in path | `/articles/search` | `GET /articles?keyword=...` |
| No RPC-style paths | `/getArticle`, `/searchArticles` | `GET /articles/{id}`, `GET /articles` |
| No snake_case in paths | `/article_list` | `/articles` |
| No `/search` sub-path | `/articles/search` | `GET /articles` with query params |
| No mixed ID and action at same level | `/articles/search` conflicts with `/articles/{id}` | Actions as sub-resource of identified resource |
| No verb-noun hybrid | `/create-article` | `POST /articles` |

---

## Anti-Pattern Collection

### AP-001: `/search` Sub-Path

**Problem**: `GET /articles/search` was designed as a separate endpoint for search.

**Why it fails**: Express/Hono route matching treats `/articles/search` as
`/articles/{articleId}` where `articleId = "search"`. This causes:
- 422 Validation Error when `"search"` is not a valid UUID
- Route conflict between static segment and parameter segment
- Non-idiomatic REST design

**Correct approach**:
```yaml
# WRONG
GET /articles/search?keyword=foo   # Conflicts with /articles/{articleId}

# CORRECT
GET /articles?keyword=foo          # Collection endpoint with query parameters
```

**OAS spec**:
```yaml
paths:
  /articles:
    get:
      operationId: searchArticles
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
```

### AP-002: RPC-Style operationId as Path

**Problem**: Using `operationId` patterns as path segments.

```yaml
# WRONG
GET /articles/getById/{id}
POST /articles/createNew

# CORRECT
GET /articles/{articleId}
POST /articles
```

### AP-003: Verb in Path

**Problem**: HTTP method already expresses the action.

```yaml
# WRONG
POST /articles/create
DELETE /articles/delete/{id}
GET /articles/list

# CORRECT
POST /articles
DELETE /articles/{articleId}
GET /articles
```

### AP-004: Non-Standard Action Verbs

**Problem**: Using action-like names for state transitions instead of sub-resource PATCH.

```yaml
# WRONG
POST /articles/{id}/publish
POST /articles/{id}/archive

# CORRECT
PATCH /articles/{articleId}/status
# Request body: { "status": "published" } or { "status": "archived" }
```

**Exception**: Actions with no clear noun equivalent (like `export`) MAY use `POST /{id}/export`.

### AP-005: Singular Resource Names

**Problem**: Using singular nouns for collections.

```yaml
# WRONG
GET /article          # Singular — ambiguous
GET /tag/{id}

# CORRECT
GET /articles         # Plural — collection
GET /tags/{tagId}
```

---

## Resource Extraction Checklist

When given requirements, apply this checklist:

- [ ] List all nouns in requirements (potential resources)
- [ ] Identify primary resources vs. sub-resources
- [ ] Map required operations (CRUD + actions) per resource
- [ ] Confirm no verb appears in path segments
- [ ] Confirm search/filter operations use query parameters on collection endpoint
- [ ] Confirm `{resourceId}` uses camelCase and resource-specific name (not `{id}`)
- [ ] Verify no static path segment conflicts with parameter segment at same level

---

## OAS Spec Checklist

Before submitting OAS spec:

- [ ] `operationId` is camelCase, verb+noun pattern
- [ ] Path parameters are camelCase and resource-specific (`articleId` not `id`)
- [ ] Query parameters are camelCase
- [ ] Schema names are PascalCase
- [ ] Error responses defined (400, 401, 404, 500)
- [ ] `security` field set correctly (omit or `[]` for public)
- [ ] `tags` uses PascalCase plural form
- [ ] `summary` and `description` are written
- [ ] Pagination uses `$ref: '#/components/parameters/PageParam'` pattern
- [ ] `./tools/contract openapi-check` passes

---

## Code Generation Integration

After OAS spec is finalized:

```bash
# 1. Validate spec
./tools/contract openapi-check

# 2. Generate code (both backend and frontend)
./tools/contract openapi-generate

# 3. Format generated code
./tools/contract format

# 4. Stage generated files
git add projects/apps/api/src/generated/oas
git add projects/packages/api-contract/src/generated

# 5. Type check
./tools/contract typecheck
```

Never edit `**/generated/**` files directly — they are regenerated on every
`openapi-generate` run and will overwrite manual changes.

---

## See Also

- `docs/05_development/openapi_workflow.md` — full OAS development flow
- `docs/05_development/api_standards.md` — naming conventions (operationId, Schema, etc.)
- `.claude/skills/api-designer/references/endpoint-patterns.md` — pattern library
- `.claude/rules/02-backend.md` — backend architecture rules
- `docs/02_architecture/adr/0007_search_api_v2.md` — search API design decisions
