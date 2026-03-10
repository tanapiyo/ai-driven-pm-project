import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('applies dark mode when .dark class is on html element', async ({ page }) => {
    // Set dark theme in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('app:theme', 'dark');
    });

    await page.goto('/login');

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Verify html has dark class (set by FOUC prevention script)
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify body has dark mode background color (neutral-900 = #171717 = rgb(23, 23, 23))
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(23, 23, 23)');
  });

  test('applies light mode when .dark class is not on html element', async ({ page }) => {
    // Set light theme in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('app:theme', 'light');
    });

    await page.goto('/login');

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Verify html does NOT have dark class
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Verify body has light mode background color
    // Tailwind v4 may use LAB color space, so check that it's NOT dark mode color
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Dark mode is rgb(23, 23, 23), light mode should be different
    expect(bgColor).not.toBe('rgb(23, 23, 23)');
  });

  test('persists theme preference across page loads', async ({ page }) => {
    // Set dark theme in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('app:theme', 'dark');
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Verify dark mode applied
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify dark mode persisted
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 23, 23)');
  });
});
