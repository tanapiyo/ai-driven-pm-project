/**
 * @what DashboardHome コンポーネントのユニットテスト
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardHome } from '../DashboardHome';
import type { UserProfile } from '@/features/auth';

// Mock auth store
const mockUser = vi.fn<() => UserProfile | null>();

vi.mock('@/features/auth', () => ({
  useAuthStore: (selector: (state: { user: UserProfile | null }) => unknown) =>
    selector({ user: mockUser() }),
}));

describe('DashboardHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when no user', () => {
    mockUser.mockReturnValue(null);

    const { container } = render(<DashboardHome />);

    expect(container.innerHTML).toBe('');
  });

  it('should render welcome message with user name', () => {
    mockUser.mockReturnValue({
      id: '1',
      email: 'user@example.com',
      name: 'テストユーザー',
      role: 'user',
    });

    render(<DashboardHome />);

    expect(screen.getByText('ようこそ、テストユーザーさん')).toBeDefined();
  });

  it('should render user role label for user role', () => {
    mockUser.mockReturnValue({
      id: '1',
      email: 'user@example.com',
      name: 'テストユーザー',
      role: 'user',
    });

    render(<DashboardHome />);

    expect(screen.getByText('ユーザーとしてログイン中')).toBeDefined();
  });

  it('should render admin role label for admin role', () => {
    mockUser.mockReturnValue({
      id: '2',
      email: 'admin@example.com',
      name: '管理者',
      role: 'admin',
    });

    render(<DashboardHome />);

    expect(screen.getByText('管理者としてログイン中')).toBeDefined();
  });

  it('should fallback to email when name is empty', () => {
    mockUser.mockReturnValue({
      id: '1',
      email: 'test@example.com',
      name: '',
      role: 'user',
    });

    render(<DashboardHome />);

    expect(screen.getByText('ようこそ、test@example.comさん')).toBeDefined();
  });

  it('should render navigation hint', () => {
    mockUser.mockReturnValue({
      id: '1',
      email: 'user@example.com',
      name: 'テストユーザー',
      role: 'user',
    });

    render(<DashboardHome />);

    expect(screen.getByText('左のメニューから機能を選択してください。')).toBeDefined();
  });
});
