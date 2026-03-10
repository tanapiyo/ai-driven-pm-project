/**
 * @layer e2e
 * @what Authentication setup for Playwright tests
 *
 * This file handles login automation and saves the authenticated state
 * using Playwright's storageState feature. The state is reused across
 * tests to avoid logging in for every test.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

/** Test user credentials by role (from seed.ts) */
const TEST_USERS = {
  user: { email: 'user@example.com', password: 'Password123' },
  admin: { email: 'admin@example.com', password: 'Password123' },
} as const;

type Role = keyof typeof TEST_USERS;

const authDir = path.join(__dirname, '..', '.auth');

setup('authenticate', async ({ page }, testInfo) => {
  // Get role from project metadata
  const role = (testInfo.project.metadata?.role as Role) ?? 'user';
  const credentials = TEST_USERS[role];

  if (!credentials) {
    throw new Error(`Unknown role: ${role}`);
  }

  // Navigate to login page
  await page.goto('/login');

  // Wait for login form to be ready
  await expect(page.getByTestId('login-form')).toBeVisible();

  // Fill in credentials
  await page.getByTestId('login-email-input').fill(credentials.email);
  await page.getByTestId('login-password-input').fill(credentials.password);

  // Submit login form
  await page.getByTestId('login-submit').click();

  // Wait for redirect to dashboard (indicates successful login)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  // Save auth state to file
  const authFile = path.join(authDir, `${role}.json`);
  await page.context().storageState({ path: authFile });
});
