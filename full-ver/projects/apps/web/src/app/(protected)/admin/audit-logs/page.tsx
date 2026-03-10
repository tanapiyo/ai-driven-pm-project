/**
 * @layer app
 * @what Audit Logs Page (Admin role)
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  useAuditLogs,
  AuditLogTable,
  AuditLogFilter,
  type AuditLogFilters,
} from '@/features/audit';
import { Pagination, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/shared/ui';

export default function AuditLogsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<AuditLogFilters>(() => {
    const pageRaw = Number(searchParams.get('page'));
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, 10_000) : 1;
    const limitRaw = Number(searchParams.get('limit'));
    const limit = (PAGE_SIZE_OPTIONS as readonly number[]).includes(limitRaw)
      ? (limitRaw as PageSizeOption)
      : DEFAULT_PAGE_SIZE;
    return { page, limit };
  });

  const { data, isLoading, error } = useAuditLogs(filters);

  const handleFilterChange = useCallback(
    (newFilters: AuditLogFilters) => {
      setFilters(newFilters);
      const params = new URLSearchParams(searchParams.toString());
      if ((newFilters.page ?? 1) > 1) {
        params.set('page', String(newFilters.page));
      } else {
        params.delete('page');
      }
      if (newFilters.limit !== DEFAULT_PAGE_SIZE) {
        params.set('limit', String(newFilters.limit));
      } else {
        params.delete('limit');
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setFilters((prev) => ({ ...prev, page }));
      const params = new URLSearchParams(searchParams.toString());
      if (page > 1) {
        params.set('page', String(page));
      } else {
        params.delete('page');
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router]
  );

  const handleLimitChange = useCallback(
    (limit: PageSizeOption) => {
      setFilters((prev) => ({ ...prev, limit, page: 1 }));
      const params = new URLSearchParams(searchParams.toString());
      if (limit !== DEFAULT_PAGE_SIZE) {
        params.set('limit', String(limit));
      } else {
        params.delete('limit');
      }
      params.delete('page');
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router]
  );

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">エラー</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-400">
              {error instanceof Error ? error.message : '監査ログの取得に失敗しました'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">監査ログ</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          システム内のすべての重要な操作履歴を確認できます
        </p>
      </div>

      <AuditLogFilter filters={filters} onFilterChange={handleFilterChange} />

      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg">
        <AuditLogTable logs={data?.data ?? []} isLoading={isLoading} />

        {data?.pagination && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </div>
    </div>
  );
}
