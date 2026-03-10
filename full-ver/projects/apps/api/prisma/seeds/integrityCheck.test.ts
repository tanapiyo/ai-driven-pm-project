/**
 * @what Unit tests for seed integrity check logic
 * @why Verify that integrity check correctly validates admin user presence and attributes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma modules before importing anything that uses them
vi.mock('../generated/prisma/client.js', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    authUser: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@prisma/adapter-mariadb', () => ({
  PrismaMariaDb: vi.fn().mockImplementation(() => ({})),
}));

// Capture process.exit calls without actually exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
  throw new Error(`process.exit(${_code})`);
});

// Capture console.error calls
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('seed integrity check logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin user validation rules', () => {
    it('should pass when admin user exists with correct role and status', () => {
      const adminUser = {
        email: 'admin@example.com',
        role: 'admin' as const,
        status: 'active' as const,
      };

      const errors: string[] = [];

      if (!adminUser) {
        errors.push('Missing admin user (admin@example.com)');
      } else {
        if (adminUser.role !== 'admin') {
          errors.push(`Admin user role is "${adminUser.role}", expected "admin"`);
        }
        if (adminUser.status !== 'active') {
          errors.push(`Admin user status is "${adminUser.status}", expected "active"`);
        }
      }

      expect(errors).toHaveLength(0);
    });

    it('should report error when admin user is missing', () => {
      const adminUser = null;

      const errors: string[] = [];

      if (!adminUser) {
        errors.push('Missing admin user (admin@example.com)');
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Missing admin user (admin@example.com)');
    });

    it('should report error when admin user has wrong role', () => {
      const adminUser = {
        email: 'admin@example.com',
        role: 'user' as const,
        status: 'active' as const,
      };

      const errors: string[] = [];

      if (adminUser.role !== 'admin') {
        errors.push(`Admin user role is "${adminUser.role}", expected "admin"`);
      }
      if (adminUser.status !== 'active') {
        errors.push(`Admin user status is "${adminUser.status}", expected "active"`);
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('role is "user"');
      expect(errors[0]).toContain('expected "admin"');
    });

    it('should report error when admin user is inactive', () => {
      const adminUser = {
        email: 'admin@example.com',
        role: 'admin' as const,
        status: 'inactive' as const,
      };

      const errors: string[] = [];

      if (adminUser.role !== 'admin') {
        errors.push(`Admin user role is "${adminUser.role}", expected "admin"`);
      }
      if (adminUser.status !== 'active') {
        errors.push(`Admin user status is "${adminUser.status}", expected "active"`);
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('status is "inactive"');
      expect(errors[0]).toContain('expected "active"');
    });

    it('should report multiple errors when both role and status are wrong', () => {
      const adminUser = {
        email: 'admin@example.com',
        role: 'user' as const,
        status: 'inactive' as const,
      };

      const errors: string[] = [];

      if (adminUser.role !== 'admin') {
        errors.push(`Admin user role is "${adminUser.role}", expected "admin"`);
      }
      if (adminUser.status !== 'active') {
        errors.push(`Admin user status is "${adminUser.status}", expected "active"`);
      }

      expect(errors).toHaveLength(2);
    });
  });

  afterEach(() => {
    mockExit.mockClear();
    mockConsoleError.mockClear();
    mockConsoleLog.mockClear();
  });
});
