/**
 * @layer features
 * @segment theme-toggle
 * @what テーマコンテキストを消費するカスタムフック
 */

import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/shared/providers';

/**
 * テーマの状態と切り替え関数を取得する
 *
 * @returns { theme, resolvedTheme, setTheme }
 * @throws ThemeProvider 外で使用した場合はエラー
 *
 * @example
 * const { theme, resolvedTheme, setTheme } = useTheme();
 * setTheme('dark'); // ダークモードに切り替え
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
