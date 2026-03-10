# E2E Tests with Playwright

This directory contains end-to-end tests using Playwright.

## Authentication Automation

Tests can run with pre-authenticated sessions using Playwright's `storageState` feature. This eliminates the need to log in for every test.

### How It Works

1. **Setup projects** (`setup:planner`, `setup:agent`, etc.) run first
2. Each setup project:
   - Performs UI login with test credentials
   - Saves cookies and localStorage to `e2e/.auth/{role}.json`
3. **Test projects** (`chromium:planner`, etc.) load the saved state
4. Tests run with an authenticated session

### Test User Credentials

| Role      | Email                 | Password    | Use Case                     |
| --------- | --------------------- | ----------- | ---------------------------- |
| planner   | dev@example.com       | Password123 | General planner workflows    |
| agent     | agent@example.com     | Password123 | Agent assignment workflows   |
| admin     | admin@example.com     | Password123 | Admin panel, system settings |
| executive | executive@example.com | Password123 | Executive dashboards         |

> These credentials are from the seed data (`projects/apps/api/prisma/seed.ts`) and only work in the DevContainer environment.

## Running Tests

### All authenticated tests (all roles)

```bash
pnpm e2e
```

### Specific role

```bash
# Run only planner tests
pnpm e2e --project=chromium:planner

# Run only admin tests
pnpm e2e --project=chromium:admin
```

### Re-run setup only

```bash
# Regenerate auth state for all roles
pnpm e2e --project='setup:*'

# Regenerate for specific role
pnpm e2e --project=setup:planner
```

### Unauthenticated tests

```bash
# Run tests without authentication
pnpm e2e --project=chromium
```

## Writing Authenticated Tests

### Using the fixtures

```typescript
// Import from fixtures instead of @playwright/test
import { test, expect } from './auth/fixtures';

test('example authenticated test', async ({ page, userRole }) => {
  // userRole is the current test's role (planner, agent, admin, executive)
  console.log(`Running as ${userRole}`);

  // Page already has authenticated session
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### Adding role-specific assertions

```typescript
import { test, expect } from './auth/fixtures';

test('role-specific behavior', async ({ page, userRole }) => {
  await page.goto('/dashboard');

  if (userRole === 'admin') {
    await expect(page.getByTestId('admin-controls')).toBeVisible();
  } else {
    await expect(page.getByTestId('admin-controls')).not.toBeVisible();
  }
});
```

## File Structure

```
e2e/
├── .auth/                    # Auth state files (gitignored)
│   ├── planner.json
│   ├── agent.json
│   ├── admin.json
│   └── executive.json
├── auth/
│   ├── auth.setup.ts         # Login automation script
│   └── fixtures.ts           # Typed test fixtures
├── home.spec.ts              # Unauthenticated tests
├── dashboard.spec.ts         # Authenticated test examples
└── README.md                 # This file
```

## Security Notes

- **Never commit `.auth/` files** - They contain session tokens
- Auth state files are automatically gitignored via `**/e2e/.auth/`
- Test credentials only work in DevContainer (isolated network)
- If credentials are exposed, only the dev environment is affected
- HttpOnly cookies are captured by Playwright but domain-restricted

## Troubleshooting

### "No role found in project metadata" error

You're running authenticated tests with the wrong project:

```bash
# Wrong - using default chromium project
pnpm e2e dashboard.spec.ts

# Correct - specify authenticated project
pnpm e2e --project=chromium:planner dashboard.spec.ts
```

### Auth state file not found

Run the setup project first:

```bash
pnpm e2e --project=setup:planner
```

### Login fails during setup

1. Ensure the dev server is running
2. Check that seed data is loaded: `pnpm --filter api db:seed`
3. Verify test credentials haven't changed in seed.ts

### Session expired

Auth state files cache the session. To refresh:

```bash
# Delete old state and regenerate
rm -rf e2e/.auth
pnpm e2e --project='setup:*'
```
