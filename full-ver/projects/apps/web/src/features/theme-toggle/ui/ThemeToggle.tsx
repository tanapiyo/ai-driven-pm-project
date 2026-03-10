'use client';

/**
 * @layer features
 * @segment theme-toggle
 * @what テーマ切り替えコンポーネント - ライト/ダーク/システムモードの切り替え UI
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../model/use-theme';
import type { Theme } from '../model/types';

interface ThemeToggleProps {
  className?: string;
}

const themeOptions: { mode: Theme; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'ライトモード' },
  { mode: 'dark', icon: Moon, label: 'ダークモード' },
  { mode: 'system', icon: Monitor, label: 'システム設定' },
];

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex gap-1 p-1 border border-neutral-200 dark:border-neutral-700 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 dark:bg-neutral-800 ${className}`}
      role="group"
      aria-label="テーマ切替"
    >
      {themeOptions.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => setTheme(mode)}
          className={`px-2 py-1.5 rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
            theme === mode
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-white dark:hover:bg-neutral-700'
          }`}
          title={label}
          aria-pressed={theme === mode}
        >
          <Icon className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
