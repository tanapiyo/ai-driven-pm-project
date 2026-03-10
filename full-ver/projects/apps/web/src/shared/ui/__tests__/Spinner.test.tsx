/**
 * @what Spinner コンポーネントのユニットテスト
 * @why スピナーバリアント・サイズ・アクセシビリティ・クラス適用を検証
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, PageSpinner, InlineSpinner, ButtonSpinner } from '../Spinner';

describe('Spinner', () => {
  describe('Spinner (unified)', () => {
    it('should render inline variant by default', () => {
      render(<Spinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('animate-spin');
    });

    it('should render page variant when variant="page"', () => {
      const { container } = render(<Spinner variant="page" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('min-h-screen');
    });

    it('should render button variant when variant="button"', () => {
      render(<Spinner variant="button" />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('w-4');
    });

    it('should use custom label', () => {
      render(<Spinner label="カスタムラベル" />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('カスタムラベル');
    });
  });

  describe('PageSpinner', () => {
    it('should render with min-h-screen wrapper', () => {
      const { container } = render(<PageSpinner />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('min-h-screen');
      expect(wrapper.tagName).toBe('DIV');
    });

    it('should have role="status" on spinner element', () => {
      render(<PageSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('animate-spin');
    });

    it('should show loading text', () => {
      render(<PageSpinner label="読み込み中..." />);
      expect(screen.getByText('読み込み中...')).toBeTruthy();
    });

    it('should use large spinner size', () => {
      render(<PageSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('w-12');
      expect(el.className).toContain('h-12');
    });

    it('should apply animate-spin class', () => {
      render(<PageSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('animate-spin');
    });

    it('should apply primary color classes', () => {
      render(<PageSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('border-primary-500');
    });

    it('should apply dark mode color classes', () => {
      render(<PageSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('dark:border-primary-400');
    });

    it('should accept additional className', () => {
      const { container } = render(<PageSpinner className="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('my-custom-class');
    });
  });

  describe('InlineSpinner', () => {
    it('should render with role="status"', () => {
      render(<InlineSpinner />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('読み込み中...');
    });

    it('should apply default medium size', () => {
      render(<InlineSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('w-8');
      expect(el.className).toContain('h-8');
    });

    it('should apply small size when size="sm"', () => {
      render(<InlineSpinner size="sm" />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('w-4');
      expect(el.className).toContain('h-4');
    });

    it('should apply large size when size="lg"', () => {
      render(<InlineSpinner size="lg" />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('w-12');
      expect(el.className).toContain('h-12');
    });

    it('should apply animate-spin class', () => {
      render(<InlineSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('animate-spin');
    });

    it('should use default aria-label', () => {
      render(<InlineSpinner />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('読み込み中...');
    });

    it('should use custom aria-label', () => {
      render(<InlineSpinner label="保存中..." />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('保存中...');
    });

    it('should accept additional className', () => {
      const { container } = render(<InlineSpinner className="py-4" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('py-4');
    });
  });

  describe('ButtonSpinner', () => {
    it('should render with role="status"', () => {
      render(<ButtonSpinner />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('処理中...');
    });

    it('should apply small size', () => {
      render(<ButtonSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('w-4');
      expect(el.className).toContain('h-4');
    });

    it('should apply animate-spin class', () => {
      render(<ButtonSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('animate-spin');
    });

    it('should use default aria-label for button context', () => {
      render(<ButtonSpinner />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('処理中...');
    });

    it('should use custom aria-label', () => {
      render(<ButtonSpinner label="送信中..." />);
      const el = screen.getByRole('status');
      expect(el.getAttribute('aria-label')).toBe('送信中...');
    });

    it('should render inline', () => {
      render(<ButtonSpinner />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('inline-block');
    });

    it('should accept additional className', () => {
      render(<ButtonSpinner className="ml-2" />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('ml-2');
    });
  });
});
