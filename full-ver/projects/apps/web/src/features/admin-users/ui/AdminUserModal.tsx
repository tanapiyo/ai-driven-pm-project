/**
 * @layer features
 * @segment admin-users
 * @what Admin User Modal Component
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminUserForm } from './AdminUserForm';
import type { AdminUser, CreateAdminUserRequest, UpdateAdminUserRequest } from '../api/types';

interface AdminUserModalProps {
  isOpen: boolean;
  user?: AdminUser;
  onClose: () => void;
  onSubmit: (data: CreateAdminUserRequest | UpdateAdminUserRequest) => void;
  isLoading?: boolean;
  error?: string;
}

export function AdminUserModal({
  isOpen,
  user,
  onClose,
  onSubmit,
  isLoading,
  error,
}: AdminUserModalProps) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(false);
  }, [isOpen]);

  const handleAttemptClose = useCallback(() => {
    if (isDirty && !window.confirm('変更が保存されていません。閉じてもよろしいですか？')) {
      return;
    }
    setIsDirty(false);
    onClose();
  }, [isDirty, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleAttemptClose();
      }
    },
    [handleAttemptClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0"
        onClick={handleBackdropClick}
      >
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 transition-opacity" />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white dark:bg-neutral-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <h3
              className="text-lg font-semibold leading-6 text-neutral-900 dark:text-neutral-100 mb-4"
              id="modal-title"
            >
              {user ? 'ユーザー編集' : '新規ユーザー作成'}
            </h3>
            <div onChangeCapture={() => setIsDirty(true)}>
              <AdminUserForm
                user={user}
                onSubmit={onSubmit}
                onCancel={handleAttemptClose}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
