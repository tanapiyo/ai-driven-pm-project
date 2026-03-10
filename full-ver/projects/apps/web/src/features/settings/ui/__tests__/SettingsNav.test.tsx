/**
 * @what SettingsNav コンポーネントのユニットテスト
 * @why 設定ナビゲーションメニューの表示・状態管理を検証
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsNav } from '../SettingsNav';

// Mock next/navigation
const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('SettingsNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/settings');
  });

  describe('rendering', () => {
    it('should render navigation element', () => {
      render(<SettingsNav />);

      const nav = screen.getByRole('navigation', { name: /settings navigation/i });
      expect(nav).toBeDefined();
    });

    it('should render account menu item', () => {
      render(<SettingsNav />);

      const accountLink = screen.getByRole('link', { name: /アカウント/i });
      expect(accountLink).toBeDefined();
      expect(accountLink.getAttribute('href')).toBe('/settings/account');
    });

    it('should render appearance menu item', () => {
      render(<SettingsNav />);

      const appearanceLink = screen.getByRole('link', { name: /外観/i });
      expect(appearanceLink).toBeDefined();
      expect(appearanceLink.getAttribute('href')).toBe('/settings/appearance');
    });

    it('should render icons for each menu item', () => {
      render(<SettingsNav />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        const svg = link.querySelector('svg');
        expect(svg).toBeDefined();
      });
    });
  });

  describe('active state', () => {
    it('should highlight account link when on account page', () => {
      mockPathname.mockReturnValue('/settings/account');
      render(<SettingsNav />);

      const accountLink = screen.getByRole('link', { name: /アカウント/i });
      expect(accountLink.getAttribute('aria-current')).toBe('page');
    });

    it('should highlight appearance link when on appearance page', () => {
      mockPathname.mockReturnValue('/settings/appearance');
      render(<SettingsNav />);

      const appearanceLink = screen.getByRole('link', { name: /外観/i });
      expect(appearanceLink.getAttribute('aria-current')).toBe('page');
    });

    it('should not highlight any link when on settings root', () => {
      mockPathname.mockReturnValue('/settings');
      render(<SettingsNav />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link.getAttribute('aria-current')).toBeNull();
      });
    });

    it('should highlight link for nested routes', () => {
      mockPathname.mockReturnValue('/settings/account/edit');
      render(<SettingsNav />);

      const accountLink = screen.getByRole('link', { name: /アカウント/i });
      expect(accountLink.getAttribute('aria-current')).toBe('page');
    });
  });

  describe('accessibility', () => {
    it('should have list structure', () => {
      render(<SettingsNav />);

      const list = screen.getByRole('list');
      expect(list).toBeDefined();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(2);
    });

    it('should have proper navigation label', () => {
      render(<SettingsNav />);

      const nav = screen.getByRole('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Settings navigation');
    });
  });
});
