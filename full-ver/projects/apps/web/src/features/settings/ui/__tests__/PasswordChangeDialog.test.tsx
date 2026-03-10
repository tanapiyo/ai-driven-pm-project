/**
 * @what PasswordChangeDialog コンポーネントのユニットテスト
 * @why ダイアログの開閉とアクセシビリティが正しく動作することを検証
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordChangeDialog } from '../PasswordChangeDialog';

vi.mock('@/features/profile', () => ({
  PasswordChangeForm: () => <div data-testid="password-change-form">パスワード変更フォーム</div>,
}));

describe('PasswordChangeDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('パスワードの変更')).toBeDefined();
    });

    it('should not render when isOpen is false', () => {
      render(<PasswordChangeDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when close button is clicked', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const closeButton = screen.getByLabelText('閉じる');
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const backdrop = document.querySelector('.flex.min-h-screen');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when dialog content is clicked', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const dialogContent = screen.getByText('パスワードの変更');
      fireEvent.click(dialogContent);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have role="dialog"', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('should have aria-modal="true"', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby pointing to the title', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-labelledby')).toBe('password-change-dialog-title');

      const title = document.getElementById('password-change-dialog-title');
      expect(title).toBeDefined();
      expect(title?.textContent).toBe('パスワードの変更');
    });

    it('should have accessible close button', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      const closeButton = screen.getByLabelText('閉じる');
      expect(closeButton).toBeDefined();
    });
  });

  describe('form integration', () => {
    it('should render PasswordChangeForm inside the dialog', () => {
      render(<PasswordChangeDialog {...defaultProps} />);

      expect(screen.getByTestId('password-change-form')).toBeDefined();
    });
  });
});
