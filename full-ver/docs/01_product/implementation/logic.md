# Business Logic

Core business logic that must be implemented correctly.

<!-- TODO: Define your product's critical business rules here -->

---

## Authentication Logic

- Password hashing: bcrypt with cost factor >= 12
- JWT tokens expire after 24 hours (configurable via env)
- Refresh tokens are single-use and expire after 7 days
- Failed login attempts are rate-limited (5 attempts per 15 minutes)

---

## Authorization Logic

- Every protected API endpoint validates the JWT token
- Role is extracted from the token payload and checked against required roles
- The last admin account cannot be deactivated

---

## Feature Logic

<!-- TODO: Add your product's domain-specific business rules here -->

Example:
- Rule name: [Description of what the rule enforces]
- Edge case: [What happens in edge cases]
