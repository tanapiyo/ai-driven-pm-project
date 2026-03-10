/**
 * @layer features
 * @segment theme-toggle
 * @what テーマ切り替え機能 - public API
 *
 * features は app, widgets からのみ import される
 * 外部からは index.ts 経由でのみアクセスされる
 */

// UI
export { ThemeToggle } from './ui/ThemeToggle';

// Model (hooks)
export { useTheme } from './model/use-theme';

// Types
export type { Theme, ResolvedTheme, ThemeContextValue } from './model/types';
