/**
 * @what Server module import path validation test
 * @why Prevent regression of ERR_MODULE_NOT_FOUND errors at runtime
 *
 * This test validates that critical modules exist and can be resolved,
 * catching broken import paths before deployment.
 *
 * Architecture: Express-based routes with handler registry
 * - Handlers registered in presentation/handlers/index.ts
 * - Routes registered in composition/register-generated-routes.ts
 *
 * ADR-0013: Hono removed, Express is the only HTTP framework
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Server module imports', () => {
  describe('Critical modules existence', () => {
    const criticalModules = [
      {
        name: 'handlers/index.ts',
        path: './handlers/index.ts',
        description: 'Handler registry',
      },
      {
        name: 'container.ts',
        path: '../composition/container.ts',
        description: 'DI container',
      },
      {
        name: 'build-app.ts',
        path: '../composition/build-app.ts',
        description: 'App builder',
      },
      {
        name: 'register-generated-routes.ts',
        path: '../composition/register-generated-routes.ts',
        description: 'OAS route registration',
      },
    ];

    it.each(criticalModules)('should have $name ($description)', ({ path }) => {
      const fullPath = resolve(__dirname, path);
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should NOT have deleted legacy Hono files', () => {
      // Hono app factory has been removed (ADR-0013)
      const removedFiles = ['./app.ts', './routes/all-routes.ts', './routes/auth.ts'];
      removedFiles.forEach((file) => {
        const filePath = resolve(__dirname, file);
        expect(existsSync(filePath)).toBe(false);
      });
    });
  });

  describe('Module exports', () => {
    it('should export handlers from handlers/index.ts', async () => {
      const handlersModule = await import('./handlers/index.js');
      expect(handlersModule.handlers).toBeDefined();
      expect(typeof handlersModule.handlers).toBe('object');
      expect(handlersModule.hasHandler).toBeDefined();
      expect(typeof handlersModule.hasHandler).toBe('function');
    });

    it('should export createAppContext from container.ts', async () => {
      const containerModule = await import('../composition/container.js');
      expect(containerModule.createAppContext).toBeDefined();
      expect(typeof containerModule.createAppContext).toBe('function');
    });

    it('should export buildApp from build-app.ts', async () => {
      const buildAppModule = await import('../composition/build-app.js');
      expect(buildAppModule.buildApp).toBeDefined();
      expect(typeof buildAppModule.buildApp).toBe('function');
    });

    it('should export registerGeneratedRoutes from register-generated-routes.ts', async () => {
      const registerRoutesModule = await import('../composition/register-generated-routes.js');
      expect(registerRoutesModule.registerGeneratedRoutes).toBeDefined();
      expect(typeof registerRoutesModule.registerGeneratedRoutes).toBe('function');
    });
  });
});
