/**
 * @what Skeleton コンポーネントのユニットテスト
 * @why スケルトンバリアント・アクセシビリティ・クラス適用を検証
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonTable, SkeletonCard, SkeletonDetail } from '../Skeleton';

describe('Skeleton', () => {
  describe('Skeleton (base)', () => {
    it('should render with animate-pulse class', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('animate-pulse');
    });

    it('should render with neutral background classes', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('bg-neutral-200');
      expect(el.className).toContain('dark:bg-neutral-700');
    });

    it('should accept additional className', () => {
      const { container } = render(<Skeleton className="h-4 w-full" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('h-4');
      expect(el.className).toContain('w-full');
    });

    it('should have aria-hidden for decorative skeleton', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('SkeletonTable', () => {
    it('should render with role="status" and default aria-label', () => {
      render(<SkeletonTable />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('読み込み中');
    });

    it('should render default 5 data rows', () => {
      const { container } = render(<SkeletonTable rows={5} columns={3} />);
      // ヘッダー1行 + データ5行 = 6行の子要素
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children.length).toBe(6);
    });

    it('should render custom row count', () => {
      const { container } = render(<SkeletonTable rows={3} columns={2} />);
      const wrapper = container.firstChild as HTMLElement;
      // ヘッダー1行 + データ3行 = 4行
      expect(wrapper.children.length).toBe(4);
    });

    it('should render correct column count in header row', () => {
      const { container } = render(<SkeletonTable rows={1} columns={4} />);
      const wrapper = container.firstChild as HTMLElement;
      const headerRow = wrapper.children[0] as HTMLElement;
      expect(headerRow.children.length).toBe(4);
    });

    it('should accept additional className', () => {
      const { container } = render(<SkeletonTable className="my-custom-class" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('my-custom-class');
    });
  });

  describe('SkeletonCard', () => {
    it('should render with role="status" and default aria-label', () => {
      render(<SkeletonCard />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('読み込み中');
    });

    it('should render with card surface classes', () => {
      const { container } = render(<SkeletonCard />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('bg-white');
      expect(el.className).toContain('dark:bg-neutral-800');
    });

    it('should accept additional className', () => {
      const { container } = render(<SkeletonCard className="col-span-2" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('col-span-2');
    });
  });

  describe('SkeletonDetail', () => {
    it('should render with role="status" and default aria-label', () => {
      render(<SkeletonDetail />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('読み込み中');
    });

    it('should accept additional className', () => {
      const { container } = render(<SkeletonDetail className="max-w-4xl" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('max-w-4xl');
    });

    it('should contain multiple skeleton elements', () => {
      const { container } = render(<SkeletonDetail />);
      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBeGreaterThan(3);
    });
  });
});
