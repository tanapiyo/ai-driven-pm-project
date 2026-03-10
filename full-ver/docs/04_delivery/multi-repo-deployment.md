# Multi-Repository Deployment Guide

## Overview

This guide explains how to deploy Frontend and Backend from separate repositories while maintaining same-origin API routing through Traefik.

## Architecture

```
Browser: http://myproject.localhost
  ↓
Traefik (L7 Proxy)
  ├─ /api/*    → Backend container (priority 100, StripPrefix)
  └─ /*        → Frontend container (priority 1)
```

**Key Principle**: Both Frontend and Backend register routes to the same host (`${STACK}.localhost`), but with different path prefixes and priorities.

---

## Prerequisites

1. **Traefik** must be running with `traefik-public` network:
   ```bash
   docker network create traefik-public
   docker compose -f infra/docker-compose.traefik.yml up -d
   ```

2. **STACK variable** must be set uniquely for each deployment:
   ```bash
   export STACK=my-project
   ```

---

## Frontend Repository Setup

### 1. Copy Template

```bash
cp infra/templates/docker-compose.web-template.yml docker-compose.yml
```

### 2. Configure Environment

Create `.env` file:

```bash
STACK=my-project
NODE_ENV=development
WEB_PORT=3000
```

### 3. Update Frontend Config

Ensure API Base URL uses relative path:

```typescript
// src/shared/config/env.ts
export function getConfig(): AppConfig {
  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    // ...
  };
}
```

### 4. Start Frontend

```bash
docker compose up -d
```

**Access**: `http://my-project.localhost`

---

## Backend Repository Setup

### 1. Copy Template

```bash
cp infra/templates/docker-compose.api-template.yml docker-compose.yml
```

### 2. Configure Environment

Create `.env` file:

```bash
STACK=my-project
NODE_ENV=development
API_PORT=8080
DATABASE_URL=postgresql://user:pass@db:5432/mydb
```

### 3. Update Backend Routes

**Important**: Backend routes should NOT include `/api` prefix. Traefik's StripPrefix middleware handles this.

```typescript
// Example: Router configuration
if (pathname === '/csrf-token' && method === 'GET') {
  // NOT /api/csrf-token
  // ...
}
```

### 4. Start Backend

```bash
docker compose up -d
```

**Access**: `http://my-project.localhost/api` (via Traefik)

**Debug Access**: `http://be-my-project.localhost` (direct, no prefix stripping)

---

## Naming Convention

To avoid conflicts when deploying multiple projects:

| Resource Type | Pattern | Example |
|---------------|---------|---------|
| Container | `${STACK}-web` | `my-project-web` |
| Container | `${STACK}-api` | `my-project-api` |
| Traefik Router | `${STACK}-web` | `my-project-web` |
| Traefik Router | `${STACK}-api` | `my-project-api` |
| Traefik Service | `${STACK}-web` | `my-project-web` |
| Traefik Service | `${STACK}-api` | `my-project-api` |
| Traefik Middleware | `${STACK}-strip-api` | `my-project-strip-api` |

**Rule**: Always use `${STACK}` as prefix to ensure uniqueness.

---

## Parallel Deployments

You can run multiple projects simultaneously by using different `STACK` values:

```bash
# Project A
export STACK=project-a
cd frontend-a && docker compose up -d
cd backend-a && docker compose up -d

# Project B
export STACK=project-b
cd frontend-b && docker compose up -d
cd backend-b && docker compose up -d
```

**Result**:
- Project A: `http://project-a.localhost`
- Project B: `http://project-b.localhost`

---

## Traefik Priority Rules

Understanding priority is crucial for correct routing:

| Priority | Router | Rule | Example |
|----------|--------|------|---------|
| 100 | API | `Host() && PathPrefix(/api)` | `/api/csrf-token` → API |
| 1 | Frontend | `Host()` | `/dashboard` → Frontend |

**Why**: Higher priority wins. API router (100) intercepts `/api/*` before Frontend router (1) sees the request.

---

## Verification

### 1. Check Traefik Dashboard

Visit: `http://localhost:8080`

Verify:
- Router `${STACK}-web` exists with priority 1
- Router `${STACK}-api` exists with priority 100
- Middleware `${STACK}-strip-api` is attached to `${STACK}-api`

### 2. Test API Request

```bash
# Via same-origin (Traefik routes to API)
curl http://my-project.localhost/api/health

# Direct to backend (no Traefik prefix stripping)
curl http://be-my-project.localhost/health
```

### 3. Browser Console

```javascript
// In browser at http://my-project.localhost
fetch('/api/csrf-token')
  .then(r => r.json())
  .then(console.log);  // Should return CSRF token
```

---

## Troubleshooting

### API requests return 404

**Cause**: API router priority is not higher than Frontend router.

**Fix**: Verify `priority=100` in API router labels:

```yaml
- "traefik.http.routers.${STACK}-api.priority=100"
```

### API receives requests with /api prefix

**Cause**: StripPrefix middleware not attached.

**Fix**: Verify middleware attachment:

```yaml
- "traefik.http.middlewares.${STACK}-strip-api.stripprefix.prefixes=/api"
- "traefik.http.routers.${STACK}-api.middlewares=${STACK}-strip-api"
```

### CORS errors in browser

**Cause**: Requests are still cross-origin (not using same host).

**Fix**: Verify Frontend uses relative `/api` path:

```typescript
const response = await fetch('/api/auth/login', { ... });
// NOT: fetch('http://be-project.localhost/auth/login', ...)
```

### Naming conflicts between projects

**Cause**: Multiple projects using same `STACK` value.

**Fix**: Use unique `STACK` for each project:

```bash
# Correct
export STACK=project-a  # in project A
export STACK=project-b  # in project B

# Incorrect (both use "main")
export STACK=main  # in both projects
```

---

## Production Considerations

### 1. HTTPS / TLS

Update Traefik configuration:

```yaml
# infra/docker-compose.traefik.yml
command:
  - "--entrypoints.websecure.address=:443"
  - "--certificatesresolvers.letsencrypt.acme.email=security@example.com"
  - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"

labels:
  # Frontend
  - "traefik.http.routers.${STACK}-web.tls.certresolver=letsencrypt"
  # API
  - "traefik.http.routers.${STACK}-api.tls.certresolver=letsencrypt"
```

### 2. Domain Names

Replace `.localhost` with actual domains:

```yaml
# Development
- "traefik.http.routers.${STACK}-web.rule=Host(`${STACK}.localhost`)"

# Production
- "traefik.http.routers.${STACK}-web.rule=Host(`${STACK}.example.com`)"
- "traefik.http.routers.${STACK}-api.rule=Host(`${STACK}.example.com`) && PathPrefix(`/api`)"
```

### 3. Security Headers

Add security middleware:

```yaml
labels:
  - "traefik.http.middlewares.${STACK}-security.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.${STACK}-security.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.${STACK}-security.headers.stsPreload=true"
  - "traefik.http.routers.${STACK}-web.middlewares=${STACK}-security"
```

---

## References

- [Traefik Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Traefik StripPrefix Middleware](https://doc.traefik.io/traefik/middlewares/http/stripprefix/)
- [Same-Origin API Routing Spec](../../.specify/specs/same-origin-api-routing/spec.md)
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
