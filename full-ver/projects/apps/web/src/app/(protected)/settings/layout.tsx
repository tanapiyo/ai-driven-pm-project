/**
 * @layer app
 * @segment settings
 * @what 設定ページのレイアウト
 */
import { SettingsLayout } from '@/features/settings';

export default function SettingsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-neutral-900 dark:text-neutral-100">設定</h1>
      <SettingsLayout>{children}</SettingsLayout>
    </div>
  );
}
