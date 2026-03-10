/**
 * @layer features
 * @segment settings
 * @what Password change dialog using existing PasswordChangeForm
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { PasswordChangeForm } from '@/features/profile';
import { dictionary } from '@/shared/lib';

const passwordChange = dictionary.settings.passwordChange;

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordChangeDialog({ isOpen, onClose }: PasswordChangeDialogProps) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsDirty(false);
    }
  }, [isOpen]);

  const handleAttemptClose = useCallback(() => {
    if (isDirty && !window.confirm(passwordChange.unsavedChangesConfirm)) {
      return;
    }
    setIsDirty(false);
    onClose();
  }, [isDirty, onClose]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleAttemptClose();
      }
    },
    [handleAttemptClose]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        handleAttemptClose();
      }
    },
    [handleAttemptClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="password-change-dialog-title"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div
        className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0"
        onClick={handleBackdropClick}
      >
        <div className="fixed inset-0 bg-neutral-500 dark:bg-neutral-500 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2
              id="password-change-dialog-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {passwordChange.title}
            </h2>
            <button
              type="button"
              onClick={handleAttemptClose}
              className="rounded-md p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-500 dark:hover:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={passwordChange.closeButton}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="px-6 py-4" onChangeCapture={() => setIsDirty(true)}>
            <PasswordChangeForm
              onDirtyChange={setIsDirty}
              onSuccess={() => {
                setIsDirty(false);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
