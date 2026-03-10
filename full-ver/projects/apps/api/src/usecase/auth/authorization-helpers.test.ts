/**
 * @what 認可ヘルパー関数のユニットテスト
 * @why admin/user ロールに基づくアクセス判定の正確性を保証
 */

import { describe, it, expect } from 'vitest';
import { canAccessUnitData, canAccessUserData, isUnitManager } from './authorization-helpers.js';
import type { AuthorizedContext } from './authorized-context.js';

const USER_1 = '33333333-3333-3333-3333-333333333333';
const USER_2 = '44444444-4444-4444-4444-444444444444';
const UNIT_A = '11111111-1111-1111-1111-111111111111';

function createContext(
  overrides: Partial<AuthorizedContext> & { userId: string; role: AuthorizedContext['role'] }
): AuthorizedContext {
  return {
    ...overrides,
  };
}

describe('canAccessUserData', () => {
  it('should allow admin to access any user data', () => {
    const ctx = createContext({ userId: USER_1, role: 'admin' });
    expect(canAccessUserData(ctx, USER_2)).toBe(true);
    expect(canAccessUserData(ctx, USER_1)).toBe(true);
  });

  it('should allow user to access own data', () => {
    const ctx = createContext({ userId: USER_1, role: 'user' });
    expect(canAccessUserData(ctx, USER_1)).toBe(true);
  });

  it('should deny user from accessing another user data', () => {
    const ctx = createContext({ userId: USER_1, role: 'user' });
    expect(canAccessUserData(ctx, USER_2)).toBe(false);
  });
});

describe('canAccessUnitData (deprecated)', () => {
  it('should always return false (unit-based access control removed)', () => {
    const ctx = createContext({ userId: USER_1, role: 'admin' });
    expect(canAccessUnitData(ctx, UNIT_A)).toBe(false);
  });
});

describe('isUnitManager (deprecated)', () => {
  it('should always return false (layer-based access control removed)', () => {
    const ctx = createContext({ userId: USER_1, role: 'admin' });
    expect(isUnitManager(ctx, UNIT_A)).toBe(false);
  });
});
