/**
 * @layer features
 * @segment admin-users
 * @what Admin User Table Component
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/shared/ui';
import type { AdminUser, UserRole, UserStatus } from '../api/types';

interface AdminUserTableProps {
  users: AdminUser[];
  isLoading?: boolean;
  onEdit?: (user: AdminUser) => void;
  onDeactivate?: (user: AdminUser) => void | Promise<void>;
  onDelete?: (user: AdminUser) => void | Promise<void>;
}

type DestructiveAction = 'deactivate' | 'delete';

interface PendingAction {
  type: DestructiveAction;
  user: AdminUser;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300';
    case 'user':
      return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
    default:
      return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '管理者';
    case 'user':
      return 'ユーザー';
    default:
      return role;
  }
}

function getStatusBadgeColor(status: UserStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'inactive':
      return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400';
    default:
      return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
  }
}

function getStatusLabel(status: UserStatus): string {
  switch (status) {
    case 'active':
      return '有効';
    case 'inactive':
      return '無効';
    default:
      return status;
  }
}

export function AdminUserTable({
  users,
  isLoading,
  onEdit,
  onDeactivate,
  onDelete,
}: AdminUserTableProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const confirmationConfig = useMemo(() => {
    if (!pendingAction) {
      return null;
    }

    if (pendingAction.type === 'delete') {
      return {
        title: 'ユーザー削除の確認',
        message: `「${pendingAction.user.displayName}」を削除しますか？この操作は取り消せません。`,
        confirmLabel: isActionSubmitting ? '削除中...' : '削除',
      };
    }

    return {
      title: 'ユーザー無効化の確認',
      message: `「${pendingAction.user.displayName}」を無効化しますか？`,
      confirmLabel: isActionSubmitting ? '無効化中...' : '無効化',
    };
  }, [isActionSubmitting, pendingAction]);

  const handleCancelDestructiveAction = useCallback(() => {
    if (isActionSubmitting) {
      return;
    }
    setPendingAction(null);
  }, [isActionSubmitting]);

  const handleConfirmDestructiveAction = useCallback(async () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction.type === 'delete' ? onDelete : onDeactivate;
    if (!action) {
      setPendingAction(null);
      return;
    }

    setIsActionSubmitting(true);
    try {
      await action(pendingAction.user);
      setPendingAction(null);
    } catch {
      // Keep dialog open so user can retry after the caller reports the error.
    } finally {
      setIsActionSubmitting(false);
    }
  }, [onDeactivate, onDelete, pendingAction]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-neutral-200" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
        ユーザーがいません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              ユーザー
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              ロール
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              作成日
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              アクション
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {user.displayName}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {user.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(user.status)}`}
                >
                  {getStatusLabel(user.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                {formatTimestamp(user.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit?.(user)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mr-4"
                >
                  編集
                </button>
                {user.status === 'active' && (
                  <button
                    onClick={() => setPendingAction({ type: 'deactivate', user })}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    無効化
                  </button>
                )}
                {user.status === 'inactive' && onDelete && (
                  <button
                    onClick={() => setPendingAction({ type: 'delete', user })}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    削除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirmationConfig && (
        <ConfirmationDialog
          open={pendingAction !== null}
          onConfirm={handleConfirmDestructiveAction}
          onCancel={handleCancelDestructiveAction}
          title={confirmationConfig.title}
          message={confirmationConfig.message}
          confirmLabel={confirmationConfig.confirmLabel}
          variant="danger"
        />
      )}
    </div>
  );
}
