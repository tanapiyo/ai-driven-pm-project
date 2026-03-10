/**
 * @layer shared
 * @segment ui
 * @what 汎用ページネーションコンポーネント
 */

'use client';

import React, { useCallback } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSizeOption = 20;

export interface PaginationProps {
  /** 現在のページ番号 (1 始まり) */
  page: number;
  /** 総ページ数 */
  totalPages: number;
  /** 総件数 */
  total: number;
  /** 1 ページあたりの表示件数 */
  limit: number;
  /** ページ変更コールバック */
  onPageChange?: (page: number) => void;
  /** 件数変更コールバック */
  onLimitChange?: (limit: PageSizeOption) => void;
}

function getVisiblePages(page: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const showEllipsis = totalPages > 7;

  if (!showEllipsis) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else if (page <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (page >= totalPages - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = page - 1; i <= page + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page) return;
      onPageChange?.(newPage);
    },
    [page, totalPages, onPageChange]
  );

  const handleLimitChange = useCallback(
    (newLimit: PageSizeOption) => {
      onLimitChange?.(newLimit);
    },
    [onLimitChange]
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex flex-col gap-2 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      aria-label="ページネーション"
    >
      {/* 件数情報と件数選択 */}
      <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
        <span>
          全 {total} 件中{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {startItem}–{endItem}
          </span>{' '}
          件を表示
        </span>

        <label className="flex items-center gap-1.5">
          <span className="sr-only">表示件数</span>
          <select
            value={limit}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (PAGE_SIZE_OPTIONS.includes(value as PageSizeOption)) {
                handleLimitChange(value as PageSizeOption);
              }
            }}
            className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm py-0.5 pl-2 pr-7 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-offset-1 dark:focus:ring-offset-neutral-900"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} 件
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ページナビゲーション */}
      <div className="flex items-center">
        {/* モバイル: 前/次のみ */}
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="relative inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>

        {/* デスクトップ: ページ番号付き */}
        <div className="hidden sm:block">
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="ページ番号"
          >
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              aria-label="前のページ"
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-neutral-400 dark:text-neutral-500 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:z-20 focus:outline-offset-0 dark:focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">前へ</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {getVisiblePages(page, totalPages).map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`ページ ${p}`}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    p === page
                      ? 'z-10 bg-primary-600 dark:bg-primary-500 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:focus-visible:outline-primary-400'
                      : 'text-neutral-900 dark:text-neutral-100 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:z-20 focus:outline-offset-0 dark:focus:ring-offset-neutral-900'
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span
                  key={`ellipsis-${idx}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-600"
                >
                  {p}
                </span>
              )
            )}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="次のページ"
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-neutral-400 dark:text-neutral-500 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:z-20 focus:outline-offset-0 dark:focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">次へ</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </nav>
  );
}
