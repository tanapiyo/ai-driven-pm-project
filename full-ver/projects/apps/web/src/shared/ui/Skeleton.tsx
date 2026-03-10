/**
 * @layer shared
 * @segment ui
 * @what スケルトンローディングコンポーネント - コンテンツプレースホルダー
 * @why データ読み込み中に統一されたプレースホルダーを表示し、レイアウトシフトを防止する
 */

import React from 'react';
import { cn } from '@/shared/lib';

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
}

/** ベーススケルトン - 任意の形状に使用可能 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-neutral-200 dark:bg-neutral-700', className)}
      aria-hidden="true"
    />
  );
}

interface SkeletonTableProps {
  /** テーブル行数 */
  rows?: number;
  /** テーブル列数 */
  columns?: number;
  /** Additional CSS classes */
  className?: string;
}

/** テーブル行スケルトン - テーブルリストのプレースホルダー */
export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('w-full space-y-2', className)} role="status" aria-label="読み込み中">
      {/* ヘッダー行 */}
      <div className="flex gap-4 px-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`header-${colIndex}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* データ行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 px-4 py-3 bg-white dark:bg-neutral-800 rounded-md border border-neutral-100 dark:border-neutral-700"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  /** Additional CSS classes */
  className?: string;
}

/** カードスケルトン - カード形式コンテンツのプレースホルダー */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 space-y-4',
        className
      )}
      role="status"
      aria-label="読み込み中"
    >
      {/* アバター/サムネイル */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {/* コンテンツ行 */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      {/* フッター */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

interface SkeletonDetailProps {
  /** Additional CSS classes */
  className?: string;
}

/** 詳細画面スケルトン - 詳細ページのプレースホルダー */
export function SkeletonDetail({ className }: SkeletonDetailProps) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="読み込み中">
      {/* ヘッダーセクション */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* サイドバー */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        {/* メインエリア */}
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
