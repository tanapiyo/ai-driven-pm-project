/**
 * @layer app
 * @segment settings
 * @what アカウント設定ページ - アカウント情報の表示（Issue #176）
 */

import { AccountInfoCard } from '@/features/settings';

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">アカウント</h2>
      <AccountInfoCard />
    </div>
  );
}
