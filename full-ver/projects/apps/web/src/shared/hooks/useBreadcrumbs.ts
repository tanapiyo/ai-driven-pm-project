/**
 * @layer shared
 * @segment hooks
 * @what パス名からブレッドクラム項目を自動生成するフック
 */

'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { BreadcrumbItem } from '@/shared/ui';
import { dictionary } from '@/shared/lib';

const bc = dictionary.navigation.breadcrumb;

/**
 * セグメントのラベルマッピング（パス → 表示名）
 */
const SEGMENT_LABELS: Record<string, string> = {
  // Top-level routes
  dashboard: bc.dashboard,
  admin: bc.admin,
  settings: bc.settings,
  profile: bc.profile,
  // Sub-routes
  new: bc.new,
  edit: bc.edit,
  account: bc.account,
  appearance: bc.appearance,
  users: bc.users,
  'audit-logs': bc.auditLogs,
};

/**
 * 動的セグメント（[id] など）のフォールバックラベル
 */
function getDynamicSegmentLabel(segment: string): string {
  // If it looks like a UUID or numeric ID, return a generic label
  if (/^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment)) {
    return bc.dynamicDetail;
  }
  return segment;
}

/**
 * パス名からブレッドクラム項目を生成する
 *
 * - 先頭は常に「ホーム」(href: '/')
 * - セグメントを順番に解析してラベルとパスを生成
 * - 最後の項目は href なし（現在ページ）
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    // Always start with Home
    const items: BreadcrumbItem[] = [{ label: bc.home, href: '/' }];

    // Skip root path - only show "ホーム"
    if (pathname === '/') {
      return [{ label: bc.home }];
    }

    // Split pathname into segments and filter out empty strings
    const segments = pathname.split('/').filter(Boolean);

    // Build breadcrumb items from segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = SEGMENT_LABELS[segment] ?? getDynamicSegmentLabel(segment);
      const isLast = index === segments.length - 1;

      items.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    });

    return items;
  }, [pathname]);
}
