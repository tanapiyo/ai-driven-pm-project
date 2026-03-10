/**
 * @layer features
 * @segment admin-users
 * @what Admin User Filter Component
 */

'use client';

import { useState, useCallback } from 'react';
import type { AdminUserFilters, UserRole, UserStatus } from '../api/types';

interface AdminUserFilterProps {
  filters: AdminUserFilters;
  onFilterChange: (filters: AdminUserFilters) => void;
}

const roleOptions: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'すべてのロール' },
  { value: 'admin', label: '管理者' },
  { value: 'user', label: 'ユーザー' },
];

const statusOptions: { value: UserStatus | ''; label: string }[] = [
  { value: '', label: 'すべてのステータス' },
  { value: 'active', label: '有効' },
  { value: 'inactive', label: '無効' },
];

export function AdminUserFilter({ filters, onFilterChange }: AdminUserFilterProps) {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onFilterChange({ ...filters, search: search || undefined, page: 1 });
    },
    [filters, onFilterChange, search]
  );

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as UserRole | '';
      onFilterChange({ ...filters, role: value || undefined, page: 1 });
    },
    [filters, onFilterChange]
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as UserStatus | '';
      onFilterChange({ ...filters, status: value || undefined, page: 1 });
    },
    [filters, onFilterChange]
  );

  return (
    <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-2">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            検索
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前またはメールで検索..."
              className="flex-1 block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            >
              検索
            </button>
          </div>
        </form>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            ロール
          </label>
          <select
            id="role"
            value={filters.role || ''}
            onChange={handleRoleChange}
            className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            ステータス
          </label>
          <select
            id="status"
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
