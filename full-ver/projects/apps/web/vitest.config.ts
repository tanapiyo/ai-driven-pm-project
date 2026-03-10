/**
 * @what Vitest configuration for Web application
 * @why Test React components with jsdom environment
 */

import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@monorepo/api-contract': path.resolve(__dirname, '../../packages/api-contract/src/index.ts'),
    },
  },
  test: {
    // Test environment for React component testing
    environment: 'jsdom',

    // Global test utilities
    globals: true,

    // Test file patterns
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],

    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
