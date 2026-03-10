/**
 * @what Vitest configuration for API application
 * @why Explicit test configuration with coverage thresholds for TDD workflow
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage thresholds (TDD requirement: 80% target)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },

      // Coverage target
      include: ['src/**/*.ts'],

      // Exclude patterns
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'prisma/**',
        'prisma/generated/**',
        'prisma/seed.ts',
        '__tests__/**',
        'src/index.ts', // Entry point
        'src/legacy.ts', // Legacy code
        'src/composition/**', // DI composition root
        '**/index.ts', // Barrel exports
      ],

      // Show uncovered files
      all: true,
    },

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'prisma/seeds/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'prisma/generated'],

    // Setup files (load custom matchers and global config)
    setupFiles: ['./vitest.setup.ts'],

    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Watch mode configuration
    watch: true,
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },

  // Resolve aliases (matching tsconfig paths if needed)
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
