'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      if (element.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      return true;
    }
  );
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  isDirty?: boolean;
}

export function Dialog({ open, onClose, title, children, isDirty = false }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm('変更が保存されていません。閉じてもよろしいですか？')) {
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialogElement = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitialElement = () => {
      const focusableElements = getFocusableElements(dialogElement);
      const firstFocusable = focusableElements[0];
      (firstFocusable ?? dialogElement)?.focus();
    };

    focusInitialElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogElement) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (activeElement === dialogElement) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus();
        return;
      }

      if (!(activeElement instanceof HTMLElement) || !dialogElement.contains(activeElement)) {
        event.preventDefault();
        firstFocusable.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, requestClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 dark:bg-neutral-950/70 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-full sm:max-w-2xl overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white shadow-xl outline-none dark:bg-neutral-800"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-md p-2 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-200 dark:focus-visible:ring-primary-400"
            aria-label="ダイアログを閉じる"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4 text-neutral-700 dark:text-neutral-300">
          {children}
        </div>
      </div>
    </div>
  );
}
