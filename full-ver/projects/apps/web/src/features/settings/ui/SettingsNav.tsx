/**
 * @layer features
 * @segment settings
 * @what 設定ページの左サイドナビゲーション
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Palette } from 'lucide-react';
import { cn } from '@/shared/lib';
import { SETTINGS_NAV_ITEMS, type SettingsSection } from '../model/types';

const SECTION_ICONS: Record<SettingsSection, React.ComponentType<{ className?: string }>> = {
  account: User,
  appearance: Palette,
};

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-[200px] flex-shrink-0" aria-label="Settings navigation">
      <ul className="space-y-1" role="list">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const Icon = SECTION_ICONS[item.id];
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <li key={item.id}>
              <Link
                href={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
