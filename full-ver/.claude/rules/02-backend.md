# Backend Rules (Always Applied)

## Architecture: Clean Architecture + DDD

```text
presentation → usecase → domain ← infrastructure
```

**Dependencies point INWARD toward domain.**

## Layer Constraints (MUST)

| Layer          | MUST                          | MUST NOT                        |
|----------------|-------------------------------|---------------------------------|
| Domain         | Pure business logic           | Import frameworks, I/O, DB      |
| UseCase        | Orchestrate domain            | Contain business logic          |
| Infrastructure | Implement domain interfaces   | Be imported by domain/usecase   |
| Presentation   | Map HTTP ↔ UseCase            | Contain business logic          |

## API & DB (MUST)

- Define OpenAPI spec FIRST (`docs/02_architecture/api/*.yaml`)
- Generate types from spec
- Never hand-write HTTP clients
- Parameterized queries only (no raw SQL interpolation)
- Migrations via `./tools/contract migrate`
- After changing OpenAPI spec: run `./tools/contract openapi-generate`
- MUST NOT edit files in `**/generated/**` directly — enforced by deny rules + PreToolUse hook

## Generated Code Protection (Enforced by deny rules + hooks)

Editing `**/generated/**` is **blocked by `settings.json` deny rules and `pre-edit.sh` hook**.

| Generated Directory | Generator | Correct Workflow |
|--------------------|-----------|-----------------|
| `projects/packages/api-contract/src/generated/` | Orval | Edit OpenAPI spec → `./tools/contract openapi-generate` |
| `**/prisma/generated/` | Prisma | Edit Prisma schema → `./tools/contract migrate` |

## Detailed Reference

→ `.claude/skills/ddd-clean-architecture/SKILL.md`
