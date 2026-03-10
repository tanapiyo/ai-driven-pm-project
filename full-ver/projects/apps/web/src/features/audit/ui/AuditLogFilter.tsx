/**
 * @layer features
 * @segment audit
 * @what Audit Log Filter Component
 */

'use client';

import { useState } from 'react';
import type { AuditLogFilters, AuditEntityType, AuditAction } from '../api/types';

interface AuditLogFilterProps {
  filters: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
}

const ENTITY_TYPES: AuditEntityType[] = ['User'];
const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'authorization_denied'];

export function AuditLogFilter({ filters, onFilterChange }: AuditLogFilterProps) {
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters);

  const handleChange = (key: keyof AuditLogFilters, value: string) => {
    const newFilters = {
      ...localFilters,
      [key]: value || undefined,
    };
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFilterChange({ ...localFilters, page: 1 });
  };

  const handleReset = () => {
    const resetFilters: AuditLogFilters = { page: 1, limit: 20 };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            対象エンティティ
          </label>
          <select
            className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-neutral-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm"
            value={localFilters.entityType || ''}
            onChange={(e) => handleChange('entityType', e.target.value)}
          >
            <option value="">すべて</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            アクション
          </label>
          <select
            className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-neutral-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm"
            value={localFilters.action || ''}
            onChange={(e) => handleChange('action', e.target.value)}
          >
            <option value="">すべて</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            開始日
          </label>
          <input
            type="datetime-local"
            className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-neutral-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm"
            value={localFilters.startDate || ''}
            onChange={(e) =>
              handleChange(
                'startDate',
                e.target.value ? new Date(e.target.value).toISOString() : ''
              )
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            終了日
          </label>
          <input
            type="datetime-local"
            className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-neutral-100 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm"
            value={localFilters.endDate || ''}
            onChange={(e) =>
              handleChange('endDate', e.target.value ? new Date(e.target.value).toISOString() : '')
            }
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400"
        >
          リセット
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 border border-transparent rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400"
        >
          適用
        </button>
      </div>
    </div>
  );
}
