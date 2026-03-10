/**
 * @what Controller import path regression test
 * @why Prevent regression of TS2307 errors caused by broken ControllerLogger import paths
 *
 * AC-001: profile-controller.ts の ControllerLogger import が ./auth-controller.js を参照している
 * AC-002: deep-ping-controller.ts の ControllerLogger import が ./auth-controller.js を参照している
 *
 * See: https://github.com/CoDaMa-LDH-Funs/codama-ldh/issues/94
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Controller import paths', () => {
  describe('ControllerLogger import source', () => {
    it('should export ControllerLogger from auth-controller.ts', async () => {
      const authControllerPath = resolve(__dirname, 'auth-controller.ts');
      expect(existsSync(authControllerPath)).toBe(true);

      const content = readFileSync(authControllerPath, 'utf-8');
      expect(content).toContain('export interface ControllerLogger');
    });

    it('should NOT have user-controller file (does not exist)', () => {
      const userControllerPath = resolve(__dirname, 'user-controller.ts');
      const userControllerJsPath = resolve(__dirname, 'user-controller.js');
      expect(existsSync(userControllerPath)).toBe(false);
      expect(existsSync(userControllerJsPath)).toBe(false);
    });

    it('profile-controller.ts should import ControllerLogger from auth-controller.js (AC-001)', () => {
      const profileControllerPath = resolve(__dirname, 'profile-controller.ts');
      expect(existsSync(profileControllerPath)).toBe(true);

      const content = readFileSync(profileControllerPath, 'utf-8');
      expect(content).toContain("from './auth-controller.js'");
      expect(content).not.toContain("from './user-controller.js'");
    });

    it('deep-ping-controller.ts should import ControllerLogger from auth-controller.js (AC-002)', () => {
      const deepPingControllerPath = resolve(__dirname, 'deep-ping-controller.ts');
      expect(existsSync(deepPingControllerPath)).toBe(true);

      const content = readFileSync(deepPingControllerPath, 'utf-8');
      expect(content).toContain("from './auth-controller.js'");
      expect(content).not.toContain("from './user-controller.js'");
    });
  });

  describe('Module resolution (AC-003)', () => {
    it('should be able to import ProfileController without module not found error', async () => {
      const profileController = await import('./profile-controller.js');
      expect(profileController.ProfileController).toBeDefined();
      expect(typeof profileController.ProfileController).toBe('function');
    });

    it('should be able to import DeepPingController without module not found error', async () => {
      const deepPingController = await import('./deep-ping-controller.js');
      expect(deepPingController.DeepPingController).toBeDefined();
      expect(typeof deepPingController.DeepPingController).toBe('function');
    });

    it('should be able to import ControllerLogger type from auth-controller', async () => {
      const authController = await import('./auth-controller.js');
      // ControllerLogger is a type-only export; verify module loads
      expect(authController).toBeDefined();
      expect(authController.AuthController).toBeDefined();
    });
  });
});
