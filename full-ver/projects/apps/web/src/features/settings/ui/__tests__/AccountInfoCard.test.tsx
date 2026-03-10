/**
 * @what AccountInfoCard コンポーネントのユニットテスト
 * @why アカウント情報が正しく表示されることを検証
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountInfoCard } from '../AccountInfoCard';

const mockUseCurrentUser = vi.fn();
vi.mock('@/features/auth', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock('../PasswordChangeDialog', () => ({
  PasswordChangeDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="password-change-dialog">
        <button onClick={onClose}>Close Dialog</button>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('AccountInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      mockUseCurrentUser.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<AccountInfoCard />);

      expect(screen.getByText('アカウント情報')).toBeDefined();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });
  });

  describe('error state', () => {
    it('should show error message when fetch fails', () => {
      mockUseCurrentUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      });

      render(<AccountInfoCard />);

      expect(screen.getByText('アカウント情報の取得に失敗しました。')).toBeDefined();
    });
  });

  describe('success state', () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
    });

    it('should render card header', () => {
      render(<AccountInfoCard />);

      expect(screen.getByText('アカウント情報')).toBeDefined();
    });

    it('should display user ID', () => {
      render(<AccountInfoCard />);

      expect(screen.getByText('ユーザーID')).toBeDefined();
      expect(screen.getByText(mockUser.id)).toBeDefined();
    });

    it('should display role as badge', () => {
      render(<AccountInfoCard />);

      expect(screen.getByText('ロール')).toBeDefined();
      expect(screen.getByText('ユーザー')).toBeDefined();
    });

    it('should display email address', () => {
      render(<AccountInfoCard />);

      expect(screen.getByText('メールアドレス')).toBeDefined();
      expect(screen.getByText(mockUser.email)).toBeDefined();
    });

    it('should mark values as readonly', () => {
      render(<AccountInfoCard />);

      const readonlyElements = document.querySelectorAll('[aria-readonly="true"]');
      expect(readonlyElements.length).toBe(3);
    });

    it('should display password field with masked value', () => {
      render(<AccountInfoCard />);

      expect(screen.getByText('パスワード')).toBeDefined();
      expect(screen.getByText('••••••••')).toBeDefined();
    });

    it('should show change password button', () => {
      render(<AccountInfoCard />);

      const changeButton = screen.getByRole('button', { name: '変更' });
      expect(changeButton).toBeDefined();
    });
  });

  describe('password change dialog', () => {
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
    });

    it('should not show dialog initially', () => {
      render(<AccountInfoCard />);

      expect(screen.queryByTestId('password-change-dialog')).toBeNull();
    });

    it('should open dialog when change button is clicked', () => {
      render(<AccountInfoCard />);

      const changeButton = screen.getByRole('button', { name: '変更' });
      fireEvent.click(changeButton);

      expect(screen.getByTestId('password-change-dialog')).toBeDefined();
    });

    it('should close dialog when onClose is called', () => {
      render(<AccountInfoCard />);

      const changeButton = screen.getByRole('button', { name: '変更' });
      fireEvent.click(changeButton);

      expect(screen.getByTestId('password-change-dialog')).toBeDefined();

      const closeButton = screen.getByText('Close Dialog');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('password-change-dialog')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should return null when user is not available', () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { container } = render(<AccountInfoCard />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        isLoading: false,
        error: null,
      });
    });

    it('should use definition list for field groups', () => {
      render(<AccountInfoCard />);

      const dl = document.querySelector('dl');
      expect(dl).toBeDefined();

      const dts = document.querySelectorAll('dt');
      expect(dts.length).toBe(4);

      const dds = document.querySelectorAll('dd');
      expect(dds.length).toBe(4);
    });
  });
});
