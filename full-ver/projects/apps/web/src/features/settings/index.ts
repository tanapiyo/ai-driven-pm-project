/**
 * @layer features
 * @segment settings
 * @what 設定機能 - public API
 *
 * features は app, widgets からのみ import される
 * 外部からは index.ts 経由でのみアクセスされる
 */

// UI
export {
  SettingsNav,
  SettingsLayout,
  ThemeSettingsSection,
  RoleBadge,
  AccountInfoCard,
  PasswordChangeDialog,
} from './ui';

// Types
export type { SettingsSection, SettingsNavItem } from './model/types';
export { SETTINGS_NAV_ITEMS } from './model/types';
