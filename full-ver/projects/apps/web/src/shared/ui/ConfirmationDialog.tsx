'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
const DANGER_CONFIRMATION_WORD = '確認';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  );
}

export interface ConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
}

export function ConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
  variant,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [confirmationText, setConfirmationText] = useState('');

  const handleCancel = useCallback(() => {
    setConfirmationText('');
    onCancel();
  }, [onCancel]);

  const isDanger = variant === 'danger';
  const canConfirm = !isDanger || confirmationText.trim() === DANGER_CONFIRMATION_WORD;

  const handleConfirm = useCallback(() => {
    if (!canConfirm) {
      return;
    }
    void Promise.resolve(onConfirm()).catch(() => undefined);
  }, [canConfirm, onConfirm]);

  useEffect(() => {
    if (!open) {
      setConfirmationText('');
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
        handleCancel();
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
  }, [handleCancel, open]);

  if (!open) {
    return null;
  }

  const confirmButtonClassName = isDanger
    ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300 disabled:text-white dark:bg-red-500 dark:hover:bg-red-600 dark:focus-visible:ring-red-400 dark:disabled:bg-red-900/40 dark:disabled:text-red-200/80'
    : 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500 disabled:bg-amber-300 disabled:text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:focus-visible:ring-amber-400 dark:disabled:bg-amber-900/40 dark:disabled:text-amber-200/80';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 dark:bg-neutral-950/70 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl outline-none dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 dark:focus-visible:ring-primary-400"
            aria-label="ダイアログを閉じる"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p
            id={descriptionId}
            className="whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300"
          >
            {message}
          </p>

          {isDanger && (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                続行するには「{DANGER_CONFIRMATION_WORD}」と入力してください。
              </p>
              <input
                type="text"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder={DANGER_CONFIRMATION_WORD}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-red-400 dark:focus:ring-red-400/30"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-primary-400"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${confirmButtonClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
