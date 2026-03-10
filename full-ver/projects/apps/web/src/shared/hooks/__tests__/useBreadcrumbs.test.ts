/**
 * @layer shared
 * @segment hooks
 * @what useBreadcrumbs フックのユニットテスト
 * @why パス名からの正確なブレッドクラム生成を検証
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreadcrumbs } from '../useBreadcrumbs';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';

const mockUsePathname = vi.mocked(usePathname);

describe('useBreadcrumbs', () => {
  describe('root path', () => {
    it('should return only ホーム for root path', () => {
      mockUsePathname.mockReturnValue('/');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([{ label: 'ホーム' }]);
    });
  });

  describe('single segment', () => {
    it('should return ホーム + ダッシュボード for /dashboard', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([{ label: 'ホーム', href: '/' }, { label: 'ダッシュボード' }]);
    });

    it('should return ホーム + 設定 for /settings', () => {
      mockUsePathname.mockReturnValue('/settings');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([{ label: 'ホーム', href: '/' }, { label: '設定' }]);
    });

    it('should return ホーム + プロフィール for /profile', () => {
      mockUsePathname.mockReturnValue('/profile');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([{ label: 'ホーム', href: '/' }, { label: 'プロフィール' }]);
    });
  });

  describe('nested paths', () => {
    it('should generate breadcrumbs for /settings/appearance', () => {
      mockUsePathname.mockReturnValue('/settings/appearance');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([
        { label: 'ホーム', href: '/' },
        { label: '設定', href: '/settings' },
        { label: '外観' },
      ]);
    });

    it('should generate breadcrumbs for /admin/users', () => {
      mockUsePathname.mockReturnValue('/admin/users');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([
        { label: 'ホーム', href: '/' },
        { label: '管理者ダッシュボード', href: '/admin' },
        { label: 'ユーザー管理' },
      ]);
    });

    it('should generate breadcrumbs for /admin/audit-logs', () => {
      mockUsePathname.mockReturnValue('/admin/audit-logs');
      const { result } = renderHook(() => useBreadcrumbs());

      expect(result.current).toEqual([
        { label: 'ホーム', href: '/' },
        { label: '管理者ダッシュボード', href: '/admin' },
        { label: '監査ログ' },
      ]);
    });
  });

  describe('intermediate links', () => {
    it('should have href for all but the last segment', () => {
      mockUsePathname.mockReturnValue('/admin/users/some-id/edit');
      const { result } = renderHook(() => useBreadcrumbs());

      const items = result.current;
      // All items except the last should have href
      items.slice(0, -1).forEach((item) => {
        expect(item.href).toBeDefined();
      });
      // Last item should not have href
      expect(items[items.length - 1].href).toBeUndefined();
    });
  });

  describe('dynamic segment fallback', () => {
    it('should label numeric IDs as 詳細', () => {
      mockUsePathname.mockReturnValue('/admin/users/12345');
      const { result } = renderHook(() => useBreadcrumbs());

      const lastItem = result.current[result.current.length - 1];
      expect(lastItem.label).toBe('詳細');
    });

    it('should label UUID-like IDs as 詳細', () => {
      mockUsePathname.mockReturnValue('/admin/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      const { result } = renderHook(() => useBreadcrumbs());

      const lastItem = result.current[result.current.length - 1];
      expect(lastItem.label).toBe('詳細');
    });
  });
});
