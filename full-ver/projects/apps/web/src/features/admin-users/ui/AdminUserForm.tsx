/**
 * @layer features
 * @segment admin-users
 * @what Admin User Form Component (Create/Edit)
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  AdminUser,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  UserRole,
  UserStatus,
} from '../api/types';

interface AdminUserFormProps {
  user?: AdminUser;
  onSubmit: (data: CreateAdminUserRequest | UpdateAdminUserRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'ユーザー' },
  { value: 'admin', label: '管理者' },
];

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: 'active', label: '有効' },
  { value: 'inactive', label: '無効' },
];

export function AdminUserForm({ user, onSubmit, onCancel, isLoading, error }: AdminUserFormProps) {
  const isEdit = !!user;

  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'user');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'active');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (isEdit) {
        const data: UpdateAdminUserRequest = {
          displayName,
          role,
          status,
        };
        onSubmit(data);
      } else {
        const data: CreateAdminUserRequest = {
          email,
          password,
          displayName,
          role,
        };
        onSubmit(data);
      }
    },
    [isEdit, email, password, displayName, role, status, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {!isEdit && (
        <>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              メールアドレス <span className="text-primary-700 dark:text-primary-400">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              パスワード <span className="text-primary-700 dark:text-primary-400">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
            />
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">8文字以上</p>
          </div>
        </>
      )}

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          表示名 <span className="text-primary-700 dark:text-primary-400">*</span>
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
        />
      </div>

      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          ロール <span className="text-primary-700 dark:text-primary-400">*</span>
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isEdit && (
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            ステータス
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="mt-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-offset-2"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? '保存中...' : isEdit ? '更新' : '作成'}
        </button>
      </div>
    </form>
  );
}
