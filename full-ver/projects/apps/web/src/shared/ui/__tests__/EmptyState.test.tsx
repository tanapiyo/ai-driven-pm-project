/**
 * @what EmptyState コンポーネントのユニットテスト
 * @why バリアント・スロット・アクセシビリティ動作を検証する
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('preset variants', () => {
    it('renders no-data preset by default', () => {
      render(<EmptyState />);
      expect(screen.getByText('データがありません')).toBeDefined();
      expect(
        screen.getByText('まだデータが登録されていません。新しいデータを追加してください。')
      ).toBeDefined();
    });

    it('renders no-results preset', () => {
      render(<EmptyState variant="no-results" />);
      expect(screen.getByText('検索結果がありません')).toBeDefined();
      expect(
        screen.getByText('別のキーワードで検索するか、検索条件を変更してください。')
      ).toBeDefined();
    });

    it('renders no-filter-results preset', () => {
      render(<EmptyState variant="no-filter-results" />);
      expect(screen.getByText('フィルタ結果がありません')).toBeDefined();
      expect(
        screen.getByText(
          'フィルタ条件に一致するデータが見つかりませんでした。条件を変更してください。'
        )
      ).toBeDefined();
    });
  });

  describe('prop overrides', () => {
    it('overrides message with custom text', () => {
      render(<EmptyState message="カスタムメッセージ" />);
      expect(screen.getByText('カスタムメッセージ')).toBeDefined();
    });

    it('overrides subMessage with custom text', () => {
      render(<EmptyState subMessage="カスタム補足メッセージ" />);
      expect(screen.getByText('カスタム補足メッセージ')).toBeDefined();
    });

    it('accepts a custom Lucide icon', () => {
      const { container } = render(<EmptyState icon={Inbox} />);
      // Lucide renders an svg element
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });

  describe('action slot', () => {
    it('renders action button when action prop is provided', () => {
      const handleClick = vi.fn();
      render(<EmptyState action={{ label: 'データを追加', onClick: handleClick }} />);
      const button = screen.getByRole('button', { name: 'データを追加' });
      expect(button).toBeDefined();
    });

    it('calls action.onClick when button is clicked', () => {
      const handleClick = vi.fn();
      render(<EmptyState action={{ label: 'データを追加', onClick: handleClick }} />);
      fireEvent.click(screen.getByRole('button', { name: 'データを追加' }));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('renders secondary action button variant', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState action={{ label: '閉じる', onClick: handleClick, variant: 'secondary' }} />
      );
      const button = screen.getByRole('button', { name: '閉じる' });
      expect(button.className).toContain('border');
    });

    it('renders children when no action prop is provided', () => {
      render(
        <EmptyState>
          <span data-testid="custom-child">カスタムアクション</span>
        </EmptyState>
      );
      expect(screen.getByTestId('custom-child')).toBeDefined();
    });

    it('action prop takes precedence over children', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState action={{ label: 'アクション', onClick: handleClick }}>
          <span data-testid="custom-child">カスタムアクション</span>
        </EmptyState>
      );
      expect(screen.getByRole('button', { name: 'アクション' })).toBeDefined();
      expect(screen.queryByTestId('custom-child')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has role="region" for screen reader announcement', () => {
      render(<EmptyState />);
      const status = screen.getByRole('region');
      expect(status).toBeDefined();
    });

    it('has aria-label set to the displayed message', () => {
      render(<EmptyState message="テストメッセージ" />);
      const status = screen.getByRole('region');
      expect(status.getAttribute('aria-label')).toBe('テストメッセージ');
    });

    it('aria-label uses preset message when no message prop given', () => {
      render(<EmptyState variant="no-results" />);
      const status = screen.getByRole('region');
      expect(status.getAttribute('aria-label')).toBe('検索結果がありません');
    });
  });

  describe('className prop', () => {
    it('applies additional className', () => {
      render(<EmptyState className="my-custom-class" />);
      const status = screen.getByRole('region');
      expect(status.className).toContain('my-custom-class');
    });
  });

  describe('public API export', () => {
    it('is exported from shared/ui barrel', async () => {
      const barrel = await import('../index');
      expect(barrel.EmptyState).toBeDefined();
    });
  });
});
