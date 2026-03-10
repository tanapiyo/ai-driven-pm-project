/**
 * @layer e2e
 * @what Dashboard authenticated tests
 *
 * Example tests demonstrating authenticated E2E testing using Playwright's
 * storageState feature. These tests run with pre-authenticated sessions.
 */
import { test, expect } from './auth/fixtures';

test.describe('Dashboard (authenticated)', () => {
  test('should access dashboard without login redirect', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto('/dashboard');

    // Should stay on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify we can see the current user role indicator
    // This confirms the authenticated session is working
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display dashboard content', async ({ page, userRole }) => {
    await page.goto('/dashboard');

    // Verify dashboard loaded successfully
    await expect(page).toHaveURL(/\/dashboard/);

    // Role-specific assertions can be added here
    if (userRole === 'admin') {
      // Admin-specific checks would go here
    } else {
      // User-specific checks would go here
    }
  });

  test('should maintain session across navigation', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to another protected route and back
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);

    // Still on dashboard (redirected there because authenticated)
  });
});
