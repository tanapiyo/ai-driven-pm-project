---
name: ddd-clean-architecture
description: Domain-Driven Design and Clean Architecture principles. Apply when designing domain logic, implementing use cases, or reviewing architecture. Triggers on "domain", "usecase", "entity", "repository", "clean architecture", "DDD", "layer".
globs:
  - "projects/apps/api/**"
  - "projects/packages/shared/**"
  - "**/domain/**"
  - "**/usecase/**"
  - "**/infrastructure/**"
alwaysApply: false
---

# DDD + Clean Architecture

Layer structure and dependency rules for this repository.

## Layer Dependency Rule

```
presentation → usecase → domain ← infrastructure
                 ↑
            composition (can wire all)
```

**Direction**: Dependencies point INWARD toward domain.

## Layers

### Domain (Innermost)
- **Contains**: Entities, Value Objects, Domain Events, Repository Interfaces
- **Depends on**: Nothing external
- **Rule**: Pure business logic, no frameworks, no I/O

```typescript
// Good: Pure domain
export class User {
  constructor(private readonly id: UserId, private name: UserName) {}
  rename(newName: UserName): void { this.name = newName; }
}

// Bad: Domain with infrastructure
export class User {
  async save() { await prisma.user.update(...); } // NO!
}
```

### UseCase (Application Layer)
- **Contains**: Application services, DTOs, Command/Query handlers
- **Depends on**: Domain interfaces
- **Rule**: Orchestrates domain, no business logic

```typescript
// Good: UseCase orchestrates
export class CreateUserUseCase {
  constructor(private userRepo: UserRepository) {}
  async execute(cmd: CreateUserCommand): Promise<Result<UserId>> {
    const user = User.create(cmd.name);
    return this.userRepo.save(user);
  }
}
```

### Infrastructure (Outer)
- **Contains**: Repository implementations, External APIs, DB clients
- **Depends on**: Domain interfaces (implements them)
- **Rule**: Adapters for external world

```typescript
// Good: Implements domain interface
export class PrismaUserRepository implements UserRepository {
  async save(user: User): Promise<Result<UserId>> {
    // Prisma implementation
  }
}
```

### Presentation (Outermost)
- **Contains**: HTTP routes, Controllers, CLI, UI
- **Depends on**: UseCase layer
- **Rule**: Thin, just maps HTTP ↔ UseCase

## When to Break Rules

**Never** break layer dependencies unless:
1. Prototyping with explicit TODO to refactor
2. Performance-critical path with documented reason
3. ADR approved the deviation

## ESLint Boundaries

This repo uses `eslint-plugin-boundaries` to enforce:
- `projects/*/domain/` cannot import from `infrastructure/`
- `projects/*/usecase/` cannot import from `presentation/`

Run `./tools/contract lint` to check.

## See Also

- `prompts/skills/horizontal_guardrails.md` for guardrail details
- `docs/02_architecture/adr/` for architecture decisions
- `docs/00_process/adr_guidelines.md` for ADR creation, lifecycle, and review process
