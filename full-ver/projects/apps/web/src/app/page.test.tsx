/**
 * @what HomePage コンポーネントのユニットテスト
 * @why AC-002: `/` ページが正常に表示される (Issue #159 FE-001)
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Auth store state controlled per test
interface AuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
}

const mockAuthState: AuthState = {
  isAuthenticated: false,
  isHydrated: false,
};

vi.mock('@/features/auth', () => ({
  useAuthStore: (selector: (state: AuthState) => unknown) => selector(mockAuthState),
}));

// Import page after mocks
import HomePage from './page';

describe('HomePage (AC-002: / ページが正常に表示される)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.isAuthenticated = false;
    mockAuthState.isHydrated = false;
  });

  it('should render a loading spinner while hydrating', () => {
    mockAuthState.isHydrated = false;

    render(<HomePage />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeDefined();
    expect(spinner.getAttribute('aria-label')).toBe('Loading');
  });

  it('should redirect to /login when not authenticated after hydration', () => {
    mockAuthState.isHydrated = true;
    mockAuthState.isAuthenticated = false;

    render(<HomePage />);

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('should redirect to /dashboard when authenticated after hydration', () => {
    mockAuthState.isHydrated = true;
    mockAuthState.isAuthenticated = true;

    render(<HomePage />);

    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
