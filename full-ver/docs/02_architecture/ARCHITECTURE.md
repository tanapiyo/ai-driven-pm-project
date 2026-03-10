# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌────────────────┬────────────────┬────────────────────┐   │
│  │ Feature A      │ Feature B      │ Feature C          │   │
│  │                │                │                    │   │
│  └────────────────┴────────────────┴────────────────────┘   │
│                  Feature-Sliced Design                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON + JWT
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Backend API (Node.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Presentation Layer                       │   │
│  │  (Controllers, Router, Auth Middleware)              │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │               UseCase Layer                           │   │
│  │  (Business Logic, Orchestration)                     │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │               Domain Layer                            │   │
│  │  (Entities, Value Objects, Repository Interfaces)    │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │            Infrastructure Layer                       │   │
│  │  (Prisma Repositories, JWT Service, etc.)            │   │
│  └───────────────────┬──────────────────────────────────┘   │
└────────────────────────┼──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│                   PostgreSQL                               │
│  (User, AuditLog, ...)                                    │
└───────────────────────────────────────────────────────────┘
```

## Backend Architecture: Clean Architecture + DDD

### Layer Dependencies

```
Presentation → UseCase → Domain ← Infrastructure
```

**Dependency Rule**: Dependencies point inward toward the domain.

### Domain Layer

Business entities and repository interfaces.

- **User**: Core user entity with authentication and role
- **AuditLog**: Audit trail for entity changes
- **Repository Interfaces**: Abstractions for persistence

### UseCase Layer

Business logic orchestration.

- **User**: `GetUserUseCase`, `UpdateUserUseCase`
- **Auth**: `LoginUseCase`, `LogoutUseCase`, `RefreshTokenUseCase`
- **AuditLog**: `GetAuditLogsUseCase`

### Infrastructure Layer

External dependencies implementation.

- **Prisma Repositories**: Implement domain repository interfaces
- **JWT Service**: Token generation and verification with role
- **Password Service**: bcrypt hashing
- **Email Service**: Password reset emails (logger-based in dev)

### Presentation Layer

HTTP API and middleware.

- **Controllers**: Handle HTTP requests/responses
- **Router**: Route matching and dispatch
- **Middleware**: Auth, CSRF, CORS, Rate Limiting, Security Headers

## Frontend Architecture: Feature-Sliced Design

```
app/                          # Next.js App Router
  (protected)/
    dashboard/                → features/dashboard
    settings/                 → features/user-settings
    admin/                    → Backend APIs ready

features/                     # Feature-Sliced Design
  dashboard/
    api/                      # API queries (React Query)
    model/                    # State management (Zustand)
    ui/                       # React components
  user-settings/
    api/
    model/
    ui/

shared/                       # Cross-cutting concerns
  api/                        # HTTP client
  ui/                         # Reusable components
  lib/                        # Utilities
```

### FSD Principles

- **Higher layers import from lower layers only**
- **Features are isolated** (no cross-imports)
- **Public API exports** (via `index.ts`)

## Authentication & Authorization

### JWT Structure

```typescript
{
  sub: string;      // User ID
  email: string;    // User email
  role: UserRole;   // 'planner' | 'agent' | 'executive' | 'admin'
  iat: number;      // Issued at
  exp: number;      // Expires at
  type: 'access' | 'refresh';
}
```

### Role-Based Access Control

- **Public**: Health check, auth endpoints
- **Authenticated**: User profile, protected features
- **Admin**: User management, audit logs (`/admin/*` endpoints)

## Database Schema

### Core Entities

- **AuthUser**: Users with email, password, role
- **RefreshToken**: JWT refresh token records
- **PasswordResetToken**: Password reset token records
- **AuditLog**: Audit trail for tracked entity changes

### Key Relationships

```
AuthUser ──< RefreshToken
AuthUser ──< PasswordResetToken
AuthUser ──< AuditLog (actor)
```

## API Endpoints

### Users

- `GET /users` - List users (admin only)
- `GET /users/:id` - Get user detail
- `PATCH /users/:id` - Update user

### Admin (Admin role required)

- `GET /admin/users` - User management
- `GET /admin/audit-logs` - Audit log access

### Auth

- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user

## Quality Assurance

### Testing

- **Unit Tests**: Domain logic and use case tests
- **Integration Tests**: Repository tests with in-memory DB
- **Type Safety**: Full TypeScript coverage

### Quality Gates

All code must pass:

1. `./tools/contract format` - Prettier
2. `./tools/contract lint` - ESLint
3. `./tools/contract typecheck` - TypeScript
4. `./tools/contract test` - Unit tests
5. `./tools/contract build` - Production build
6. `./tools/contract guardrail` - Architecture checks

### Architecture Guardrails

- **Layer dependency rules**: Enforced by guardrails
- **Domain purity**: No framework dependencies in domain
- **Repository pattern**: All data access via repositories
- **Feature isolation**: FSD rules enforced

## Security

### Input Validation

- Zod schemas at API boundaries
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via React escaping

### Authentication

- JWT with HttpOnly cookies (refresh token)
- Bcrypt password hashing (cost factor 12)
- Token rotation on refresh

### Authorization

- Role-based access control
- Route-level permission checks
- Admin endpoints require admin role

### Rate Limiting

- 5 requests/minute for sensitive endpoints (login, register, password reset)

## Performance

### Database

- Indexes on foreign keys and frequently queried fields
- Pagination support for list endpoints
- Efficient aggregation queries for analytics

### Frontend

- React Query for caching and background updates
- Optimistic updates for better UX
- Code splitting with Next.js

## Deployment

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars in production)
- `NODE_ENV` - Environment (development/production)

### Database Migrations

```bash
# Run migrations
pnpm --filter @monorepo/api prisma migrate deploy

# Seed data
pnpm --filter @monorepo/api prisma db seed
```

### Build & Start

```bash
# Build all packages
./tools/contract build

# Start API
cd projects/apps/api && pnpm start

# Start Web
cd projects/apps/web && pnpm start
```

## Future Enhancements

- [ ] Admin frontend UI
- [ ] User management (deactivation, role changes)
- [ ] Real-time notifications
- [ ] Advanced audit log querying and export

## Infrastructure & Delivery

### CDN / CloudFront

See `docs/02_architecture/cloudfront-cost-estimation.md` for CloudFront cost estimation and architecture options (ALB origin / OpenNext / Static Export).
