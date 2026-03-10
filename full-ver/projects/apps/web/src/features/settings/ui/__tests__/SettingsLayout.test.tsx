/**
 * @what SettingsLayout コンポーネントのユニットテスト
 * @why 設定ページレイアウトの構造を検証
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsLayout } from '../SettingsLayout';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
}));

describe('SettingsLayout', () => {
  describe('rendering', () => {
    it('should render children content', () => {
      render(
        <SettingsLayout>
          <div data-testid="test-content">Test Content</div>
        </SettingsLayout>
      );

      expect(screen.getByTestId('test-content')).toBeDefined();
      expect(screen.getByText('Test Content')).toBeDefined();
    });

    it('should render navigation sidebar', () => {
      render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      const nav = screen.getByRole('navigation', { name: /settings navigation/i });
      expect(nav).toBeDefined();
    });

    it('should render menu items in navigation', () => {
      render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole('link', { name: /アカウント/i })).toBeDefined();
      expect(screen.getByRole('link', { name: /外観/i })).toBeDefined();
    });
  });

  describe('layout structure', () => {
    it('should have flex container', () => {
      const { container } = render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      const flexContainer = container.firstChild as HTMLElement;
      expect(flexContainer.className).toContain('flex');
    });

    it('should have gap between nav and content', () => {
      const { container } = render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      const flexContainer = container.firstChild as HTMLElement;
      expect(flexContainer.className).toContain('gap-8');
    });
  });
});
