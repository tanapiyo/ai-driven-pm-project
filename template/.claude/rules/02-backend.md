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

- Parameterized queries only (no raw SQL interpolation)
- Migrations via dedicated migration tool
- MUST NOT hand-write HTTP clients for internal APIs
