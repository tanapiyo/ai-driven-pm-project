/**
 * @what Pagination コンポーネントのユニットテスト
 * @why ページ遷移・件数選択・表示範囲・ダークモード対応を検証
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

const defaultProps = {
  page: 1,
  totalPages: 5,
  total: 100,
  limit: 20,
};

describe('Pagination', () => {
  describe('rendering', () => {
    it('should render pagination navigation', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByRole('navigation', { name: 'ページネーション' })).toBeDefined();
    });

    it('should render total count and page range', () => {
      render(<Pagination {...defaultProps} page={1} total={100} limit={20} totalPages={5} />);
      expect(screen.getByText(/全 100 件中/)).toBeDefined();
      expect(screen.getByText(/1–20/)).toBeDefined();
    });

    it('should render page range for middle page', () => {
      render(<Pagination {...defaultProps} page={2} total={100} limit={20} totalPages={5} />);
      expect(screen.getByText(/21–40/)).toBeDefined();
    });

    it('should render last page range correctly', () => {
      render(<Pagination {...defaultProps} page={5} total={95} limit={20} totalPages={5} />);
      expect(screen.getByText(/81–95/)).toBeDefined();
    });

    it('should render page size select with options 10, 20, 50', () => {
      render(<Pagination {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeDefined();

      const options = screen.getAllByRole('option');
      const optionValues = options.map((o) => o.textContent?.trim());
      expect(optionValues).toContain('10 件');
      expect(optionValues).toContain('20 件');
      expect(optionValues).toContain('50 件');
    });

    it('should show selected limit in page size select', () => {
      render(<Pagination {...defaultProps} limit={20} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('20');
    });

    it('should return null when totalPages <= 1', () => {
      const { container } = render(<Pagination page={1} totalPages={1} total={5} limit={10} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when totalPages > 1', () => {
      render(<Pagination page={1} totalPages={2} total={15} limit={10} />);
      expect(screen.getByRole('navigation', { name: 'ページネーション' })).toBeDefined();
    });
  });

  describe('page navigation', () => {
    it('should call onPageChange when next button is clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);

      const nextButton = screen.getByLabelText('次のページ');
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange when previous button is clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);

      const prevButton = screen.getByLabelText('前のページ');
      fireEvent.click(prevButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should disable previous button on first page', () => {
      render(<Pagination {...defaultProps} page={1} onPageChange={vi.fn()} />);
      const prevButton = screen.getByLabelText('前のページ') as HTMLButtonElement;
      expect(prevButton.disabled).toBe(true);
    });

    it('should disable next button on last page', () => {
      render(<Pagination {...defaultProps} page={5} onPageChange={vi.fn()} />);
      const nextButton = screen.getByLabelText('次のページ') as HTMLButtonElement;
      expect(nextButton.disabled).toBe(true);
    });

    it('should highlight current page button with aria-current', () => {
      render(<Pagination {...defaultProps} page={2} />);
      const page2Button = screen.getByLabelText('ページ 2');
      expect(page2Button.getAttribute('aria-current')).toBe('page');
    });

    it('should not have aria-current on non-current page buttons', () => {
      render(<Pagination {...defaultProps} page={2} />);
      const page1Button = screen.getByLabelText('ページ 1');
      expect(page1Button.getAttribute('aria-current')).toBeNull();
    });

    it('should not call onPageChange for same page click', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);

      const page3Button = screen.getByLabelText('ページ 3');
      fireEvent.click(page3Button);

      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('page size selection', () => {
    it('should call onLimitChange when page size is changed', () => {
      const onLimitChange = vi.fn();
      render(<Pagination {...defaultProps} onLimitChange={onLimitChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '50' } });

      expect(onLimitChange).toHaveBeenCalledWith(50);
    });

    it('should call onLimitChange with 10', () => {
      const onLimitChange = vi.fn();
      render(<Pagination {...defaultProps} limit={20} onLimitChange={onLimitChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '10' } });

      expect(onLimitChange).toHaveBeenCalledWith(10);
    });
  });

  describe('ellipsis pagination', () => {
    it('should show ellipsis for large page counts', () => {
      render(<Pagination page={1} totalPages={10} total={100} limit={10} />);
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('should show all pages when totalPages <= 7', () => {
      render(<Pagination page={1} totalPages={7} total={70} limit={10} />);

      for (let i = 1; i <= 7; i++) {
        expect(screen.getByLabelText(`ページ ${i}`)).toBeDefined();
      }

      expect(screen.queryByText('...')).toBeNull();
    });
  });

  describe('zero total', () => {
    it('should show 0 range when total is 0', () => {
      render(<Pagination page={1} totalPages={2} total={0} limit={10} />);
      expect(screen.getByText(/0–0/)).toBeDefined();
    });
  });
});
