/**
 * @what Route registration regression test
 * @why Core routes (auth/profile/admin-user/audit) must be registered correctly
 */

import { describe, it, expect } from 'vitest';
import { getRegisteredRoutes } from './register-generated-routes.js';

describe('Route registration: core skeleton routes', () => {
  it('auth login route is registered', () => {
    const routes = getRegisteredRoutes();
    const loginRoute = routes.find((r) => r.method === 'POST' && r.path === '/auth/login');
    expect(loginRoute).toBeDefined();
  });

  it('auth me route is registered', () => {
    const routes = getRegisteredRoutes();
    const meRoute = routes.find((r) => r.method === 'GET' && r.path === '/auth/me');
    expect(meRoute).toBeDefined();
  });

  it('admin users route is registered', () => {
    const routes = getRegisteredRoutes();
    const adminUsersRoute = routes.find((r) => r.method === 'GET' && r.path === '/admin/users');
    expect(adminUsersRoute).toBeDefined();
  });

  it('admin audit-logs route is registered', () => {
    const routes = getRegisteredRoutes();
    const auditRoute = routes.find((r) => r.method === 'GET' && r.path === '/admin/audit-logs');
    expect(auditRoute).toBeDefined();
  });

  it('all registered routes have method and path', () => {
    const routes = getRegisteredRoutes();
    for (const route of routes) {
      expect(route.method).toBeTruthy();
      expect(route.path).toBeTruthy();
    }
  });
});
