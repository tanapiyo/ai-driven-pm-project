/**
 * @layer features
 * @segment settings
 * @what テーマ設定セクション - ライト/ダーク/システムモードの選択UI
 */
'use client';

import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn, dictionary } from '@/shared/lib';
import { useTheme, type Theme } from '@/features/theme-toggle';

const themeDict = dictionary.settings.theme;

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: 'light',
    label: themeDict.options.light.label,
    description: themeDict.options.light.description,
    icon: Sun,
  },
  {
    value: 'dark',
    label: themeDict.options.dark.label,
    description: themeDict.options.dark.description,
    icon: Moon,
  },
  {
    value: 'system',
    label: themeDict.options.system.label,
    description: themeDict.options.system.description,
    icon: Monitor,
  },
];

export function ThemeSettingsSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section aria-labelledby="theme-settings-heading">
      <h3
        id="theme-settings-heading"
        className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100"
      >
        {themeDict.heading}
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{themeDict.description}</p>
      <fieldset className="space-y-3">
        <legend className="sr-only">{themeDict.legend}</legend>
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500',
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={isSelected}
                onChange={() => setTheme(option.value)}
                className="sr-only"
              />
              <Icon
                className={cn(
                  'w-6 h-6',
                  isSelected
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                )}
              />
              <div className="flex-1">
                <span className="block font-medium text-neutral-900 dark:text-neutral-100">
                  {option.label}
                </span>
                <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                  {option.description}
                </span>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
