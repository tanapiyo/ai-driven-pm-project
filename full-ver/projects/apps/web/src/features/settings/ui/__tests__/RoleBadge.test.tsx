/**
 * @what RoleBadge コンポーネントのユニットテスト
 * @why ロールバッジが正しいラベルと色で表示されることを検証
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '../RoleBadge';
import type { UserRole } from '@/features/auth';

describe('RoleBadge', () => {
  describe('rendering', () => {
    it('should render admin role with correct label', () => {
      render(<RoleBadge role="admin" />);

      const badge = screen.getByText('管理者');
      expect(badge).toBeDefined();
    });

    it('should render user role with correct label', () => {
      render(<RoleBadge role="user" />);

      const badge = screen.getByText('ユーザー');
      expect(badge).toBeDefined();
    });
  });

  describe('styling', () => {
    const testCases: { role: UserRole; expectedBgClass: string }[] = [
      { role: 'admin', expectedBgClass: 'bg-red-100' },
      { role: 'user', expectedBgClass: 'bg-blue-100' },
    ];

    testCases.forEach(({ role, expectedBgClass }) => {
      it(`should apply correct styling for ${role} role`, () => {
        render(<RoleBadge role={role} />);

        const badge = screen.getByText(role === 'admin' ? '管理者' : 'ユーザー');
        expect(badge.classList.contains(expectedBgClass)).toBe(true);
      });
    });

    it('should have badge base styles', () => {
      render(<RoleBadge role="user" />);

      const badge = screen.getByText('ユーザー');
      expect(badge.classList.contains('rounded-full')).toBe(true);
      expect(badge.classList.contains('text-xs')).toBe(true);
      expect(badge.classList.contains('font-medium')).toBe(true);
    });
  });
});
