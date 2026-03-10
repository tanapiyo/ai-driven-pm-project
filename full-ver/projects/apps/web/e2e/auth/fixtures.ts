/**
 * @layer e2e
 * @what Typed fixtures for authenticated E2E tests
 *
 * Extends Playwright's test object with authentication-aware fixtures.
 * Use `test` from this file instead of `@playwright/test` for authenticated tests.
 */
import { test as base, expect } from '@playwright/test';

/** User roles available in the system */
export type UserRole = 'admin' | 'user';

/** Extended test fixtures with authentication context */
export interface AuthFixtures {
  /** The role of the currently authenticated user */
  userRole: UserRole;
}

/**
 * Extended test object with authentication fixtures.
 *
 * @example
 * ```ts
 * import { test, expect } from './auth/fixtures';
 *
 * test('user can view dashboard', async ({ page, userRole }) => {
 *   expect(userRole).toBe('user');
 *   await page.goto('/dashboard');
 *   await expect(page).toHaveURL(/\/dashboard/);
 * });
 * ```
 */
export const test = base.extend<AuthFixtures>({
  // eslint-disable-next-line no-empty-pattern
  userRole: async ({}, use, testInfo) => {
    // Extract role from project metadata (set in playwright.config.ts)
    const role = testInfo.project.metadata?.role as UserRole | undefined;

    if (!role) {
      throw new Error(
        `No role found in project metadata. ` +
          `Make sure you're running with a role-specific project ` +
          `(e.g., --project=chromium:user)`
      );
    }

    await use(role);
  },
});

export { expect };
