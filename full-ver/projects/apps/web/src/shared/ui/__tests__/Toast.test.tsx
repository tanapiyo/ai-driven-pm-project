/**
 * @what Toast 通知システムのユニットテスト
 * @why トースト表示・消去・バリアント・スタック動作を検証
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

function TestConsumer({ variant, message }: { variant?: string; message?: string }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          message: message ?? 'Test notification',
          variant: (variant as 'success' | 'error' | 'warning' | 'info') ?? 'info',
        })
      }
    >
      Show Toast
    </button>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('useToast', () => {
    it('should throw when used outside ToastProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(<TestConsumer />)).toThrow(
        'useToast must be used within a ToastProvider'
      );
      spy.mockRestore();
    });
  });

  describe('rendering', () => {
    it('should render a toast with the given message', () => {
      render(
        <ToastProvider>
          <TestConsumer message="Save successful" variant="success" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Save successful')).toBeDefined();
    });

    it('should render success variant', () => {
      render(
        <ToastProvider>
          <TestConsumer variant="success" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      const toast = screen.getByRole('status');
      expect(toast.className).toContain('bg-green-50');
    });

    it('should render error variant', () => {
      render(
        <ToastProvider>
          <TestConsumer variant="error" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      const toast = screen.getByRole('status');
      expect(toast.className).toContain('bg-red-50');
    });

    it('should render warning variant', () => {
      render(
        <ToastProvider>
          <TestConsumer variant="warning" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      const toast = screen.getByRole('status');
      expect(toast.className).toContain('bg-amber-50');
    });

    it('should render info variant', () => {
      render(
        <ToastProvider>
          <TestConsumer variant="info" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      const toast = screen.getByRole('status');
      expect(toast.className).toContain('bg-blue-50');
    });
  });

  describe('auto-dismiss', () => {
    it('should start removing toast after 5 seconds', () => {
      render(
        <ToastProvider>
          <TestConsumer message="Will disappear" variant="info" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Will disappear')).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const toast = screen.getByRole('status');
      expect(toast.className).toContain('opacity-0');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Will disappear')).toBeNull();
    });
  });

  describe('manual close', () => {
    it('should remove toast when close button is clicked', () => {
      render(
        <ToastProvider>
          <TestConsumer message="Close me" variant="success" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Close me')).toBeDefined();

      fireEvent.click(screen.getByLabelText('通知を閉じる'));

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Close me')).toBeNull();
    });
  });

  describe('stack display', () => {
    it('should display multiple toasts simultaneously', () => {
      function MultiToastConsumer() {
        const { toast } = useToast();
        return (
          <>
            <button
              type="button"
              onClick={() => toast({ message: 'First toast', variant: 'success' })}
            >
              First
            </button>
            <button
              type="button"
              onClick={() => toast({ message: 'Second toast', variant: 'error' })}
            >
              Second
            </button>
          </>
        );
      }

      render(
        <ToastProvider>
          <MultiToastConsumer />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('First'));
      fireEvent.click(screen.getByText('Second'));

      expect(screen.getByText('First toast')).toBeDefined();
      expect(screen.getByText('Second toast')).toBeDefined();

      const statuses = screen.getAllByRole('status');
      expect(statuses.length).toBe(2);
    });
  });

  describe('accessibility', () => {
    it('should have role="status" and aria-live="polite"', () => {
      render(
        <ToastProvider>
          <TestConsumer variant="info" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      const toast = screen.getByRole('status');
      expect(toast.getAttribute('aria-live')).toBe('polite');
    });

    it('should have an accessible close button', () => {
      render(
        <ToastProvider>
          <TestConsumer variant="info" />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      const closeButton = screen.getByLabelText('通知を閉じる');
      expect(closeButton).toBeDefined();
    });
  });
});
