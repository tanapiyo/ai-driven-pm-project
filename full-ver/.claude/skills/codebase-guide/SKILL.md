---
name: codebase-guide
description: Interactive guidance for understanding codebase structure, architecture, and conventions. Use for onboarding questions, architecture explanations, and navigation help. Triggers on "what is", "how does", "explain", "overview", "onboarding", "structure".
globs:
  - "AGENTS.md"
  - "CLAUDE.md"
  - "README.md"
  - ".claude/**"
  - "docs/**"
  - "projects/**"
alwaysApply: false
---

# Interactive Codebase Guide

Educational guidance for understanding and navigating the codebase.

## Overview

This skill provides interactive, educational guidance for:

- Understanding repository structure and architecture
- Navigating code by functionality
- Learning architectural patterns (DDD, FSD)
- Answering common onboarding questions

**Differentiation from `repo-explorer` agent**:

| Aspect | repo-explorer (Agent) | codebase-guide (Skill) |
|--------|----------------------|------------------------|
| Purpose | Execute exploration tasks | Provide educational guidance |
| Mode | Task-oriented (find files) | Question-answering (explain) |
| Output | File paths, patterns | Explanations, walkthroughs |
| Trigger | "explore", "find", "where" | "what is", "how does", "explain" |

## Trigger Scenarios

Use this skill when users ask:

- "このリポジトリは何をするの？"
- "プロジェクト構造を教えて"
- "認証の仕組みはどうなっている？"
- "API のエンドポイント一覧を教えて"
- "このディレクトリの役割は？"
- "Clean Architecture のレイヤー構成を説明して"
- "FSD ってなに？どう使われてる？"
- "新しいAPIを追加するにはどうすればいい？"

## Repository Overview

**AI Development Base** - Full-stack TypeScript monorepo template with AI-assisted development tooling.

### What It Does

| Feature | Description |
|---------|-------------|
| Authentication | JWT-based login/logout with role-based access control |
| User Management | Admin panel for managing users and roles |
| Audit Logging | Immutable audit log of all significant system actions |
| Profile | User profile editing (name, password) |
| Admin | User management, audit logs |
| Authorization | JWT + role-based (admin, user) |

### Technology Stack

```
Runtime:      Node.js 22
Language:     TypeScript
Package Mgr:  pnpm (workspace monorepo)
Backend:      Hono + Prisma ORM
Frontend:     Next.js 15 (App Router) + React 19
Database:     PostgreSQL
Auth:         JWT with role-based authorization
```

## Project Structure (Monorepo)

```
projects/
├── apps/
│   ├── api/                 # Backend API
│   │   └── src/
│   │       ├── domain/          # Pure business logic
│   │       ├── usecase/         # Application orchestration
│   │       ├── infrastructure/  # Prisma, external services
│   │       ├── presentation/    # HTTP controllers
│   │       ├── composition/     # DI wiring
│   │       └── generated/       # OpenAPI generated types
│   └── web/                 # Frontend Web App
│       └── src/
│           ├── app/             # Next.js App Router
│           ├── features/        # FSD feature slices
│           ├── entities/        # Business entities
│           └── shared/          # Reusable utilities, UI
└── packages/
    ├── shared/              # Domain utilities (Entity, ValueObject, Result)
    ├── api-contract/        # OpenAPI spec & generated types
    ├── eslint-config/       # Shared ESLint configuration
    └── guardrails/          # Architecture validation
```

## Backend Architecture: Clean Architecture + DDD

### Layer Dependency Rule

```
Presentation → UseCase → Domain ← Infrastructure
                 ↑
            Composition (wires all)
```

**Dependencies point INWARD toward domain.**

### Layer Responsibilities

| Layer | Location | Responsibility | MUST NOT |
|-------|----------|----------------|----------|
| **Domain** | `apps/api/src/domain/` | Pure business logic, entities, value objects | Import frameworks, I/O, DB |
| **UseCase** | `apps/api/src/usecase/` | Orchestrate domain, application services | Contain business logic |
| **Infrastructure** | `apps/api/src/infrastructure/` | Implement domain interfaces (Prisma, AI, storage) | Be imported by domain/usecase |
| **Presentation** | `apps/api/src/presentation/` | HTTP controllers, request/response mapping | Contain business logic |
| **Composition** | `apps/api/src/composition/` | DI container, middleware wiring | N/A (can wire all) |

### Key Entry Points

| Purpose | File |
|---------|------|
| HTTP Server | `projects/apps/api/src/presentation/server.ts` |
| App Builder | `projects/apps/api/src/composition/build-app.ts` |
| Controllers | `projects/apps/api/src/presentation/controllers/*.ts` |
| UseCases | `projects/apps/api/src/usecase/<domain>/*.ts` |
| Domain Models | `projects/apps/api/src/domain/<entity>/` |
| Repositories | `projects/apps/api/src/infrastructure/repositories/` |

### Example: Request Flow

```
HTTP Request
    ↓
[Presentation] Controller validates input (Zod schemas)
    ↓
[UseCase] CreateUserUseCase.execute(input)
    ↓
[Domain] User.create(), business rules applied
    ↓
[Infrastructure] PrismaUserRepository.save()
    ↓
[Database] PostgreSQL
```

## Frontend Architecture: Feature-Sliced Design (FSD)

### Layer Structure

```
src/
├── app/        # Next.js App Router, global providers
├── widgets/    # Composite UI blocks (optional)
├── features/   # User interactions, business features
├── entities/   # Business entities (User, etc.)
└── shared/     # Reusable utilities, UI kit, types
```

### Dependency Rule

```
app → widgets → features → entities → shared
```

**Higher layers import from lower layers, never vice versa.**

### Feature Slice Structure

Each feature follows this pattern:

```
features/auth/
├── ui/           # React components (LoginForm, RegisterForm)
├── model/        # State, hooks, logic (useAuth, useAuthStore)
├── api/          # API calls (useLogin, useLogout)
├── lib/          # Feature-specific utilities
└── index.ts      # Public API (export only what's needed)
```

### Available Features

| Feature | Purpose |
|---------|---------|
| `auth/` | Login, logout, session management |
| `profile/` | User profile editing (name, password) |
| `theme-toggle/` | Dark/light mode toggle |
| `admin-*` | Admin-specific features (user management, audit logs) |

### Key Files

| Purpose | File |
|---------|------|
| Root Layout | `projects/apps/web/src/app/layout.tsx` |
| Providers | `projects/apps/web/src/app/providers.tsx` |
| Auth Feature | `projects/apps/web/src/features/auth/` |
| Shared UI | `projects/apps/web/src/shared/ui/` |
| API Client | `projects/apps/web/src/shared/api/` |

## Common Questions & Answers

### Q: 新しい API エンドポイントを追加するには？

**A:** API-First アプローチで以下の順序で追加:

1. **OpenAPI Spec を更新**
   - `projects/packages/api-contract/openapi.yaml`
   - エンドポイント、リクエスト/レスポンススキーマを定義

2. **型を生成**
   ```bash
   ./tools/contract openapi-generate
   ```

3. **UseCase を作成**
   - `apps/api/src/usecase/<domain>/<action>.ts`
   - Input/Output/Error 型を定義
   - Domain サービスを呼び出し

4. **Controller を追加**
   - `apps/api/src/presentation/controllers/<domain>-controller.ts`
   - Zod でリクエストバリデーション
   - UseCase を呼び出し
   - レスポンスをマッピング

5. **Router に登録**
   - `apps/api/src/composition/build-app.ts`

### Q: 新しいフロントエンド機能を追加するには？

**A:** FSD パターンに従って:

1. **Feature ディレクトリ作成**
   ```
   apps/web/src/features/<feature-name>/
   ├── ui/
   ├── model/
   ├── api/
   └── index.ts
   ```

2. **API 呼び出しを実装** (`api/`)
   - React Query hooks を使用
   - `@monorepo/api-contract` から型をインポート

3. **状態管理** (`model/`)
   - Zustand store または React hooks

4. **UI コンポーネント** (`ui/`)
   - `shared/ui/` のコンポーネントを使用
   - Dark mode 対応 (`neutral-*` カラー)

5. **Public API エクスポート** (`index.ts`)
   - 外部に公開するものだけ export

### Q: テストを書くには？

**A:**

```bash
# テスト実行
./tools/contract test

# 特定のテストのみ（引数を contract に渡す）
./tools/contract test -- --testPathPattern=auth
```

- ユニットテスト: `*.test.ts` パターン
- ドメインロジックとユースケースをテスト
- In-memory repository でインフラを分離

### Q: データベーススキーマを変更するには？

**A:**

1. **Schema を編集**
   - `projects/apps/api/prisma/schema.prisma`

2. **Migration 作成**
   ```bash
   ./tools/contract migrate --name <migration-name>
   ```

3. **型を再生成**
   ```bash
   ./tools/contract openapi-generate
   ```

### Q: 認証の仕組みは？

**A:** JWT ベースの認証:

- **アクセストークン**: 短期 (15分)、Authorization header
- **リフレッシュトークン**: 長期 (7日)、HttpOnly Cookie
- **ロール**: `admin`, `planner`, `executive`
- **実装**: `apps/api/src/infrastructure/services/jwt-service.ts`

詳細: `docs/02_architecture/ARCHITECTURE.md#authentication--authorization`

## Navigation Patterns

**「この機能はどこにある？」を素早く見つける**

| Looking for... | Location |
|----------------|----------|
| API エンドポイント | `apps/api/src/presentation/controllers/` |
| ビジネスロジック | `apps/api/src/usecase/<domain>/` |
| ドメインモデル | `apps/api/src/domain/<entity>/` |
| DB スキーマ | `apps/api/prisma/schema.prisma` |
| フロントエンド機能 | `apps/web/src/features/<name>/` |
| 共通 UI | `apps/web/src/shared/ui/` |
| API クライアント | `apps/web/src/shared/api/` |
| OpenAPI Spec | `packages/api-contract/openapi.yaml` |
| Golden Commands | `tools/_contract/stack/` |
| Architecture Docs | `docs/02_architecture/` |
| ADRs | `docs/02_architecture/adr/` |

## Golden Commands (必須)

すべての操作は `./tools/contract` 経由で実行:

```bash
./tools/contract format     # Prettier
./tools/contract lint       # ESLint + Architecture checks
./tools/contract typecheck  # TypeScript
./tools/contract test       # Unit tests
./tools/contract build      # Production build
./tools/contract guardrail  # Architecture guardrails
./tools/contract dev        # Development server
```

**直接 `pnpm lint` や `npm test` を使わない**

## Architecture Decision Records (ADRs)

重要な技術決定の記録:

| ADR | Decision |
|-----|----------|
| ADR-0001 | Golden Commands (`./tools/contract`) |
| ADR-0003 | Clean Architecture Guardrails |
| ADR-0004 | JWT 認証 |
| ADR-0005 | Claude Code Sub-Agents |

詳細: `docs/02_architecture/adr/`

## Key Documents

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | Repository contract (canonical) |
| `README.md` | Project overview |
| `docs/00_process/process.md` | Development workflow |
| `docs/02_architecture/ARCHITECTURE.md` | System architecture |
| `docs/01_product/prd.md` | Product requirements |
| `docs/01_product/requirements/` | FR/NFR specifications |

## See Also

**Detailed Implementation Guidance:**

→ `.claude/skills/ddd-clean-architecture/SKILL.md` - Backend architecture patterns
→ `.claude/skills/fsd-frontend/SKILL.md` - Frontend architecture patterns
→ `.claude/skills/repo-conventions/SKILL.md` - Workflow & conventions
→ `.claude/skills/quality-gates/SKILL.md` - Quality checks
→ `.claude/skills/security-baseline/SKILL.md` - Security practices

**External Resources:**

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
