# Demo / Seed Data

Initial data specification for development and demo environments.

<!-- TODO: Define your product's seed data here -->

---

## Users

| Email | Role | Password | Notes |
|-------|------|----------|-------|
| admin@example.com | admin | `Admin1234` | Default admin account (see `prisma/seed.ts`) |
| user@example.com | user | — | 未実装（seed に含まれていない） |

---

## Feature Data

<!-- TODO: Add seed data for your product's core entities -->

Example:
```typescript
// prisma/seed.ts
await prisma.yourEntity.createMany({
  data: [
    { name: 'Example 1', ... },
    { name: 'Example 2', ... },
  ],
});
```
