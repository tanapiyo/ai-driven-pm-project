/**
 * @layer app
 * @segment settings
 * @what 外観設定ページ - テーマ切り替えを含む外観設定
 */
import { ThemeSettingsSection } from '@/features/settings';

export default function AppearanceSettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 text-neutral-900 dark:text-neutral-100">外観</h2>
      <ThemeSettingsSection />
    </div>
  );
}
