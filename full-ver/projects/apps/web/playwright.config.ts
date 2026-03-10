import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, 'e2e', '.auth');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Auth setup projects - run first to create auth state files
    {
      name: 'setup:user',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
      metadata: { role: 'user' },
    },
    {
      name: 'setup:admin',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
      metadata: { role: 'admin' },
    },

    // Authenticated test projects - depend on setup projects
    {
      name: 'chromium:user',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(authDir, 'user.json'),
      },
      dependencies: ['setup:user'],
      metadata: { role: 'user' },
    },
    {
      name: 'chromium:admin',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(authDir, 'admin.json'),
      },
      dependencies: ['setup:admin'],
      metadata: { role: 'admin' },
    },

    // Default unauthenticated chromium project
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // In CI (Docker Compose), the web service is managed externally by docker-compose,
  // so webServer must be disabled to avoid conflicts and ERR_NAME_NOT_RESOLVED errors.
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
