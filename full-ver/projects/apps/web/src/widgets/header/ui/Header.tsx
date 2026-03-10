/**
 * @layer widgets
 * @segment header
 * @what ヘッダー UI コンポーネント
 * @why ページタイトルやパンくずリストを表示
 */
'use client';

import { useCurrentUser } from '@/features/auth';
import { Breadcrumb } from '@/shared/ui';
import { useBreadcrumbs } from '@/shared/hooks';

/** ヘッダーの固定高さ（サイドバーロゴ部分と統一） */
const HEADER_HEIGHT_PX = 61;

export function Header() {
  useCurrentUser();
  const breadcrumbItems = useBreadcrumbs();

  return (
    <header
      className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex flex-col"
      style={{ height: `${HEADER_HEIGHT_PX}px` }}
    >
      {/* メインヘッダーコンテンツ */}
      <div className="flex-1 flex items-center justify-between px-6">
        <Breadcrumb items={breadcrumbItems} />
        <div>{/* グローバルアクション（通知など）を配置可能 */}</div>
      </div>
    </header>
  );
}
