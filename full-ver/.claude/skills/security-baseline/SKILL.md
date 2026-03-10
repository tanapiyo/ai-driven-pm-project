---
name: security-baseline
description: Security best practices for Node.js/TypeScript applications. Apply when implementing auth, handling user input, or reviewing security. Triggers on "auth", "security", "validation", "XSS", "CSRF", "injection", "secrets".
globs:
  - "**/*auth*"
  - "**/*security*"
  - "**/*middleware*"
alwaysApply: false
---

# Security Baseline

Security checklist for every code change.

## Quick Reference

### Input Validation
- Validate ALL user input at boundaries
- Use Zod/Joi schemas, never trust raw input
- Sanitize before database/shell operations

### Authentication
- Use established libraries (Passport, next-auth)
- Hash passwords with bcrypt (cost ≥ 12)
- Implement rate limiting on auth endpoints

### Authorization
- Check permissions on every protected route
- Use middleware, not per-route checks
- Deny by default, allow explicitly

### Secrets Management
- Never commit secrets (use .env + .gitignore)
- Rotate secrets regularly
- Use secret managers in production

### SQL/NoSQL Injection
- Use parameterized queries ONLY
- Never interpolate user input into queries
- Use ORM query builders

### XSS Prevention
- Escape output by default (React does this)
- Sanitize HTML if rendering user content
- Set Content-Security-Policy headers

### CSRF Protection
- Use tokens for state-changing requests
- SameSite cookies
- Verify Origin header

### Dependencies
- Run `./tools/contract audit` regularly
- Pin versions in production
- Review new dependencies before adding

### Logging
- Never log secrets, tokens, passwords
- Mask PII in logs
- Use structured logging

## Next.js Specific

```typescript
// next.config.js security headers
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];
```

## See Also

- `prompts/skills/devcontainer_safe_mode.md` for environment security
- `.claude/settings.json` for deny rules
