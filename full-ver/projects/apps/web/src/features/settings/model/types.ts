/**
 * @layer features
 * @segment settings
 * @what 設定機能の型定義
 */

import { dictionary } from '@/shared/lib';

const settingsNav = dictionary.settings.nav;

/**
 * Settings navigation section identifier
 */
export type SettingsSection = 'account' | 'appearance';

/**
 * Settings navigation item
 */
export interface SettingsNavItem {
  id: SettingsSection;
  label: string;
  path: string;
}

/**
 * Available settings sections
 */
export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: 'account', label: settingsNav.account, path: '/settings/account' },
  { id: 'appearance', label: settingsNav.appearance, path: '/settings/appearance' },
];
